export interface GithubRepository {
  owner: string;
  name: string;
}

export function parseGithubRepository(remoteUrl: string): GithubRepository | undefined {
  const trimmed = remoteUrl.trim();
  const httpsRepository = parseHttpsGithubRepository(trimmed);
  if (httpsRepository) {
    return httpsRepository;
  }

  const patterns = [
    /^git@([^:]+):([^/]+)\/(.+)$/,
    /^ssh:\/\/git@([^/]+)\/([^/]+)\/(.+)$/
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && isGithubHost(match[1])) {
      const repositoryName = normalizeGithubRepositoryName(match[3]);
      if (!repositoryName || repositoryName.includes('/')) {
        return undefined;
      }

      return {
        owner: match[2],
        name: repositoryName
      };
    }
  }

  return undefined;
}

export function encodeRef(ref: string): string {
  return ref.split('/').map(encodeURIComponent).join('/');
}

function normalizeGithubRepositoryName(repositoryName: string): string {
  return repositoryName.replace(/\/+$/, '').replace(/\.git$/, '');
}

function isGithubHost(host: string): boolean {
  return host === 'github.com' || host.startsWith('github.com-');
}

function parseHttpsGithubRepository(remoteUrl: string): GithubRepository | undefined {
  let url: URL;
  try {
    url = new URL(remoteUrl);
  } catch {
    return undefined;
  }

  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || !isGithubHost(url.hostname)) {
    return undefined;
  }

  const [owner, ...repositoryParts] = url.pathname.replace(/^\/+/, '').split('/');
  const repositoryName = normalizeGithubRepositoryName(repositoryParts.join('/'));

  if (!owner || !repositoryName || repositoryName.includes('/')) {
    return undefined;
  }

  return {
    owner,
    name: repositoryName
  };
}

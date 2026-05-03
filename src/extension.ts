import * as cp from 'node:child_process';
import * as path from 'node:path';
import { promisify } from 'node:util';
import * as vscode from 'vscode';
import { encodeRef, parseGithubRepository } from './githubUrl';

const execFile = promisify(cp.execFile);

export function activate(context: vscode.ExtensionContext): void {
  const copyDisposable = vscode.commands.registerCommand('copyGithubUrl.copy', async (resource?: vscode.Uri) => {
    try {
      const githubUrl = await buildGithubUrlFromResource(resource);
      await vscode.env.clipboard.writeText(githubUrl);
      vscode.window.showInformationMessage(`Copy GitHub URL: ${githubUrl}`);
    } catch (error) {
      vscode.window.showWarningMessage(`Copy GitHub URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  const previewDisposable = vscode.commands.registerCommand('copyGithubUrl.preview', async (resource?: vscode.Uri) => {
    try {
      const githubUrl = await buildGithubUrlFromResource(resource);
      await vscode.env.openExternal(vscode.Uri.parse(githubUrl));
    } catch (error) {
      vscode.window.showWarningMessage(`Preview GitHub URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  context.subscriptions.push(copyDisposable, previewDisposable);
}

export function deactivate(): void {
  // No cleanup required.
}

function getTargetFileUri(resource?: vscode.Uri): vscode.Uri | undefined {
  if (resource?.scheme === 'file') {
    return resource;
  }

  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor?.document.uri.scheme === 'file') {
    return activeEditor.document.uri;
  }

  return undefined;
}

async function buildGithubUrlFromResource(resource?: vscode.Uri): Promise<string> {
  const fileUri = getTargetFileUri(resource);
  if (!fileUri) {
    throw new Error('ファイルを選択してください。');
  }

  return buildGithubUrl(fileUri.fsPath);
}

async function buildGithubUrl(filePath: string): Promise<string> {
  const workingDirectory = path.dirname(filePath);
  const repositoryRoot = await git(workingDirectory, ['rev-parse', '--show-toplevel']);
  const remoteUrl = await getRemoteUrl(repositoryRoot);
  const repository = parseGithubRepository(remoteUrl);

  if (!repository) {
    throw new Error('GitHubリポジトリのremote URLが見つかりません。');
  }

  const ref = await getCurrentRef(repositoryRoot);
  const relativePath = path.relative(repositoryRoot, filePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('選択されたファイルはGitリポジトリ内にありません。');
  }

  const githubPath = relativePath.split(path.sep).map(encodeURIComponent).join('/');
  return `https://github.com/${repository.owner}/${repository.name}/blob/${encodeRef(ref)}/${githubPath}`;
}

async function getRemoteUrl(repositoryRoot: string): Promise<string> {
  const remotes = await git(repositoryRoot, ['remote']);
  const remoteNames = remotes.split(/\r?\n/).map((remote) => remote.trim()).filter(Boolean);

  if (remoteNames.length === 0) {
    throw new Error('Git remoteが見つかりません。');
  }

  const remoteName = remoteNames.includes('origin') ? 'origin' : remoteNames[0];
  return git(repositoryRoot, ['remote', 'get-url', remoteName]);
}

async function getCurrentRef(repositoryRoot: string): Promise<string> {
  const branch = await git(repositoryRoot, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch !== 'HEAD') {
    return branch;
  }

  return git(repositoryRoot, ['rev-parse', 'HEAD']);
}

async function git(cwd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFile('git', ['-C', cwd, ...args], {
      windowsHide: true
    });

    return stdout.trim();
  } catch (error) {
    const detail = error instanceof Error && error.message ? `: ${error.message}` : '';
    throw new Error(`Gitリポジトリ情報を取得できません${detail}`);
  }
}

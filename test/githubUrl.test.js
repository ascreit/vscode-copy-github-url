const assert = require('node:assert/strict');
const test = require('node:test');
const { encodeRef, parseGithubRepository } = require('../out/githubUrl');

test('parseGithubRepository parses https remotes', () => {
  assert.deepEqual(parseGithubRepository('https://github.com/ascreit/vscode-copy-github-url.git'), {
    owner: 'ascreit',
    name: 'vscode-copy-github-url'
  });
});

test('parseGithubRepository parses https remotes with trailing slash', () => {
  assert.deepEqual(parseGithubRepository('https://github.com/ascreit/vscode-copy-github-url.git/'), {
    owner: 'ascreit',
    name: 'vscode-copy-github-url'
  });
});

test('parseGithubRepository parses ssh remotes', () => {
  assert.deepEqual(parseGithubRepository('git@github.com:ascreit/vscode-copy-github-url.git'), {
    owner: 'ascreit',
    name: 'vscode-copy-github-url'
  });
});

test('parseGithubRepository parses ssh host aliases for github.com', () => {
  assert.deepEqual(parseGithubRepository('git@github.com-kamei002:ascreit/vscode-copy-github-url.git'), {
    owner: 'ascreit',
    name: 'vscode-copy-github-url'
  });
});

test('parseGithubRepository rejects non-GitHub remotes', () => {
  assert.equal(parseGithubRepository('git@example.com:ascreit/vscode-copy-github-url.git'), undefined);
});

test('encodeRef keeps branch path separators', () => {
  assert.equal(encodeRef('feature/copy url'), 'feature/copy%20url');
});

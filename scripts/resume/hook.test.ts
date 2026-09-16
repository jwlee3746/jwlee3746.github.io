import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { projectRoot } from '../build-resume-html.ts';

async function repository(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await mkdtemp(join(tmpdir(), 'resume-hook-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git('init');
  git('config', 'user.name', 'Resume Test');
  git('config', 'user.email', 'test@example.com');
  git('config', 'core.hooksPath', '/dev/null');
  await mkdir(join(root, 'data/portfolio/projects'), { recursive: true });
  await mkdir(join(root, 'bin'));
  await writeFile(join(root, 'data/portfolio/projects/example.json'), '{}\n');
  await writeFile(join(root, 'jaewon-lee-resume.pdf'), 'original pdf');
  await writeFile(join(root, 'README.md'), 'original readme');
  git('add', '.');
  git('commit', '-m', 'fixture');
  // Stub only the expensive PDF command: assertions exercise the actual Git hook.
  const node = join(root, 'bin/node');
  await writeFile(node, '#!/bin/sh\nprintf generated > jaewon-lee-resume.pdf\n');
  await chmod(node, 0o755);
  const run = () => spawnSync('bash', [join(projectRoot, 'scripts/resume-pre-commit.sh')], {
    cwd: root, encoding: 'utf8', env: { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}` },
  });
  return { root, git, run };
}

test('hook stages the PDF without committing generated HTML when a project is staged', async t => {
  const { root, git, run } = await repository(t);
  await writeFile(join(root, 'data/portfolio/projects/example.json'), '{"title":"new"}\n');
  git('add', 'data/portfolio/projects/example.json');
  assert.equal(run().status, 0);
  assert(!git('diff', '--cached', '--name-only').includes('index.html'));
  assert.equal(git('show', ':jaewon-lee-resume.pdf'), 'generated');
});

test('hook rejects partially staged data instead of publishing unstaged text', async t => {
  const { root, git, run } = await repository(t);
  await writeFile(join(root, 'data/portfolio/projects/example.json'), '{"title":"staged"}\n');
  git('add', 'data/portfolio/projects/example.json');
  await writeFile(join(root, 'data/portfolio/projects/example.json'), '{"title":"unstaged"}\n');
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /스테이징하지 않은/);
  assert.equal(git('show', ':jaewon-lee-resume.pdf'), 'original pdf');
});

test('hook rejects untracked projects when rebuilding', async t => {
  const { root, git, run } = await repository(t);
  await writeFile(join(root, 'data/portfolio/projects/example.json'), '{"title":"staged"}\n');
  git('add', 'data/portfolio/projects/example.json');
  await writeFile(join(root, 'data/portfolio/projects/untracked.json'), '{}');
  assert.equal(run().status, 1);
  assert.equal(await readFile(join(root, 'jaewon-lee-resume.pdf'), 'utf8'), 'original pdf');
});

test('unrelated commits do not rebuild resume artifacts', async t => {
  const { root, git, run } = await repository(t);
  await writeFile(join(root, 'README.md'), 'updated');
  git('add', 'README.md');
  assert.equal(run().status, 0);
  assert.equal(git('show', ':jaewon-lee-resume.pdf'), 'original pdf');
});

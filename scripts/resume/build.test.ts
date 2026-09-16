import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildResume, projectRoot } from '../build-resume-html.ts';
import { loadResume } from './data.ts';

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await mkdtemp(join(tmpdir(), 'resume-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'resume'));
  for (const folder of ['site', 'profile', 'portfolio']) {
    await cp(join(projectRoot, 'data', folder), join(root, 'data', folder), { recursive: true });
  }
  return root;
}
async function project(root: string) {
  const files = (await loadResume(root)).projects;
  const value = files[0];
  const { id, ...data } = value;
  return data;
}
async function save(root: string, file: string, value: unknown) {
  await writeFile(join(root, file), JSON.stringify(value));
}

test('adding and deleting a project file updates HTML without a registry edit', async t => {
  const root = await fixture(t);
  const original = await loadResume(root);
  const added = { ...await project(root), title: '새 프로젝트 자동 추가', order: 0 };
  await save(root, 'data/portfolio/projects/new-project.json', added);
  const result = await loadResume(root);
  assert.equal(result.projects.length, original.projects.length + 1);
  assert.equal(result.projects[0].id, 'new-project');
  assert.match(await buildResume(root), /새 프로젝트 자동 추가/);
  await rm(join(root, 'data/portfolio/projects/new-project.json'));
  assert.doesNotMatch(await buildResume(root), /새 프로젝트 자동 추가/);
});

test('text is escaped, optional links work, and hidden projects are omitted', async t => {
  const root = await fixture(t);
  const added = { ...await project(root), url: undefined, title: '<script>"&\'</script>', visible: true };
  await save(root, 'data/portfolio/projects/escaping.json', added);
  const html = await buildResume(root);
  assert.match(html, /&lt;script&gt;&quot;&amp;&#39;&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  await save(root, 'data/portfolio/projects/escaping.json', { ...added, visible: false });
  assert.doesNotMatch(await buildResume(root), /&lt;script&gt;/);
});

test('history is newest first regardless of file order; ongoing work comes first', async t => {
  const root = await fixture(t);
  await save(root, 'data/portfolio/experience.json', [
    { title: '과거 경력', start: '2020-01', end: '2021-01' },
    { title: '현재 경력', start: '2024-01', end: null },
    { title: '최근 경력', start: '2022-01', end: '2023-01' },
  ]);
  await save(root, 'data/portfolio/education.json', []);
  assert.deepEqual((await loadResume(root)).history.map(entry => entry.title), ['현재 경력', '최근 경력', '과거 경력']);
});

test('same-order projects use filenames as a stable tiebreaker', async t => {
  const root = await fixture(t);
  const added = { ...await project(root), order: 0 };
  await save(root, 'data/portfolio/projects/zzz-project.json', added);
  await save(root, 'data/portfolio/projects/aaa-project.json', added);
  assert.deepEqual((await loadResume(root)).projects.slice(0, 2).map(value => value.id), ['aaa-project', 'zzz-project']);
  assert.equal(await buildResume(root), await buildResume(root));
});

for (const [name, change] of Object.entries({
  'missing title': { title: undefined },
  'misspelled field': { titel: '오타' },
  'unknown group': { group: 'unknown' },
  'unsafe URL': { url: 'javascript:alert(1)' },
  'invalid month': { start: '2024-13' },
  'reversed period': { start: '2025-01', end: '2024-01' },
})) {
  test(`rejects ${name} with the source path and preserves the previous HTML`, async t => {
    const root = await fixture(t);
    const before = await buildResume(root);
    await save(root, 'data/portfolio/projects/invalid.json', { ...await project(root), ...change });
    await assert.rejects(buildResume(root), /data\/portfolio\/projects\/invalid.json/);
    assert.equal(await readFile(join(root, '_site/resume/index.html'), 'utf8'), before);
  });
}

test('malformed JSON and duplicate group IDs fail visibly', async t => {
  const root = await fixture(t);
  const config = (await loadResume(root)).sections;
  await save(root, 'data/portfolio/resume.json', { ...config, groups: [...config.groups, config.groups[0]] });
  await assert.rejects(loadResume(root), /id가 중복/);
  await writeFile(join(root, 'data/portfolio/resume.json'), '{bad json');
  await assert.rejects(loadResume(root), /data\/portfolio\/resume.json/);
});

test('empty project groups produce no empty headings', async t => {
  const root = await fixture(t);
  await rm(join(root, 'data/portfolio/projects'), { recursive: true });
  const html = await buildResume(root);
  assert.doesNotMatch(html, /class="project-group"|class="projects-heading"/);
});

test('check mode detects stale output without overwriting it', async t => {
  const root = await fixture(t);
  await buildResume(root);
  await buildResume(root, true);
  await writeFile(join(root, '_site/resume/index.html'), 'stale');
  await assert.rejects(buildResume(root, true), /npm run build:resume/);
  assert.equal(await readFile(join(root, '_site/resume/index.html'), 'utf8'), 'stale');
});

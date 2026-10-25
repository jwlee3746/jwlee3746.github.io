import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { buildResume, projectRoot } from '../build-resume-html.ts';
import { loadResume } from './data.ts';

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await mkdtemp(join(tmpdir(), 'resume-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(projectRoot, 'data/resume'), join(root, 'data/resume'), { recursive: true });
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
  await save(root, 'data/resume/projects/new-project.json', added);
  const result = await loadResume(root);
  assert.equal(result.projects.length, original.projects.length + 1);
  assert.equal(result.projects[0].id, 'new-project');
  assert.match(await buildResume(root), /새 프로젝트 자동 추가/);
  await rm(join(root, 'data/resume/projects/new-project.json'));
  assert.doesNotMatch(await buildResume(root), /새 프로젝트 자동 추가/);
});

test('text is escaped, optional links work, and hidden projects are omitted', async t => {
  const root = await fixture(t);
  const added = { ...await project(root), url: undefined, title: '<script>"&\'</script>', visible: true };
  await save(root, 'data/resume/projects/escaping.json', added);
  const html = await buildResume(root);
  assert.match(html, /&lt;script&gt;&quot;&amp;&#39;&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  await save(root, 'data/resume/projects/escaping.json', { ...added, visible: false });
  assert.doesNotMatch(await buildResume(root), /&lt;script&gt;/);
});

test('history is newest first regardless of file order; ongoing work comes first', async t => {
  const root = await fixture(t);
  await save(root, 'data/resume/experience.json', [
    { title: '과거 경력', start: '2020-01', end: '2021-01' },
    { title: '현재 경력', start: '2024-01', end: null },
    { title: '최근 경력', start: '2022-01', end: '2023-01' },
  ]);
  await save(root, 'data/resume/education.json', []);
  assert.deepEqual((await loadResume(root)).history.map(entry => entry.title), ['현재 경력', '최근 경력', '과거 경력']);
});

test('unlabelled nested points escape content and preserve optional legacy labels', async t => {
  const root = await fixture(t);
  await save(root, 'data/resume/projects/nested-points.json', {
    ...await project(root), title: '계층형 프로젝트', order: 0,
    points: [
      { text: '핵심 기여 <script>parent</script>', children: ['구현 근거 <script>child</script>'] },
      { label: '기존 <label>', text: '선택적 라벨 지원' },
    ],
  });
  const html = await buildResume(root);
  const { document } = parseHTML(html);
  const first = document.querySelector('.project')!;
  const parent = first.querySelector('.project-points > li')!;
  assert.equal(parent.querySelector('.bullet-label'), null);
  assert.equal(parent.querySelector('ul > li')!.textContent, '구현 근거 <script>child</script>');
  assert.equal(first.querySelector('.bullet-label')!.textContent, '기존 <label>');
  assert.equal(first.querySelector('script'), null);
  await save(root, 'data/resume/projects/nested-points.json', {
    ...await project(root), points: [{ text: '부모', children: [42] }],
  });
  await assert.rejects(loadResume(root), /data\/resume\/projects\/nested-points.json/);
});

test('year highlights share one employment entry, retain order, and escape text', async t => {
  const root = await fixture(t);
  await save(root, 'data/resume/experience.json', [{
    title: '삼성전자 경력', start: '2024-07', end: null, points: ['기존 단순 목록'],
    highlights: [
      { title: '2026 · 현재 업무', points: ['실행 구조 <script>current</script>'] },
      { title: '2024–2025 · 이전 업무', points: ['평가·품질 대응'] },
    ],
  }]);
  const { document } = parseHTML(await buildResume(root));
  assert.deepEqual([...document.querySelectorAll('.history-period-title')].map(el => el.textContent), [
    '2026 · 현재 업무', '2024–2025 · 이전 업무',
  ]);
  assert.equal([...document.querySelectorAll('.what')].filter(el => el.textContent === '삼성전자 경력').length, 1);
  const period = document.querySelector('.history-period')!;
  assert.equal(period.querySelector('li')!.textContent, '실행 구조 <script>current</script>');
  assert.equal(period.querySelector('script'), null);
  assert.ok(document.body.textContent?.includes('기존 단순 목록'));
});

test('same-order projects use filenames as a stable tiebreaker', async t => {
  const root = await fixture(t);
  const added = { ...await project(root), order: 0 };
  await save(root, 'data/resume/projects/zzz-project.json', added);
  await save(root, 'data/resume/projects/aaa-project.json', added);
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
    await save(root, 'data/resume/projects/invalid.json', { ...await project(root), ...change });
    await assert.rejects(buildResume(root), /data\/resume\/projects\/invalid.json/);
    assert.equal(await readFile(join(root, '_site/resume/index.html'), 'utf8'), before);
  });
}

test('malformed JSON and duplicate group IDs fail visibly', async t => {
  const root = await fixture(t);
  const config = (await loadResume(root)).sections;
  await save(root, 'data/resume/sections.json', { ...config, groups: [...config.groups, config.groups[0]] });
  await assert.rejects(loadResume(root), /id가 중복/);
  await writeFile(join(root, 'data/resume/sections.json'), '{bad json');
  await assert.rejects(loadResume(root), /data\/resume\/sections.json/);
});

test('empty project groups produce no empty headings', async t => {
  const root = await fixture(t);
  await rm(join(root, 'data/resume/projects'), { recursive: true });
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

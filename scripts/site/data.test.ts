import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadPortfolio, projectRoot, href } from './data.ts';
import { renderContent } from '../../templates/portfolio/sections/content.ts';
import { renderSidebar } from '../../templates/portfolio/sections/navigation.ts';

test('portfolio content is escaped while intentional emphasis is rendered', async () => {
  const { portfolio, site, profile } = await loadPortfolio();
  portfolio.projects[0].title = '<script>alert("x")</script>';
  portfolio.about = [{ strong: '<b>데이터</b>' }, ' & 설명'];
  const html = renderContent(portfolio);
  assert(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'));
  assert(html.includes('<strong>&lt;b&gt;데이터&lt;/b&gt;</strong> &amp; 설명'));
  profile.name = '" onclick="alert(1)';
  assert(!renderSidebar(site, profile).includes('onclick=' + '"alert'));
});

test('data changes appear on the next render and errors name the source', async t => {
  const root = await mkdtemp(join(tmpdir(), 'portfolio-data-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(projectRoot, 'data'), join(root, 'data'), { recursive: true });
  const path = join(root, 'data/portfolio/homepage.json');
  const data = JSON.parse(await readFile(path, 'utf8'));
  data.projects[0].title = '변경된 프로젝트';
  await writeFile(path, JSON.stringify(data));
  assert(renderContent((await loadPortfolio(root)).portfolio).includes('변경된 프로젝트'));
  data.projects[0].links[0].href = 'javascript:alert(1)';
  await writeFile(path, JSON.stringify(data));
  await assert.rejects(loadPortfolio(root), /data\/portfolio\/homepage.json/);
});

test('navigation accepts site anchors and external links but rejects executable URLs', () => {
  for (const url of ['/#about', '#about', '/resume/', 'https://example.com', 'mailto:me@example.com']) assert(href.safeParse(url).success);
  for (const url of ['javascript:alert(1)', 'data:text/html,x', '//example.com', '/\\example.com']) assert(!href.safeParse(url).success);
});

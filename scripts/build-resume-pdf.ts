import { spawnSync } from 'node:child_process';
import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { buildResume, projectRoot } from './build-resume-html.ts';

// Use the same installed Chrome/Chromium as the previous shell builder.
const chrome = process.env.CHROME_PATH || ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']
  .map(name => spawnSync('which', [name], { encoding: 'utf8' }).stdout?.trim())
  .find(Boolean);
if (!chrome) throw new Error('Chrome/Chromium을 설치하거나 CHROME_PATH를 지정하세요.');

const html = await buildResume();
const css = await readFile(resolve(projectRoot, 'ui/resume/resume.css'));
const icon = await readFile(resolve(projectRoot, 'public/favicon.svg'));
const assets = new Map([
  ['/resume/', { type: 'text/html; charset=utf-8', body: Buffer.from(html) }],
  ['/theme/resume/resume.css', { type: 'text/css; charset=utf-8', body: css }],
  ['/favicon.svg', { type: 'image/svg+xml', body: icon }],
]);
const server = createServer((request, response) => {
  const asset = assets.get(request.url ?? '');
  response.writeHead(asset ? 200 : 404, { 'Content-Type': asset?.type ?? 'text/plain' });
  response.end(asset?.body ?? 'Not found');
});
const temporary = resolve(projectRoot, `.resume-${process.pid}.pdf`);
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('로컬 서버 포트를 확인할 수 없습니다.');
  browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${address.port}/resume/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
  const raw = pdf.toString('latin1');
  const pages = [...raw.matchAll(/\/Type\s*\/Page\b/g)].length;
  const fonts = [...raw.matchAll(/\/BaseFont\s*\/[A-Z]{6}\+([A-Za-z0-9-]+)/g)].map(match => match[1]);
  if (!fonts.some(font => font.startsWith('IBMPlex'))) {
    throw new Error('IBM Plex 폰트가 적용되지 않았습니다. 폰트 네트워크 접근을 확인하세요.');
  }
  if (pdf.length < 50_000 || pages < 1 || pages > 3) {
    throw new Error(`PDF 검증 실패: ${pages}페이지, ${pdf.length}B (허용 범위: 1~3페이지)`);
  }
  await writeFile(temporary, pdf);
  await rename(temporary, resolve(projectRoot, 'jaewon-lee-resume.pdf'));
  console.log(`생성 완료: jaewon-lee-resume.pdf (${pages}페이지, ${pdf.length.toLocaleString()}B)`);
} finally {
  try {
    await browser?.close();
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(temporary, { force: true });
  }
}

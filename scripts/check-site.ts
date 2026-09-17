import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { projectRoot } from './site/data.ts';
import { parseHTML } from 'linkedom';
import { createHash } from 'node:crypto';

const output = resolve(projectRoot, '_site');
async function files(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? files(resolve(dir, entry.name)) : [relative(output, resolve(dir, entry.name))]))).flat();
}
const built = await files(output);
for (const required of ['theme.css', 'index.html', '404.html', 'resume/index.html', 'resume/jaewon-lee-resume.pdf', 'favicon.svg', '.nojekyll', 'google037c167c6e0294fa.html', 'posts/leetcode-1208/index.html', 'posts/index.html', 'categories/index.html', 'tags/index.html']) {
  assert(built.includes(required), `필수 산출물 누락: ${required}`);
}
for (const file of built) {
  assert(!/\.(?:ts|json|md)$/.test(file) && !file.endsWith('.gitignore'), `소스가 배포 산출물에 포함됨: ${file}`);
  assert(!/^(?:ui|scripts|public|data\/posts)\//.test(file), `소스 디렉터리가 배포됨: ${file}`);
}
for (const route of built.filter(file => file.endsWith('.html'))) {
  const html = await readFile(resolve(output, route), 'utf8');
  if (route.startsWith('google')) continue;
  assert(html.includes('<html') && html.includes('<body'), `문서가 비어 있음: ${route}`);
  assert(!/og:image|twitter:image/.test(html), `삭제한 OG 이미지 메타데이터가 복원됨: ${route}`);
  const { document } = parseHTML(html);
  // Resource URLs can include a content hash; verify both the file and version.
  for (const element of document.querySelectorAll('link[href], script[src], img[src]')) {
    const href = element.getAttribute('href') ?? element.getAttribute('src');
    if (!href?.startsWith('/') || href.startsWith('//')) continue;
    const url = new URL(href, 'https://jwlee3746.github.io');
    const path = decodeURIComponent(url.pathname).slice(1);
    assert(built.includes(path), `${route}: 리소스 누락 ${href}`);
    if (!route.startsWith('resume/') && /\.(css|js)$/.test(path)) {
      const version = createHash('sha256').update(await readFile(resolve(output, path))).digest('hex').slice(0, 12);
      assert.equal(url.searchParams.get('v'), version, `${route}: CSS/JS 캐시 버전 불일치 ${href}`);
    }
  }
  // Home and posts only expose current URLs, including links in article bodies.
  const selector = route.startsWith('resume/') ? '.site-nav a' : 'a[href], form[action]';
  for (const element of document.querySelectorAll(selector)) {
    const href = element.getAttribute('href') ?? element.getAttribute('action');
    if (!href || !/^(?:\/(?!\/)|#)/.test(href)) continue;
    const url = new URL(href, `https://jwlee3746.github.io/${route}`);
    assert(!url.pathname.startsWith('/blog/'), `${route}: 이전 블로그 주소가 화면에 노출됨 ${href}`);
    const path = decodeURIComponent(url.pathname).replace(/^\//, '');
    const target = !path || path.endsWith('/') ? `${path}index.html` : path;
    assert(built.includes(target), `${route}: 링크 대상 누락 ${href}`);
    if (url.hash && target.endsWith('.html')) {
      const targetHtml = target === route ? html : await readFile(resolve(output, target), 'utf8');
      assert(parseHTML(targetHtml).document.getElementById(decodeURIComponent(url.hash.slice(1))), `${route}: 앵커 누락 ${href}`);
    }
  }
  if (route.startsWith('blog/')) {
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
    assert(canonical, `${route}: 이동 페이지 canonical 누락`);
    const path = decodeURIComponent(new URL(canonical).pathname).slice(1);
    assert(!path.startsWith('blog/') && built.includes(`${path}index.html`), `${route}: 이동 대상 누락 ${canonical}`);
  }
}
// The user-facing configuration is published as-is, without generated CSS.
assert.equal(await readFile(resolve(output, 'theme.css'), 'utf8'), await readFile(resolve(projectRoot, 'theme.css'), 'utf8'));
assert.equal(await readFile(resolve(output, 'google037c167c6e0294fa.html'), 'utf8'), await readFile(resolve(projectRoot, 'public/google037c167c6e0294fa.html'), 'utf8'));
console.log(`사이트 검증 통과: ${built.length}개 산출물, 기존 URL·리소스·소스 제외 확인`);

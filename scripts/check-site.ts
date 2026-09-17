import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { projectRoot } from './site/data.ts';

const output = resolve(projectRoot, '_site');
async function files(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? files(resolve(dir, entry.name)) : [relative(output, resolve(dir, entry.name))]))).flat();
}
const built = await files(output);
for (const required of ['theme.css', 'index.html', '404.html', 'resume/index.html', 'resume/jaewon-lee-resume.pdf', 'favicon.svg', '.nojekyll', 'google037c167c6e0294fa.html', 'blog/Algorithm/1208/index.html', 'blog/posts/index.html']) {
  assert(built.includes(required), `필수 산출물 누락: ${required}`);
}
for (const file of built) {
  assert(!/\.(?:ts|json|md)$/.test(file) && !file.endsWith('.gitignore'), `소스가 배포 산출물에 포함됨: ${file}`);
  assert(!/^(?:ui|scripts|public|data\/posts)\//.test(file), `소스 디렉터리가 배포됨: ${file}`);
}
for (const route of ['index.html', 'resume/index.html', '404.html', 'blog/posts/index.html', 'blog/Algorithm/1208/index.html']) {
  const html = await readFile(resolve(output, route), 'utf8');
  assert(html.includes('<html') && html.includes('<body'), `문서가 비어 있음: ${route}`);
  assert(!/og:image|twitter:image/.test(html), `삭제한 OG 이미지 메타데이터가 복원됨: ${route}`);
  // /blog/ links are still provided by the separate blog repo. Verify only
  // generated local resources and the existing resume download.
  for (const [, url] of html.matchAll(/(?:src|href)="(\/(?:theme|data\/images|resume)\/[^"#?]*|\/theme\.css|\/favicon\.svg)"/g)) {
    const path = url.endsWith('/') ? `${url}index.html` : url;
    assert(built.includes(path.slice(1)), `${route}: 리소스 누락 ${url}`);
  }
}
// The user-facing configuration is published as-is, without generated CSS.
assert.equal(await readFile(resolve(output, 'theme.css'), 'utf8'), await readFile(resolve(projectRoot, 'theme.css'), 'utf8'));
assert.equal(await readFile(resolve(output, 'google037c167c6e0294fa.html'), 'utf8'), await readFile(resolve(projectRoot, 'public/google037c167c6e0294fa.html'), 'utf8'));
console.log(`사이트 검증 통과: ${built.length}개 산출물, 기존 URL·리소스·소스 제외 확인`);

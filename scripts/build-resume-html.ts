import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadResume } from './resume/data.ts';
import { renderResume } from '../theme/resume/layout.ts';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export async function buildResume(root = projectRoot, check = false): Promise<string> {
  // Validate and render completely before touching the last successful build.
  const html = renderResume(await loadResume(root));
  const output = resolve(root, 'resume/index.html');
  if (check) {
    if (await readFile(output, 'utf8') !== html) {
      throw new Error('resume/index.html이 원본과 다릅니다. npm run build:resume을 실행하세요.');
    }
  } else {
    await writeFile(output, html);
  }
  return html;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check')) {
    console.error('사용법: node scripts/build-resume-html.ts [--check]');
    process.exitCode = 1;
  } else {
    try {
      await buildResume(projectRoot, args.includes('--check'));
      console.log(args.includes('--check') ? '이력서 HTML 동기화 확인 완료' : '생성 완료: resume/index.html');
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  }
}

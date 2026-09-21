import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { containsPrivateIdentifier } from './site/private-identifiers.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const registered: unknown = JSON.parse(await readFile(resolve(root, 'scripts/site/private-identifier-fingerprints.json'), 'utf8'));
assert(Array.isArray(registered) && registered.length > 0 && registered.every(value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)), '식별자 지문 목록이 유효하지 않습니다.');
const fingerprints = new Set<string>(registered);
async function files(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? files(resolve(directory, entry.name))
    : /\.(md|svg|json|html|txt)$/i.test(entry.name) ? [resolve(directory, entry.name)] : []))).flat();
}
const sources = (await Promise.all(['data', 'docs'].map(directory => files(resolve(root, directory))))).flat();
let violations = 0;
for (const [index, path] of sources.entries()) {
  const source = `${relative(root, path)}\n${await readFile(path, 'utf8')}`;
  if (containsPrivateIdentifier(source, fingerprints)) {
    // A filename itself may be confidential, so only emit an ordinal.
    console.error(`콘텐츠 파일 #${index + 1}: 원본 프로젝트 식별자가 포함되어 있습니다. 역할 중심 표현으로 바꾸세요.`);
    violations++;
  }
}
assert.equal(violations, 0, '원본 식별자 비노출 검사 실패 (원문은 로그에 출력하지 않음).');
console.log(`콘텐츠 식별자 검사 통과: ${sources.length}개 텍스트 파일. 이미지와 새 식별자는 별도 검토 필요.`);

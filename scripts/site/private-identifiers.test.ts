import assert from 'node:assert/strict';
import test from 'node:test';
import { containsPrivateIdentifier, identifierFingerprint } from './private-identifiers.ts';

// Synthetic names only; production names must never be copied into fixtures.
const fingerprints = new Set(['ExampleHiddenUnit', 'example-hidden.ts', 'exampleSecretValue', 'abcdef12'].map(identifierFingerprint));

test('blocks names in prose, code, paths, SVG metadata and commit references', () => {
  for (const source of [
    '설명: ExampleHiddenUnit', '`exampleSecretValue`',
    '[참고](src/example-hidden.ts)', '<desc>ExampleHiddenUnit</desc>',
    '<g data-name="ExampleHiddenUnit"/>', '<!-- exampleSecretValue -->',
    'commit abcdef12', 'EXAMPLEHIDDENUNIT', 'ExampleHiddenUnit.run()',
  ]) assert.equal(containsPrivateIdentifier(source, fingerprints), true);
});

test('blocks numeric HTML entities and percent-encoded links', () => {
  for (const source of ['ExampleHidden&#85;nit', 'ExampleHidden&#x55;nit', 'ExampleHidden%55nit']) {
    assert.equal(containsPrivateIdentifier(source, fingerprints), true);
  }
});

test('allows public library APIs and role descriptions without substring matches', () => {
  assert.equal(containsPrivateIdentifier('Deep Agents LangChain LangGraph createDeepAgent MemorySaver thread_id 요청 처리 계층', fingerprints), false);
  assert.equal(containsPrivateIdentifier('NotExampleHiddenUnit', fingerprints), false);
});

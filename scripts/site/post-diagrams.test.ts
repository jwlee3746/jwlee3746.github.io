import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { inlinePostDiagrams } from '../../ui/posts/diagrams.ts';

const src = '/data/images/posts/openclaw-architecture-research/agent-tool-sequence.svg';

test('inline diagrams keep accessible labels, unique IDs and local marker references', () => {
  const html = inlinePostDiagrams(`<p><img src="${src}" alt="실행 흐름"></p>`.repeat(2));
  const { document } = parseHTML(`<main>${html}</main>`);
  assert.equal(document.querySelectorAll('.post-diagram').length, 2);
  assert.equal(document.querySelector('p .post-diagram'), null);
  assert.equal(document.querySelector('img'), null);
  const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const region of document.querySelectorAll('.post-diagram')) {
    assert.equal(region.getAttribute('tabindex'), '0');
    assert.equal(region.getAttribute('aria-label'), '실행 흐름 (가로 스크롤)');
    const svg = region.querySelector('svg')!;
    for (const id of svg.getAttribute('aria-labelledby')!.split(' ')) {
      assert.ok(svg.querySelector(`[id="${id}"]`));
    }
    assert.ok(svg.querySelector('style')!.textContent!.includes(`:where(#${svg.id})`));
    const marker = svg.querySelector('marker')!.id;
    assert.ok(svg.querySelector('style')!.textContent!.includes(`url(#${marker})`));
  }
});

test('external, non-opt-in and traversal image paths remain images', () => {
  const sources = [
    'https://example.com/chart.svg',
    '/data/images/posts/openclaw-component-application/component-boundaries.svg',
    '/data/images/posts/../secret.svg',
    '/data/images/profile/avatar.jpg',
  ];
  const html = inlinePostDiagrams(sources.map(src => `<p><img src="${src}" alt="reference"></p>`).join(''));
  const { document } = parseHTML(html);
  assert.equal(document.querySelectorAll('img').length, 4);
  assert.equal(document.querySelector('svg'), null);
});

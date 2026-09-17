import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { searchText } from '../../ui/posts/search-text.ts';
import { renderPostList, type Post } from '../../ui/posts/list.ts';

const post: Post = {
  url: '/posts/example/', date: new Date('2024-01-01'),
  data: { title: '예시', category: 'Algorithm', tags: ['C++'], excerpt: '요약' },
  templateContent: '<p>본문 전용단어 &amp; back<strong>track</strong></p><pre><code>return &quot;&lt;value&gt;&quot;;</code></pre>',
};

test('search text retains inline words, separates blocks, and decodes entities', () => {
  assert.equal(searchText(post.templateContent!), '본문 전용단어 & backtrack return "<value>";');
  assert.equal(searchText('<h2>한글</h2><p>본문</p><ul><li>첫째</li><li>둘째</li></ul>'), '한글 본문 첫째 둘째');
});

test('search text excludes scripts, styles, templates, TOC and duplicate math markup', () => {
  assert.equal(searchText(`<nav class="post-toc">목차전용</nav><p>visible</p>
    <script>unwanted()</script><style>.hidden { color: red }</style><template>unused</template>
    <span class="katex"><span class="katex-mathml">duplicate</span><span class="katex-html">x + y</span></span>`), 'visible x + y');
});

test('only the searchable list includes body text and escapes it as inert attribute data', () => {
  const document = parseHTML(renderPostList([post], { searchBody: true })).document;
  const card = document.querySelector('.post-card')!;
  assert.match(card.getAttribute('data-search')!, /예시 요약 Algorithm C\+\+ 본문/);
  assert.match(card.getAttribute('data-search')!, /전용단어 & backtrack return "<value>";/);
  assert.equal(document.querySelector('value'), null);
  assert(!card.textContent.includes('전용단어'));
  const ordinary = parseHTML(renderPostList([post])).document;
  assert(!ordinary.querySelector('.post-card')!.getAttribute('data-search')!.includes('전용단어'));
  assert.doesNotThrow(() => renderPostList([{ ...post, templateContent: undefined }], { searchBody: true }));
});

// Exercise the browser script against rendered cards, including URL/history transitions.
async function searchHarness(posts: Post[], href = 'https://example.com/posts/') {
  const { readFile } = await import('node:fs/promises');
  const { runInNewContext } = await import('node:vm');
  const { document, window: dom } = parseHTML(`<html><body><form class="site-search"><input id="search-input"></form><p id="post-results"></p>${renderPostList(posts, { searchBody: true })}<div id="post-empty"><a class="post-search-reset" href="/posts/">전체 글</a></div></body></html>`);
  const listeners = new Map<string, () => void>();
  const location = { href };
  const state = { unrelated: 'preserved' };
  let writes = 0;
  const history = { state, replaceState: (next: unknown, _title: string, url: URL) => {
    assert.equal(next, state);
    location.href = String(url);
    writes++;
  } };
  runInNewContext(await readFile(new URL('../../ui/posts/search.js', import.meta.url), 'utf8'), {
    document, location, history, URL, window: { addEventListener: (event: string, fn: () => void) => listeners.set(event, fn), scrollTo: () => {} },
  });
  const input = document.querySelector('input')!;
  function type(value: string, composing = false) {
    input.value = value;
    const event = new dom.Event('input');
    Object.defineProperty(event, 'isComposing', { value: composing });
    input.dispatchEvent(event);
  }
  return { document, input, location, listeners, type, writes: () => writes, event: (name: string) => new dom.Event(name, { cancelable: true }) };
}

test('live search persists without Enter, preserves unrelated URL state and restores on history navigation', async () => {
  const h = await searchHarness([post], 'https://example.com/posts/?from=home');
  h.type('C++');
  assert.equal(new URL(h.location.href).searchParams.get('q'), 'C++');
  assert.equal(new URL(h.location.href).searchParams.get('from'), 'home');
  assert.equal(h.document.querySelector('.post-match')?.textContent, '태그: C++');
  assert(h.document.querySelector('.post-list.is-filtered'), 'matching excerpts must be fully readable');
  h.document.querySelector('form')!.dispatchEvent(h.event('submit'));
  assert.equal(h.writes(), 1, 'submitting the same query must not add another history operation');
  h.input.value = '';
  h.listeners.get('pageshow')!();
  assert.equal(h.input.value, 'C++');
  h.location.href = 'https://example.com/posts/?q=missing';
  h.listeners.get('popstate')!();
  assert.equal(h.document.querySelectorAll('.post-card:not([hidden])').length, 0);
  assert.equal(h.document.querySelector('#post-empty')!.hasAttribute('hidden'), false);
  h.document.querySelector('.post-search-reset')!.dispatchEvent(h.event('click'));
  assert.equal(h.input.value, '');
  assert.equal(new URL(h.location.href).searchParams.has('q'), false);
  assert.equal(h.document.querySelectorAll('.post-card:not([hidden])').length, 1);
});

test('search evidence explains hidden tag/body matches safely and clears when the query clears', async () => {
  const h = await searchHarness([post]);
  h.type('전용단어 C++');
  assert.equal(h.document.querySelectorAll('.post-card:not([hidden])').length, 1);
  const evidence = h.document.querySelector('.post-match')!;
  assert.match(evidence.textContent, /태그: C\+\+ · 본문:.*전용단어/);
  h.type('<value>');
  assert.match(evidence.textContent, /본문:.*<value>/);
  assert.equal(evidence.querySelector('value'), null);
  h.type('Ｃ＋＋');
  assert.equal(h.document.querySelectorAll('.post-card:not([hidden])').length, 1);
  h.type('예시');
  assert(evidence.hasAttribute('hidden'), 'a visible title match does not need duplicate evidence');
  h.type('');
  assert(evidence.hasAttribute('hidden'));
  assert.equal(h.document.querySelector('#post-results')!.textContent, '1개의 글');
  assert.equal(h.document.querySelector('.post-list.is-filtered'), null);
});

test('Korean composition commits search only once the composition ends', async () => {
  const h = await searchHarness([post]);
  h.type('예', true);
  assert.equal(h.writes(), 0);
  h.input.value = '예시';
  h.input.dispatchEvent(h.event('compositionend'));
  assert.equal(new URL(h.location.href).searchParams.get('q'), '예시');
});

test('category shortcuts use actual counts and keep selection on the destination page', async () => {
  const { renderCategoryLinks } = await import('../../ui/posts/category-links.ts');
  const { groupCategories } = await import('../../ui/posts/categories.ts');
  const categories = groupCategories([post, { ...post, url: '/posts/another/', data: { ...post.data, category: 'Machine Learning' } }]);
  const document = parseHTML(renderCategoryLinks(categories, 2, 'Machine Learning')).document;
  assert.equal(document.querySelectorAll('a').length, 3);
  assert.equal(document.querySelector('a')?.textContent, '전체 2개의 글');
  assert.equal(document.querySelector('[aria-current]')?.getAttribute('href'), '/categories/Machine%20Learning/');
});


test('an empty post collection can still search and reset without a list element', async () => {
  const h = await searchHarness([]);
  h.type('example');
  assert.equal(h.document.querySelector('#post-empty')!.hasAttribute('hidden'), false);
  h.document.querySelector('.post-search-reset')!.dispatchEvent(h.event('click'));
  assert.equal(h.document.querySelector('#post-results')!.textContent, '0개의 글');
});

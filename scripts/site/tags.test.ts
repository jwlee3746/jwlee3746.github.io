import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { parseHTML } from 'linkedom';
import { tagAnchor, tagUrl, tagPages } from '../../ui/posts/tags.ts';
import renderIndex from '../../ui/posts/tags.11ty.ts';
import renderTag from '../../ui/posts/tag.11ty.ts';
import renderPage from '../../ui/posts/layouts/page.11ty.ts';
import type { Post } from '../../ui/posts/list.ts';

const post = (slug: string, tags: string[], date = '2024-01-01'): Post => ({
  url: `/posts/${slug}/`, date: new Date(date), data: { title: slug, category: 'Project', tags },
});

test('tag routes distinguish punctuation, Unicode and case without creating nested paths', () => {
  const names = ['C++', 'C#', '한글 태그', 'a/b', 'NLP', 'nlp', '<script>'];
  assert.equal(new Set(names.map(tagUrl)).size, names.length);
  for (const name of names) {
    assert.match(tagUrl(name), /^\/tags\/tag-[A-Za-z0-9_-]+\/$/);
    assert.equal(tagUrl(name), `/tags/${tagAnchor(name)}/`);
  }
});

test('tag index counts tagged posts once and links to distinct result pages without repeated articles', () => {
  const posts = [post('first', ['NLP', 'BERT', 'NLP']), post('second', ['NLP']), post('untagged', [])];
  const document = parseHTML(renderIndex({ collections: { posts } })).document;
  assert.equal(document.querySelector('.tag-summary')?.textContent, '태그 2개 · 태그가 있는 글 2개');
  assert.equal(document.querySelectorAll('.post-card').length, 0);
  assert.equal(document.querySelectorAll('.tag-list a').length, 2);
  assert.equal(document.getElementById(tagAnchor('NLP'))?.getAttribute('href'), tagUrl('NLP'));
  assert.equal(document.getElementById(tagAnchor('NLP'))?.querySelector('.tag-count')?.textContent, '2개의 글');
  assert.match(renderIndex({ collections: { posts: [] } }), /태그가 지정된 글이 없습니다/);
  const special = parseHTML(renderIndex({ collections: { posts: [post('safe', ['<script>'])] } })).document;
  assert.equal(special.querySelector('.tag-list span')?.textContent, '<script>');
  assert.equal(special.querySelector('.tag-list script'), null);
});

test('tag results contain only matching posts in newest-first order with a route back to Tags', async () => {
  const posts = [post('old', ['NLP']), post('unrelated', ['GAN']), post('new', ['NLP'], '2025-01-01')];
  const tagGroup = tagPages(posts).find(group => group.name === 'NLP')!;
  const content = renderTag({ tagGroup });
  const document = parseHTML(await renderPage({ title: tagGroup.name, content, page: { url: tagGroup.url }, collections: { posts, categories: [] } })).document;
  assert.deepEqual([...document.querySelectorAll('main .post-card-title')].map(a => a.textContent), ['new', 'old']);
  assert.equal(document.querySelector('.tag-results-heading a')?.getAttribute('href'), '/tags/');
  assert.equal(document.querySelector('.site-breadcrumb a[href="/tags/"]')?.textContent, 'Tags');
  assert.equal(document.querySelector('#posts-sections a[href="/tags/"]')?.getAttribute('aria-current'), 'location');
  assert.equal(document.querySelector('.site-panel-tags'), null);
  assert(document.querySelector('.site-panel-list'));
});

test('old tag fragments redirect through known links, preserve queries and ignore unknown hashes', async () => {
  const { document } = parseHTML(renderIndex({ collections: { posts: [post('first', ['NLP'])] } }));
  const redirects: string[] = [];
  const listeners = new Map<string, () => void>();
  const location = { hash: `#${tagAnchor('NLP')}`, search: '?q=example', replace: (url: string) => redirects.push(url) };
  runInNewContext(await readFile(new URL('../../ui/posts/legacy-tag.js', import.meta.url), 'utf8'), {
    document, location, window: { addEventListener: (event: string, fn: () => void) => listeners.set(event, fn) },
  });
  assert.deepEqual(redirects, [`${tagUrl('NLP')}?q=example`]);
  location.hash = '#unknown';
  listeners.get('hashchange')!();
  assert.equal(redirects.length, 1);
});

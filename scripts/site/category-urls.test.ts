import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import render, { data } from '../../ui/posts/category-redirects.11ty.ts';
import type { Post } from '../../ui/posts/list.ts';
import { tagUrl } from '../../ui/posts/tags.ts';

test('legacy category routes retain published spaces and lowercase evaluation', () => {
  const paths = data.legacyCategories.map(category => data.permalink({ category }));
  assert.equal(paths.length, 12);
  assert.equal(new Set(paths).size, 12);
  assert(paths.includes('/blog/categories/Machine Learning/'));
  assert(paths.includes('/blog/categories/Computer Vision/'));
  assert(paths.includes('/blog/categories/evaluation/'));
});

test('category aliases redirect only when their target tag is available', async () => {
  for (const category of data.legacyCategories) {
    const tag = 'tag' in category ? category.tag : undefined;
    const posts: Post[] = tag ? [{ url: '/blog/example/', date: new Date('2024-01-01'), data: { title: '예시', tags: [tag] } }] : [];
    const document = parseHTML(await render({ category, collections: { posts } })).document;
    const target = tag ? tagUrl(tag) : '/blog/tags/';
    assert.equal(document.querySelector('meta[http-equiv="refresh"]')?.getAttribute('content'), `0;url=${target}`);
    assert.equal(document.querySelector('link[rel="canonical"]')?.getAttribute('href'), 'https://jwlee3746.github.io/blog/tags/');
    assert(document.querySelector(`main a[href="${target}"]`));
    if (tag) {
      const empty = parseHTML(await render({ category, collections: { posts: [] } })).document;
      assert.equal(empty.querySelector('meta[http-equiv="refresh"]'), null);
      assert(empty.querySelector('main')?.textContent.includes(`${tag} 태그의 글이 아직 없습니다.`));
      assert(empty.querySelector('main a[href="/blog/tags/"]'));
    }
  }
});

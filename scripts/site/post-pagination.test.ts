import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { renderPostPagination } from '../../ui/posts/pagination.ts';
import type { Post } from '../../ui/posts/list.ts';

const posts: Post[] = ['oldest', 'middle', 'newest'].map(name => ({
  url: `/posts/${name}/`, date: new Date('2024-05-24'), data: { title: name },
}));
const documentFor = (url: string) => parseHTML(renderPostPagination(posts, url)).document;

test('post navigation follows collection order even when dates match', () => {
  const document = documentFor('/posts/middle/');
  assert.equal(document.querySelector('[rel="prev"]')?.getAttribute('href'), '/posts/oldest/');
  assert.equal(document.querySelector('[rel="next"]')?.getAttribute('href'), '/posts/newest/');
  assert.deepEqual(posts.map(post => post.data.title), ['oldest', 'middle', 'newest']);
});

test('first and last posts only link to available neighbors without wrapping', () => {
  const first = documentFor('/posts/oldest/');
  const last = documentFor('/posts/newest/');
  assert.equal(first.querySelector('[rel="prev"]'), null);
  assert.equal(first.querySelector('[rel="next"]')?.getAttribute('href'), '/posts/middle/');
  assert.equal(last.querySelector('[rel="next"]'), null);
  assert.equal(last.querySelector('[rel="prev"]')?.getAttribute('href'), '/posts/middle/');
  assert.equal(renderPostPagination([], '/posts/missing/'), '');
  assert.equal(renderPostPagination(posts, '/posts/unported/'), '');
  assert.equal(renderPostPagination(posts.slice(0, 1), posts[0].url), '');
});

test('navigation treats post titles and URLs as text, not HTML', () => {
  const title = '<img src=x onerror=alert(1)> & "제목"';
  const url = '/posts/example/?q="quoted"&a=1';
  const document = parseHTML(renderPostPagination([posts[0], {
    ...posts[1], url, data: { title },
  }], posts[0].url)).document;
  assert.equal(document.querySelector('img'), null);
  assert.equal(document.querySelector('strong')?.textContent, title);
  assert.equal(document.querySelector('a')?.getAttribute('href'), url);
});

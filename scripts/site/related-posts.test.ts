import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { relatedPosts, renderRelatedPosts } from '../../ui/posts/related.ts';
import type { Post } from '../../ui/posts/list.ts';
const post = (url: string, category?: string, tags: string[] = [], day = 1): Post => ({ url, date: new Date(2024, 0, day), data: { title: '<제목>', category, tags } });
test('related posts prioritize shared keywords, then category and recent dates, excluding self', () => {
  const posts = [post('/current/', 'A', ['x', 'y']), post('/category/', 'A', [], 9), post('/two/', 'B', ['x', 'y']), post('/one-new/', 'A', ['x'], 3), post('/one-old/', 'A', ['x'], 2), post('/other/', 'C')];
  assert.deepEqual(relatedPosts(posts, '/current/').map(p => p.url), ['/two/', '/one-new/', '/one-old/']);
  assert.equal(posts.length, 6);
});
test('missing or unrelated posts yield no section; matching category works without tags', () => {
  assert.equal(renderRelatedPosts([post('/a/'), post('/b/')], '/a/'), '');
  assert.equal(renderRelatedPosts([], '/missing/'), '');
  assert.deepEqual(relatedPosts([post('/a/', 'A'), post('/b/', 'A')], '/a/').map(p => p.url), ['/b/']);
  const doc = parseHTML(renderRelatedPosts([post('/a/', 'A'), post('/b/', 'A')], '/a/')).document;
  assert.equal(doc.querySelector('a')?.textContent, '<제목>');
  assert.equal(doc.querySelectorAll('li').length, 1);
});

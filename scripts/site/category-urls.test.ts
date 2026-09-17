import assert from 'node:assert/strict';
import { test } from 'node:test';
import { legacyRedirects } from '../../ui/posts/legacy-urls.ts';
import type { Post } from '../../ui/posts/list.ts';

const post = (category: string): Post => ({
  url: '/posts/example/', date: new Date('2024-01-01'),
  data: { title: '예시', category, tags: ['BERT'] },
});

test('published category aliases stay unique, including spaces and lowercase evaluation', () => {
  const routes = legacyRedirects([post('Machine Learning'), post('Evaluation')]);
  const paths = routes.map(route => decodeURI(route.from));
  assert.equal(new Set(paths).size, paths.length);
  for (const name of ['Agent', 'Algorithm', 'Computer Vision', 'Etc', 'Generative Model',
    'MLOps', 'Machine Learning', 'NLP', 'Paper', 'Project', 'evaluation']) {
    assert(paths.includes(`/blog/categories/${name}/`));
  }
  assert.equal(routes.find(route => route.from.endsWith('/evaluation/'))?.to, '/categories/Evaluation/');
  assert.equal(routes.find(route => route.from.endsWith('/Machine%20Learning/'))?.to, '/categories/Machine%20Learning/');
  assert(routes.every(route => !route.to.startsWith('/blog/')));
});

test('unported categories lead to the category index and gain a direct target when ported', () => {
  const before = legacyRedirects([]);
  const after = legacyRedirects([post('Agent')]);
  assert.equal(before.find(route => route.from === '/blog/categories/Agent/')?.to, '/categories/');
  assert.equal(after.find(route => route.from === '/blog/categories/Agent/')?.to, '/categories/Agent/');
  assert.equal(before.find(route => route.from === '/blog/categories/')?.to, '/categories/');
  assert.throws(() => legacyRedirects([{ ...post('Agent'), data: {
    ...post('Agent').data, legacyUrl: '/blog/categories/Computer Vision/',
  } }]), /중복/);
});

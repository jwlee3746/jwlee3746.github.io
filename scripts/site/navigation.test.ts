import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { groupCategories } from '../../ui/posts/categories.ts';
import { renderNavigation } from '../../ui/shared/navigation.ts';
import { renderPostList, type Post } from '../../ui/posts/list.ts';
import { loadPortfolio } from './data.ts';

const post = (category: string, title = '제목'): Post => ({
  url: '/blog/example/', date: new Date('2024-01-01'), data: { title, category, tags: ['BERT'], excerpt: '<요약>' },
});

test('categories group actual posts independently of tags and preserve Unicode names', () => {
  const groups = groupCategories([post('Machine Learning'), post('Machine Learning'), post('한글 분류')]);
  assert.equal(groups.length, 2);
  assert.equal(groups.find(group => group.name === 'Machine Learning')?.posts.length, 2);
  assert(groups.every(group => decodeURIComponent(group.url).includes(group.name)));
  assert(!groups.some(group => group.name === 'BERT'));
  for (const name of ['', ' ', '../x', '.', '..', 'a/b']) assert.throws(() => groupCategories([post(name)]), /category/);
});

test('navigation keeps home section destinations and selected category across page types', async () => {
  const { site } = await loadPortfolio();
  const groups = groupCategories([post('Machine Learning')]);
  const home = parseHTML(renderNavigation(site, groups, '/')).document;
  const article = parseHTML(renderNavigation(site, groups, '/blog/example/', 'Machine Learning')).document;
  assert.equal(home.querySelector('#home-sections a')?.getAttribute('href'), '#about');
  assert.equal(article.querySelector('#home-sections a')?.getAttribute('href'), '/#about');
  assert.equal(article.querySelector('#posts-sections [aria-current]')?.textContent, 'Machine Learning (1)');
  assert.equal(article.querySelector('[aria-controls="posts-sections"]')?.getAttribute('aria-expanded'), 'true');
  assert.equal(home.querySelector('[aria-controls="posts-sections"]')?.getAttribute('aria-expanded'), 'false');
});

test('post summaries and search metadata escape content while category links remain independent', () => {
  const html = renderPostList([post('Machine Learning', '<script>bad</script>')]);
  const document = parseHTML(html).document;
  assert.equal(document.querySelectorAll('script').length, 0);
  assert.equal(document.querySelector('.post-card-excerpt')?.textContent, '<요약>');
  assert.equal(document.querySelector('.post-card-category')?.getAttribute('href'), '/blog/categories/Machine%20Learning/');
  assert(document.querySelector('.post-card')?.getAttribute('data-search')?.includes('BERT'));
});

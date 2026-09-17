import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { groupCategories } from '../../ui/posts/categories.ts';
import { renderNavigation } from '../../ui/shared/navigation.ts';
import { renderPostList, type Post } from '../../ui/posts/list.ts';
import { loadPortfolio } from './data.ts';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { legacyRedirects } from '../../ui/posts/legacy-urls.ts';

const post = (category: string, title = '제목'): Post => ({
  url: '/posts/example/', date: new Date('2024-01-01'), data: { title, category, tags: ['BERT'], excerpt: '<요약>' },
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
  const article = parseHTML(renderNavigation(site, groups, '/posts/example/', 'Machine Learning')).document;
  assert.equal(home.querySelector('#home-sections a')?.getAttribute('href'), '#about');
  assert.equal(article.querySelector('#home-sections a')?.getAttribute('href'), '/#about');
  assert.equal(article.querySelector('#posts-sections [aria-current]')?.textContent, 'Machine Learning (1)');
  for (const document of [home, article]) {
    assert.equal(document.querySelectorAll('.site-nav button, .site-nav [hidden]').length, 0);
    assert(document.querySelector('#home-sections'));
    assert(document.querySelector('#posts-sections'));
  }
});

test('post summaries and search metadata escape content while category links remain independent', () => {
  const html = renderPostList([post('Machine Learning', '<script>bad</script>')]);
  const document = parseHTML(html).document;
  assert.equal(document.querySelectorAll('script').length, 0);
  assert.equal(document.querySelector('.post-card-excerpt')?.textContent, '<요약>');
  assert.equal(document.querySelector('.post-card-category')?.getAttribute('href'), '/categories/Machine%20Learning/');
  assert(document.querySelector('.post-card')?.getAttribute('data-search')?.includes('BERT'));
});

test('scroll spy selects a short last section at the page bottom and restores selection on scroll up', async () => {
  const { site } = await loadPortfolio();
  const ids = ['about', 'experience', 'projects', 'writing'];
  const { document } = parseHTML(`<html><body>${renderNavigation(site, [], '/')}${ids.map(id => `<section id="${id}"></section>`).join('')}</body></html>`);
  const listeners = new Map<string, () => void>();
  const window = { scrollY: 0, innerHeight: 1000, addEventListener: (event: string, fn: () => void) => listeners.set(event, fn) };
  Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2500 });
  ids.forEach((id, i) => {
    document.getElementById(id)!.getBoundingClientRect = () => ({ top: [80, 400, 1000, 2100][i] - window.scrollY }) as DOMRect;
  });
  runInNewContext(await readFile(new URL('../../ui/portfolio/portfolio.js', import.meta.url), 'utf8'), { document, window });
  const selected = () => [...document.querySelectorAll('#home-sections a.active')].map(a => a.getAttribute('href'));
  assert.deepEqual(selected(), ['#about']);
  window.scrollY = 300;
  listeners.get('scroll')!();
  assert.deepEqual(selected(), ['#experience']);
  window.scrollY = 1500;
  listeners.get('scroll')!();
  assert.deepEqual(selected(), ['#writing']);
  assert.equal(document.querySelector('#home-sections a.active')?.getAttribute('aria-current'), 'location');
  window.scrollY = 900;
  listeners.get('scroll')!();
  assert.deepEqual(selected(), ['#projects']);
  window.innerHeight = 1600;
  listeners.get('resize')!();
  assert.deepEqual(selected(), ['#writing']);
});

test('legacy page routes map to canonical posts and categories without duplicate old paths', () => {
  const article = post('Machine Learning');
  article.data.legacyUrl = '/blog/Machine Learning/기술면접/';
  const routes = legacyRedirects([article]);
  assert(routes.some(route => route.from === article.data.legacyUrl && route.to === article.url));
  assert(routes.some(route => route.from === '/blog/categories/Machine%20Learning/' && route.to === '/categories/Machine%20Learning/'));
  assert(routes.every(route => !route.to.startsWith('/blog/')));
  assert.throws(() => legacyRedirects([article, article]), /중복/);
  for (const path of ['/posts/new/', '/blog/../posts/', '/blog/post/#anchor']) {
    assert.throws(() => legacyRedirects([{ ...article, data: { ...article.data, legacyUrl: path } }]), /legacyUrl/);
  }
});


test('home and posts keep the same profile, search, footer and shared interaction assets', async () => {
  const { default: renderHome } = await import('../../ui/portfolio/index.11ty.ts');
  const { default: renderPage } = await import('../../ui/posts/layouts/page.11ty.ts');
  const collections = { categories: [], posts: [] };
  const home = parseHTML(await renderHome({ collections })).document;
  const posts = parseHTML(await renderPage({ title: 'Posts', content: '', page: { url: '/posts/' }, collections })).document;
  for (const selector of ['.site-sidebar > div:first-child', '.site-search', '.site-footer']) {
    const fragments = [home, posts].map(doc => {
      const fragment = doc.querySelector(selector)!.cloneNode(true) as Element;
      fragment.querySelector('.site-nav')?.remove();
      return fragment.outerHTML;
    });
    assert.equal(fragments[0], fragments[1], selector);
  }
  for (const doc of [home, posts]) {
    assert.equal(doc.querySelectorAll('form[role="search"]').length, 1);
    assert.equal(doc.querySelector('.site-topbar form')?.getAttribute('action'), '/posts/');
    assert.equal(doc.querySelector('.site-topbar input')?.getAttribute('name'), 'q');
    assert(doc.querySelector('script[src="/theme/shared/site-shell.js"]'));
    assert(doc.querySelector('link[href="/theme/shared/site-shell.css"]'));
    assert.equal(doc.querySelectorAll('#site-content').length, 1);
  }
  assert.equal(home.querySelector('.site-breadcrumb [aria-current]')?.textContent, 'Home');
  assert.equal(posts.querySelector('.site-breadcrumb [aria-current]')?.textContent, 'Posts');
});

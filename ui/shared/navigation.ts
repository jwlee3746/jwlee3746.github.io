import type { Site } from '../../scripts/site/data.ts';
import type { Category } from '../posts/categories.ts';
import { escapeHtml as e } from './html.ts';

export function renderNavigation(site: Site, categories: readonly Category[], url: string, category?: string): string {
  const home = url === '/';
  const link = (href: string, label: string, current = false, location = false) =>
    `<a href="${e(href)}"${current ? ` aria-current="${location ? 'location' : 'page'}"` : ''}>${e(label)}</a>`;
  const group = (id: string, label: string, href: string, active: boolean, children: string) =>
    `<div class="site-nav-group"><div class="site-nav-heading">${link(href, label, active, !home)}
<button type="button" aria-label="${label} 하위 메뉴" aria-controls="${id}" aria-expanded="${active}" hidden>⌄</button></div>
<div class="site-nav-sub" id="${id}">${children}</div></div>`;
  return `<nav class="site-nav" aria-label="사이트 탐색">
${group('home-sections', 'HOME', '/', home, site.sections.map(item =>
    link(home ? item.href : `/${item.href}`, item.label)).join(''))}
${group('posts-sections', 'POSTS', '/blog/posts/', !home,
    link('/blog/posts/', 'All Posts', url === '/blog/posts/') + categories.map(item =>
      link(item.url, `${item.name} (${item.posts.length})`, category === item.name, decodeURI(url) !== decodeURI(item.url))).join('') +
    link('/blog/tags/', 'Tags', url === '/blog/tags/'))}
</nav>`;
}

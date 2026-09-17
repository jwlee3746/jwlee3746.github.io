import type { Site } from '../../scripts/site/data.ts';
import type { Category } from '../posts/categories.ts';
import { escapeHtml as e } from './html.ts';

export function renderNavigation(site: Site, categories: readonly Category[], url: string, category?: string): string {
  const home = url === '/';
  const link = (href: string, label: string, current = false, location = false) =>
    `<a href="${e(href)}"${current ? ` aria-current="${location ? 'location' : 'page'}"` : ''}>${e(label)}</a>`;
  const group = (id: string, label: string, href: string, active: boolean, children: string) => {
    const icon = label === 'HOME'
      ? '<path d="m2 10 10-8 10 8v12h-7v-7H9v7H2Z"/>'
      : '<path d="m16 2 6 6-12 12-8 2 2-8Z"/><path d="m14 4 6 6M4 14l6 6" fill="none" stroke="var(--color-sidebar)" stroke-width="2"/>';
    return `<div class="site-nav-group"><div class="site-nav-heading"><a href="${href}"${active ? ` aria-current="${home ? 'page' : 'location'}"` : ''}><svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icon}</svg><span>${label}</span></a></div>
<div class="site-nav-sub" id="${id}">${children}</div></div>`;
  };
  return `<nav class="site-nav" aria-label="사이트 탐색">
${group('home-sections', 'HOME', '/', home, site.sections.map(item =>
    link(home ? item.href : `/${item.href}`, item.label)).join(''))}
${group('posts-sections', 'POSTS', '/posts/', !home,
    link('/posts/', 'All Posts', url === '/posts/') + categories.map(item =>
      link(item.url, `${item.name} (${item.posts.length})`, category === item.name, decodeURI(url) !== decodeURI(item.url))).join('') +
    link('/tags/', 'Tags', url.startsWith('/tags/'), url !== '/tags/'))}
</nav>`;
}

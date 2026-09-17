import type { Category } from '../posts/categories.ts';
import { loadPortfolio } from '../../scripts/site/data.ts';
import { escapeHtml as e } from '../shared/html.ts';
import { metadata, screenTheme } from '../shared/head.ts';
import { renderSidebar, renderPanel } from './sections/navigation.ts';
import { renderContent } from './sections/content.ts';

export const data = { permalink: '/index.html', eleventyExcludeFromCollections: true };
export default async function renderPortfolio({ collections }: { collections: { categories: Category[] } }): Promise<string> {
  const { site, profile, portfolio } = await loadPortfolio();
  return `<!doctype html>
<html lang="ko" data-theme="dark"><head>
${metadata(site)}
<meta name="theme-color" content="#1b1b1e">
${screenTheme()}
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@7/css/all.min.css">
<script type="application/ld+json">${JSON.stringify(site.schema).replace(/</g, '\\u003c')}</script>
<link rel="stylesheet" href="/theme/portfolio/portfolio.css">
<link rel="stylesheet" href="/theme/shared/navigation.css">
<script src="/theme/portfolio/portfolio.js" defer></script></head>
<body><div class="layout">${renderSidebar(site, profile, collections.categories)}
<div class="content-shell"><div class="topbar" aria-label="현재 페이지">
<button type="button" class="sidebar-trigger" id="sidebar-trigger" aria-controls="site-sidebar" aria-label="메뉴 열기" aria-expanded="false"><i class="fas fa-bars" aria-hidden="true"></i></button>
<span class="breadcrumb"><span class="topbar-muted">Portfolio</span><span class="topbar-sep">/</span>Home</span>
<span class="topbar-title">${e(profile.nameEn)}</span>
<form class="site-search" role="search" action="/posts/" method="get"><i class="fas fa-search" aria-hidden="true"></i>
<input id="search-input" name="q" type="search" autocomplete="off" placeholder="Search..." aria-label="블로그 검색"></form></div>
<div class="content-grid"><main>${renderContent(portfolio)}</main>${renderPanel(site, collections.categories)}</div>
<footer class="page-footer">${site.footer.map(line => `<span>${e(line)}</span>`).join('\n')}</footer>
</div></div><div class="mask" id="mask" aria-hidden="true"></div></body></html>`;
}

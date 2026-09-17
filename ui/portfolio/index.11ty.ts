import type { Category } from '../posts/categories.ts';
import { loadPortfolio } from '../../scripts/site/data.ts';
import { escapeHtml as e } from '../shared/html.ts';
import { metadata, screenTheme } from '../shared/head.ts';
import { renderPanel } from './sections/navigation.ts';
import { renderSidebar, renderTopbar, renderFooter, menuMask } from '../shared/site-shell.ts';
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
<link rel="stylesheet" href="/theme/shared/site-shell.css">
<script src="/theme/shared/site-shell.js" defer></script>
<script src="/theme/portfolio/portfolio.js" defer></script></head>
<body><a class="site-skip" href="#site-content">본문으로 건너뛰기</a>
${renderSidebar(site, profile, collections.categories)}
<div class="site-shell" id="site-shell">${renderTopbar([{ label: 'Home' }])}
<div class="site-grid"><main id="site-content" tabindex="-1"><h1 class="sr-only">${e(profile.name)} 포트폴리오</h1>${renderContent(portfolio)}</main>${renderPanel(site, collections.categories)}</div>
${renderFooter(site)}</div>${menuMask}</body></html>`;
}

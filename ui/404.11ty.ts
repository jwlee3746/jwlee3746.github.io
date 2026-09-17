import { readData, errorSchema } from '../scripts/site/data.ts';
import { escapeHtml as e } from './shared/html.ts';
export const data = { permalink: '/404.html', eleventyExcludeFromCollections: true };
export default async function () {
  const page = await readData('data/error.json', errorSchema);
  return `<!DOCTYPE html><html lang="ko" data-theme="dark"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#1b1b1e">
<meta name="color-scheme" content="dark">
<title>${e(page.title)}</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400&family=Source+Sans+Pro:wght@400;600;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css">
<link rel="stylesheet" href="/theme/shared/theme.css">
<link rel="stylesheet" href="/theme/shared/404.css"></head><body><main>
<h1>${e(page.heading)}</h1><p class="lead">${e(page.message)}</p>
<div class="link-row">${page.links.map(link => `<a class="cta" href="${e(link.href)}">${e(link.label)} <span aria-hidden="true">→</span></a>`).join('\n')}</div>
</main></body></html>`;
}

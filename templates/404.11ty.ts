import { readData, errorSchema } from '../scripts/site/data.ts';
import { escapeHtml as e } from './shared/html.ts';
export const data = { permalink: '/404.html', eleventyExcludeFromCollections: true };
export default async function () {
  const page = await readData('data/error.json', errorSchema);
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(page.title)}</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/theme/shared/404.css"></head><body><main>
<h1>${e(page.heading)}</h1><p class="lead">${e(page.message)}</p>
<div class="link-row">${page.links.map(link => `<a class="cta" href="${e(link.href)}">${e(link.label)} <span aria-hidden="true">→</span></a>`).join('\n')}</div>
</main></body></html>`;
}

import type { Site } from '../../../scripts/site/data.ts';
import type { Category } from '../../posts/categories.ts';
import { escapeHtml as e } from '../../shared/html.ts';
export function renderPanel(site: Site, categories: readonly Category[]): string {
  return `<aside class="site-panel" aria-label="바로가기"><section><h2>Featured</h2><ul class="site-panel-list">
${site.featured.map(link => `<li><a href="${e(link.href)}" target="_blank" rel="noopener">${e(link.label)}</a></li>`).join('\n')}
</ul></section><section><h2>Categories</h2><div class="site-panel-tags">
${categories.map(item => `<a href="${e(item.url)}">${e(item.name)} (${item.posts.length})</a>`).join('\n')}
</div></section></aside>`;
}

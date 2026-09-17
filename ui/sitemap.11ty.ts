import { loadPortfolio } from '../scripts/site/data.ts';
import { escapeHtml } from './shared/html.ts';

export const data = { permalink: '/sitemap.xml', eleventyExcludeFromCollections: true };
interface Route { url: string }
export default async function ({ collections }: {
  collections: { posts: Route[]; categories: Route[]; tagGroups: Route[] };
}): Promise<string> {
  const { site } = await loadPortfolio();
  const paths = new Set(['/', '/posts/', '/categories/', '/tags/', '/resume/',
    ...collections.posts.map(item => item.url), ...collections.categories.map(item => item.url),
    ...collections.tagGroups.map(item => item.url)]);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...paths].sort().map(path => `<url><loc>${escapeHtml(new URL(path, site.url).href)}</loc></url>`).join('\n')}
</urlset>`;
}

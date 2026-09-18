import { loadPortfolio } from '../scripts/site/data.ts';
export const data = { permalink: '/robots.txt', eleventyExcludeFromCollections: true };
export default async function (): Promise<string> {
  const { site } = await loadPortfolio();
  return `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site.url).href}\n`;
}

import { escapeHtml as e } from './html.ts';
export function metadata(site: { title: string; description: string; socialDescription: string; url: string }): string {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(site.title)}</title>
<meta name="description" content="${e(site.description)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="profile">
<meta property="og:title" content="${e(site.title)}">
<meta property="og:description" content="${e(site.socialDescription)}">
<meta property="og:url" content="${e(site.url)}">`;
}

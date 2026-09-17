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

/** Screen theme only. Font families are selected in /theme.css. */
export function screenTheme(): string {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400&family=Source+Sans+Pro:wght@400;600;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css">
<link rel="stylesheet" href="/theme.css">`;
}

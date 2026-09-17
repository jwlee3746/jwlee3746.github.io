import { escapeHtml as e } from '../shared/html.ts';
import type { LegacyRedirect } from './legacy-urls.ts';

export const data = {
  pagination: { data: 'collections.legacyRedirects', size: 1, alias: 'redirect' },
  permalink: ({ redirect }: { redirect: LegacyRedirect }) => decodeURI(redirect.from),
  eleventyExcludeFromCollections: true,
};

export default function ({ redirect }: { redirect: LegacyRedirect }): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<title>새 주소로 이동</title><meta name="robots" content="noindex">
<link rel="canonical" href="${e(new URL(redirect.to, 'https://jwlee3746.github.io').href)}">
<noscript><meta http-equiv="refresh" content="0;url=${e(redirect.to)}"></noscript>
<script src="/theme/shared/redirect.js" defer></script></head>
<body><a href="${e(redirect.to)}">새 주소로 이동</a></body></html>`;
}

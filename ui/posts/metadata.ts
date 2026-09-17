import { escapeHtml as e } from '../shared/html.ts';
import { searchText } from './search-text.ts';

export function postMetadata({ title, description, url, author, date }: {
  title: string; description: string; url: string; author: string; date?: Date | string;
}): string {
  const summary = searchText(description).replace(/\s+/g, ' ').trim();
  const article = date ? {
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: title,
    description: summary, url, mainEntityOfPage: url,
    datePublished: new Date(date).toISOString(), author: { '@type': 'Person', name: author },
  } : undefined;
  return `<meta name="description" content="${e(summary)}">
<meta name="author" content="${e(author)}">${article ? `
<script type="application/ld+json">${JSON.stringify(article).replaceAll('<', '\\u003c')}</script>` : ''}`;
}

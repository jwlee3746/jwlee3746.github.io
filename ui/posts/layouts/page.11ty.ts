import { screenTheme } from '../../shared/head.ts';
import { escapeHtml } from "../../shared/html.ts";
import { formatDate } from "../date.ts";
import { normalizeTags, tagUrl } from '../tags.ts';
import { loadPortfolio } from '../../../scripts/site/data.ts';
import { renderPanel } from '../navigation.ts';
import { renderSidebar, renderTopbar, renderFooter, menuMask } from '../../shared/site-shell.ts';
import type { Category } from '../categories.ts';
import { categoryUrl } from '../categories.ts';
import type { Post } from '../list.ts';
import { parseHTML } from 'linkedom';

interface PageData {
  title: string;
  date?: Date | string;
  content: string;
  tags?: string | string[];
  category?: string;
  page: { url: string };
  collections: { posts: Post[]; categories: Category[] };
}

export default async function ({ title, date, content, tags, category, page, collections }: PageData): Promise<string> {
  const { site, profile } = await loadPortfolio();
  const toc = parseHTML(content).document.querySelector('.post-content > .post-toc')?.outerHTML;
  const heading = escapeHtml(title);
  const published = date ? formatDate(date) : undefined;
  const labels = normalizeTags(tags).map(tag =>
    `<li><a href="${tagUrl(tag)}">${escapeHtml(tag)}</a></li>`);
  return `<!doctype html>
<html lang="ko" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>${heading} | Jaynote</title>
  <link rel="canonical" href="${escapeHtml(new URL(page.url, site.url).href)}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  ${screenTheme()}
  <link rel="stylesheet" href="/theme/posts/posts.css">
  <link rel="stylesheet" href="/theme/posts/layout.css">
  <link rel="stylesheet" href="/theme/posts/article.css">
  ${content.includes('class="katex"') ? '<link rel="stylesheet" href="/theme/posts/katex/katex.min.css">' : ''}
  <link rel="stylesheet" href="/theme/shared/navigation.css">
  <link rel="stylesheet" href="/theme/shared/site-shell.css">
  <script src="/theme/shared/site-shell.js" defer></script>
</head>
<body>
  <a class="site-skip" href="#site-content">본문으로 건너뛰기</a>
  ${renderSidebar(site, profile, collections.categories, page.url, category)}
  <div class="site-shell site-shell-posts" id="site-shell">
    ${renderTopbar(page.url === '/posts/' ? [{ label: 'Posts' }] : [{ label: 'Posts', href: '/posts/' }, { label: title }])}
    <div class="site-grid">
      <main id="site-content" tabindex="-1">
        <header class="blog-page-heading">
          <h1>${heading}</h1>
          ${category && published ? `<a class="post-category" href="${categoryUrl(category)}">${escapeHtml(category)}</a> · ` : ""}
          ${published ? `<time datetime="${published}">${published}</time>` : ""}
          ${labels.length ? `<ul class="post-tags" aria-label="글 태그">${labels.join('')}</ul>` : ''}
        </header>
        ${content}
      </main>
      ${renderPanel(collections.posts, toc)}
    </div>
    ${renderFooter(site)}
  </div>
  ${menuMask}
</body>
</html>`;
}

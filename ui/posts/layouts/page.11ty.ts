import { screenTheme } from '../../shared/head.ts';
import { escapeHtml } from "../../shared/html.ts";
import { formatDate } from "../date.ts";
import { normalizeTags, tagUrl } from '../tags.ts';
import { loadPortfolio } from '../../../scripts/site/data.ts';
import { renderSidebar, renderPanel } from '../navigation.ts';
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
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  ${screenTheme()}
  <link rel="stylesheet" href="/theme/posts/posts.css">
  <link rel="stylesheet" href="/theme/posts/layout.css">
  <link rel="stylesheet" href="/theme/posts/article.css">
  ${content.includes('class="katex"') ? '<link rel="stylesheet" href="/theme/posts/katex/katex.min.css">' : ''}
  <link rel="stylesheet" href="/theme/shared/navigation.css">
  <script src="/theme/shared/navigation.js" defer></script>
  <script src="/theme/posts/navigation.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#blog-content">본문으로 건너뛰기</a>
  ${renderSidebar(site, profile, page.url, collections.categories, category)}
  <div class="blog-shell" id="blog-shell">
    <header class="blog-topbar">
      <button type="button" class="blog-menu-trigger" aria-label="메뉴 열기" aria-controls="blog-sidebar" aria-expanded="false" hidden>☰</button>
      <nav class="blog-breadcrumb" aria-label="현재 위치">
        <a href="/blog/posts/">Posts</a><span aria-hidden="true">/</span><span aria-current="page">${heading}</span>
      </nav>
    </header>
    <div class="blog-grid">
      <main id="blog-content" tabindex="-1">
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
    <footer class="blog-footer">${site.footer.map(line => `<span>${escapeHtml(line)}</span>`).join('')}</footer>
  </div>
  <div class="blog-mask" aria-hidden="true" hidden></div>
</body>
</html>`;
}

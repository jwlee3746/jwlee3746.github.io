import { escapeHtml } from "../../shared/html.ts";
import { formatDate } from "../date.ts";
import { normalizeTags, tagUrl } from '../tags.ts';

interface PageData {
  title: string;
  date?: Date | string;
  content: string;
  tags?: string | string[];
}

export default function ({ title, date, content, tags }: PageData): string {
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
  <link rel="stylesheet" href="/theme/posts/posts.css">
  ${content.includes('class="katex"') ? '<link rel="stylesheet" href="/theme/posts/katex/katex.min.css">' : ''}
</head>
<body>
  <nav aria-label="블로그">
    <a href="/">포트폴리오</a> · <a href="/blog/posts/">글 목록</a> · <a href="/blog/tags/">태그</a>
  </nav>
  <main>
    <h1>${heading}</h1>
    ${published ? `<time datetime="${published}">${published}</time>` : ""}
    ${labels.length ? `<ul class="post-tags" aria-label="글 태그">${labels.join('')}</ul>` : ''}
    ${content}
  </main>
</body>
</html>`;
}

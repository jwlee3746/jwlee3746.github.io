import { escapeHtml as e } from '../shared/html.ts';
import type { Post } from './list.ts';
import { normalizeTags, tagUrl } from './tags.ts';

export function renderPanel(posts: readonly Post[], toc?: string, { showTags = true } = {}): string {
  if (toc) return `<aside class="site-panel blog-toc-panel" aria-label="본문 목차">${toc}</aside>`;
  const recent = [...posts].reverse().slice(0, 5);
  const tags = [...new Set(posts.flatMap(post => normalizeTags(post.data.tags)))].sort((a, b) => a.localeCompare(b, 'ko'));
  return `<aside class="site-panel" aria-label="글 바로가기">
    <section><h2>최근 글</h2><ul class="site-panel-list">${recent.map(post => `<li><a href="${e(post.url)}" title="${e(post.data.title)}">${e(post.data.title)}</a></li>`).join('')}</ul></section>
    ${showTags ? `<section><h2>태그</h2><ul class="site-panel-tags">${tags.map(tag => `<li><a href="${tagUrl(tag)}">${e(tag)}</a></li>`).join('')}</ul></section>` : ''}
  </aside>`;
}

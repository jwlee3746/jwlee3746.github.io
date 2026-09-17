import { escapeHtml } from '../shared/html.ts';
import { categoryUrl } from './categories.ts';
import { normalizeTags } from './tags.ts';
import { formatDate } from './date.ts';

export interface Post {
  url: string;
  date: Date;
  data: { title: string; category?: string; excerpt?: string; tags?: string | string[] };
}

export function renderPostList(posts: readonly Post[]): string {
  if (posts.length === 0) return '<p>아직 이전된 글이 없습니다.</p>';
  const items = [...posts].reverse().map(post => {
    const date = formatDate(post.date);
    return `<li class="post-card" data-search="${escapeHtml([post.data.title, post.data.excerpt, post.data.category, ...normalizeTags(post.data.tags)].filter(Boolean).join(" "))}">
      <a class="post-card-title" href="${escapeHtml(post.url)}">${escapeHtml(post.data.title)}</a>
      ${post.data.excerpt ? `<p class="post-card-excerpt">${escapeHtml(post.data.excerpt)}</p>` : ""}
      <div class="post-card-meta"><time datetime="${date}">${date}</time>
      ${post.data.category ? `<a class="post-card-category" href="${categoryUrl(post.data.category)}">${escapeHtml(post.data.category)}</a>` : ""}</div>
    </li>`;
  });
  return `<ul class="post-list">${items.join('\n')}</ul>`;
}

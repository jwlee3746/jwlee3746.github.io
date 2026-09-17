import { escapeHtml } from '../shared/html.ts';
import type { Post } from './list.ts';

// Eleventy's posts collection is oldest first, including its order for equal dates.
export function renderPostPagination(posts: readonly Post[], url: string): string {
  const index = posts.findIndex(post => post.url === url);
  if (index < 0 || posts.length < 2) return '';
  const link = (post: Post | undefined, direction: 'prev' | 'next') => post
    ? `<a class="post-pagination-${direction}" rel="${direction}" href="${escapeHtml(post.url)}">
        <span>${direction === 'prev' ? '← 이전 글' : '다음 글 →'}</span>
        <strong>${escapeHtml(post.data.title)}</strong>
      </a>`
    : '';
  return `<nav class="post-pagination" aria-label="이전 글과 다음 글">
    ${link(posts[index - 1], 'prev')}${link(posts[index + 1], 'next')}
  </nav>`;
}

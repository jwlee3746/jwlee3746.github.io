import { escapeHtml } from '../shared/html.ts';
import { formatDate } from './date.ts';

export interface Post {
  url: string;
  date: Date;
  data: { title: string; tags?: string | string[] };
}

export function renderPostList(posts: readonly Post[]): string {
  if (posts.length === 0) return '<p>아직 이전된 글이 없습니다.</p>';
  const items = [...posts].reverse().map(post => {
    const date = formatDate(post.date);
    return `<li>
      <a href="${escapeHtml(post.url)}">${escapeHtml(post.data.title)}</a>
      <time datetime="${date}">${date}</time>
    </li>`;
  });
  return `<ul>${items.join('\n')}</ul>`;
}

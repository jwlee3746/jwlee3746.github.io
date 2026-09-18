import type { Post } from './list.ts';
import { normalizeTags } from './tags.ts';
import { escapeHtml as e } from '../shared/html.ts';

export function relatedPosts(posts: readonly Post[], url: string): Post[] {
  const current = posts.find(post => post.url === url);
  if (!current) return [];
  const tags = new Set(normalizeTags(current.data.tags));
  return posts.filter(post => post.url !== url).map(post => ({
    post,
    shared: normalizeTags(post.data.tags).filter(tag => tags.has(tag)).length,
    category: Number(Boolean(current.data.category) && post.data.category === current.data.category),
  })).filter(item => item.shared || item.category)
    .sort((a, b) => b.shared - a.shared || b.category - a.category || +b.post.date - +a.post.date || a.post.url.localeCompare(b.post.url))
    .slice(0, 3).map(item => item.post);
}

export function renderRelatedPosts(posts: readonly Post[], url: string): string {
  const related = relatedPosts(posts, url);
  if (!related.length) return '';
  return `<section class="post-related" aria-labelledby="post-related-heading">
    <h2 id="post-related-heading">관련 글</h2>
    <ul>${related.map(post => `<li><a href="${e(post.url)}">${e(post.data.title)}</a></li>`).join('')}</ul>
  </section>`;
}

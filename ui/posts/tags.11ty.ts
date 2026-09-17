import { escapeHtml } from '../shared/html.ts';
import type { Post } from './list.ts';
import { groupPostsByTag, tagAnchor, tagUrl, normalizeTags } from './tags.ts';

export const data = { title: 'Tags', layout: 'page.11ty.ts', permalink: '/tags/' };

export default function ({ collections }: { collections: { posts: Post[] } }): string {
  const tags = groupPostsByTag(collections.posts);
  if (tags.length === 0) return '<p>태그가 지정된 글이 없습니다.</p>';
  const taggedCount = new Set(collections.posts.filter(post => normalizeTags(post.data.tags).length).map(post => post.url)).size;
  const links = tags.map(([tag, posts]) =>
    `<li><a id="${tagAnchor(tag)}" href="${tagUrl(tag)}"><span>${escapeHtml(tag)}</span><span class="tag-count">${posts.length}<span class="sr-only">개의 글</span></span></a></li>`);
  return `<p class="tag-summary">태그 ${tags.length}개 · 태그가 있는 글 ${taggedCount}개</p>
    <nav aria-label="태그 목록"><ul class="tag-list">${links.join('')}</ul></nav>
    <script src="/theme/posts/legacy-tag.js" defer></script>`;
}

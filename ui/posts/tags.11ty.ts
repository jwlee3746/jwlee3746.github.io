import { escapeHtml } from '../shared/html.ts';
import { renderPostList, type Post } from './list.ts';
import { normalizeTags, tagAnchor, tagUrl } from './tags.ts';

export const data = { title: '태그', layout: 'page.11ty.ts', permalink: '/tags/' };

export default function ({ collections }: { collections: { posts: Post[] } }): string {
  const groups = new Map<string, Post[]>();
  for (const post of collections.posts) {
    for (const tag of normalizeTags(post.data.tags)) {
      const posts = groups.get(tag) ?? [];
      posts.push(post);
      groups.set(tag, posts);
    }
  }
  const tags = [...groups].sort(([a], [b]) => a.localeCompare(b, 'ko'));
  if (tags.length === 0) return '<p>태그가 지정된 글이 없습니다.</p>';
  const links = tags.map(([tag, posts]) =>
    `<li><a href="${tagUrl(tag)}">${escapeHtml(tag)} (${posts.length})</a></li>`);
  const sections = tags.map(([tag, posts]) => `<section aria-labelledby="${tagAnchor(tag)}">
    <h2 id="${tagAnchor(tag)}">${escapeHtml(tag)}</h2>
    ${renderPostList(posts)}
  </section>`);
  return `<nav aria-label="태그 목록"><ul class="post-tags">${links.join('')}</ul></nav>
    ${sections.join('\n')}`;
}

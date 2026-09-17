import { escapeHtml } from '../shared/html.ts';
import { renderPostList, type Post } from './list.ts';
import { groupPostsByTag, tagAnchor, tagUrl } from './tags.ts';

export const data = { title: '태그', layout: 'page.11ty.ts', permalink: '/tags/' };

export default function ({ collections }: { collections: { posts: Post[] } }): string {
  const tags = groupPostsByTag(collections.posts);
  if (tags.length === 0) return '<p>태그가 지정된 글이 없습니다.</p>';
  const links = tags.map(([tag, posts]) =>
    `<li class="post-card"><a class="post-card-title" href="${tagUrl(tag)}">${escapeHtml(tag)}</a><span>${posts.length}개의 글</span></li>`);
  const sections = tags.map(([tag, posts]) => `<section aria-labelledby="${tagAnchor(tag)}">
    <h2 id="${tagAnchor(tag)}">${escapeHtml(tag)}</h2>
    ${renderPostList(posts)}
  </section>`);
  return `<p class="tag-summary">${collections.posts.length}개의 글 · ${tags.length}개의 태그</p>
    <nav aria-label="태그 목록"><ul class="tag-grid">${links.join('')}</ul></nav>
    ${sections.join('\n')}`;
}

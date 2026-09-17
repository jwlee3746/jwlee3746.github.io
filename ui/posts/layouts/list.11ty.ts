import { renderPostList, type Post } from '../list.ts';
import type { Category } from '../categories.ts';
import { renderCategoryLinks } from '../category-links.ts';

export const data = { layout: "page.11ty.ts" };

export default function ({ collections }: { collections: { posts: Post[]; categories: Category[] } }): string {
  return `${renderCategoryLinks(collections.categories, collections.posts.length)}
<p class="post-count" role="status" id="post-results">${collections.posts.length}개의 글</p>
${renderPostList(collections.posts, { searchBody: true })}
<div id="post-empty" hidden><p>검색 결과가 없습니다. 다른 검색어를 입력해 보세요.</p><a class="post-search-reset" href="/posts/">검색 지우고 전체 글 보기 <span aria-hidden="true">→</span></a></div>
<script src="/theme/posts/search.js" defer></script>`;
}

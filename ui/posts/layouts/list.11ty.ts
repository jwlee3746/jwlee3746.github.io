import { renderPostList, type Post } from '../list.ts';

export const data = { layout: "page.11ty.ts" };

export default function ({ collections }: { collections: { posts: Post[] } }): string {
  return `<p class="post-count" role="status" id="post-results">${collections.posts.length}개의 글</p>
${renderPostList(collections.posts, { searchBody: true })}
<p id="post-empty" hidden>검색 결과가 없습니다. 다른 검색어를 입력해 보세요.</p>
<script src="/theme/posts/search.js" defer></script>`;
}

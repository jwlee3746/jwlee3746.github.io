import { renderPostList, type Post } from '../list.ts';

export const data = { layout: "page.11ty.ts" };

export default function ({ collections }: { collections: { posts: Post[] } }): string {
  return `<form class="post-search" role="search" action="/posts/" hidden>
<label for="post-query">글 검색</label>
<div><input id="post-query" type="search" name="q" placeholder="제목·본문·분류·태그 검색" autocomplete="off">
<button type="submit">검색</button></div></form>
<p class="post-count" role="status" id="post-results">${collections.posts.length}개의 글</p>
${renderPostList(collections.posts, { searchBody: true })}
<p id="post-empty" hidden>검색 결과가 없습니다. 다른 검색어를 입력해 보세요.</p>
<script src="/theme/posts/search.js" defer></script>`;
}

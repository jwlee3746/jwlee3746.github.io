import { escapeHtml } from '../shared/html.ts';
import { renderPostList, type Post } from './list.ts';
import { groupPostsByTag, tagUrl } from './tags.ts';

export const data = { title: 'Blog', layout: 'page.11ty.ts', permalink: '/blog/' };

export default function ({ collections }: { collections: { posts: Post[] } }): string {
  const { posts } = collections;
  const tags = groupPostsByTag(posts);
  return `<p class="blog-home-summary">${posts.length}개의 글 · ${tags.length}개의 태그</p>
    <section aria-labelledby="blog-topics">
      <h2 id="blog-topics">태그로 둘러보기</h2>
      ${tags.length ? `<ul class="blog-topic-grid">${tags.map(([tag, tagged]) => `<li class="post-card">
        <a class="post-card-title" href="${tagUrl(tag)}">${escapeHtml(tag)}</a>
        <span>${tagged.length}개의 글</span>
      </li>`).join('')}</ul>` : '<p>아직 등록된 태그가 없습니다.</p>'}
    </section>
    <section aria-labelledby="blog-latest">
      <div class="blog-section-heading"><h2 id="blog-latest">최근 글</h2><a href="/blog/posts/">전체 글 보기 →</a></div>
      ${renderPostList(posts.slice(-5))}
    </section>`;
}

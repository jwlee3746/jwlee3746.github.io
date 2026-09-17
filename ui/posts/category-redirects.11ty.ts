import renderPage from './layouts/page.11ty.ts';
import { escapeHtml } from '../shared/html.ts';
import { normalizeTags, tagUrl } from './tags.ts';
import type { Post } from './list.ts';

interface LegacyCategory { path: string; tag?: string }

// Published paths from blog/_pages/categories; these are URL aliases, not taxonomy data.
const categories = [
  'Agent', 'Algorithm', 'Computer Vision', 'Etc', 'Generative Model',
  'MLOps', 'Machine Learning', 'NLP', 'Paper', 'Project',
];
export const data = {
  legacyCategories: [
    { path: '/blog/categories/' },
    ...categories.map(tag => ({ path: `/blog/categories/${tag}/`, tag })),
    { path: '/blog/categories/evaluation/', tag: 'Evaluation' },
  ],
  pagination: { data: 'legacyCategories', size: 1, alias: 'category' },
  permalink: ({ category }: { category: LegacyCategory }) => category.path,
  eleventyExcludeFromCollections: true,
};

export default async function ({ category, collections }: {
  category: LegacyCategory;
  collections: { posts: Post[] };
}): Promise<string> {
  const { tag } = category;
  const exists = !tag || collections.posts.some(post => normalizeTags(post.data.tags).includes(tag));
  const target = tag ? tagUrl(tag) : '/blog/tags/';
  const content = exists
    ? `<p>글을 태그별로 볼 수 있습니다.</p><p><a href="${target}">${escapeHtml(tag ?? '태그 목록')} 보기 →</a></p>`
    : `<p>${escapeHtml(tag!)} 태그의 글이 아직 없습니다.</p>
       <p><a href="/blog/tags/">태그 목록</a> · <a href="/blog/posts/">전체 글 보기</a></p>`;
  return renderPage({
    title: tag ?? '태그', content, collections, page: { url: category.path },
    // Do not redirect to a missing fragment while its posts are not yet available.
    redirectTo: exists ? target : undefined,
  });
}

import { renderPostList } from './list.ts';
import type { Category } from './categories.ts';

export const data = {
  pagination: { data: 'collections.categories', size: 1, alias: 'categoryGroup' },
  eleventyExcludeFromCollections: true,
  layout: 'page.11ty.ts',
  permalink: ({ categoryGroup }: { categoryGroup: Category }) => decodeURIComponent(categoryGroup.url),
  eleventyComputed: {
    title: ({ categoryGroup }: { categoryGroup: Category }) => categoryGroup.name,
    category: ({ categoryGroup }: { categoryGroup: Category }) => categoryGroup.name,
  },
};

export default function ({ categoryGroup }: { categoryGroup: Category }): string {
  return `<p class="post-count">${categoryGroup.posts.length}개의 글</p>${renderPostList(categoryGroup.posts)}`;
}

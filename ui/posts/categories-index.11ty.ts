import type { Category } from './categories.ts';
import { escapeHtml as e } from '../shared/html.ts';

export const data = { title: 'Categories', layout: 'page.11ty.ts', permalink: '/categories/' };

export default function ({ collections }: { collections: { categories: Category[] } }): string {
  return `<ul class="post-list">${collections.categories.map(category =>
    `<li class="post-card"><a class="post-card-title" href="${e(category.url)}">${e(category.name)}</a><p>${category.posts.length}개의 글</p></li>`).join('')}</ul>`;
}

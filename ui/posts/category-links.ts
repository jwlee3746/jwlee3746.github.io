import type { Category } from './categories.ts';
import { escapeHtml as e } from '../shared/html.ts';

export function renderCategoryLinks(categories: readonly Category[], total: number, current?: string): string {
  const link = (url: string, label: string, count: number, active: boolean) =>
    `<li><a href="${e(url)}"${active ? ' aria-current="page"' : ''}>${e(label)} <span>${count}<span class="sr-only">개의 글</span></span></a></li>`;
  return `<nav class="post-categories" aria-label="글 분류"><ul>${link('/posts/', '전체', total, !current)}${categories.map(category => link(category.url, category.name, category.posts.length, current === category.name)).join('')}</ul></nav>`;
}

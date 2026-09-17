import type { Post } from './list.ts';

export interface Category {
  name: string;
  url: string;
  posts: Post[];
}

export function categoryUrl(name: string): string {
  return `/blog/categories/${encodeURIComponent(name)}/`;
}

export function groupCategories(posts: readonly Post[]): Category[] {
  const groups = new Map<string, Post[]>();
  for (const post of posts) {
    const name = post.data.category;
    if (typeof name !== 'string' || !name.trim() || name !== name.trim() || /[/\\?#]|^\.{1,2}$/.test(name)) {
      throw new Error(`${post.url}: category에 하나의 분류 이름을 지정하세요.`);
    }
    const group = groups.get(name) ?? [];
    group.push(post);
    groups.set(name, group);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b, 'ko'))
    .map(([name, posts]) => ({ name, url: categoryUrl(name), posts }));
}

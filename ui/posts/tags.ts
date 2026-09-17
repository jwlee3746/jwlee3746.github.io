import type { Post } from './list.ts';

export function normalizeTags(tags?: string | string[]): string[] {
  const names = typeof tags === 'string' ? [tags] : tags ?? [];
  return [...new Set(names.map(tag => tag.trim()).filter(Boolean))];
}

export function tagAnchor(tag: string): string {
  // Stable, distinct fragments even for Korean, spaces, C++ and C#.
  return `tag-${Buffer.from(tag).toString('base64url')}`;
}

export function tagUrl(tag: string): string {
  return `/tags/${tagAnchor(tag)}/`;
}

export function groupPostsByTag(posts: readonly Post[]): [string, Post[]][] {
  const groups = new Map<string, Post[]>();
  for (const post of posts) {
    for (const tag of normalizeTags(post.data.tags)) {
      const tagged = groups.get(tag) ?? [];
      tagged.push(post);
      groups.set(tag, tagged);
    }
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b, 'ko'));
}

export interface TagGroup { name: string; url: string; posts: Post[] }
export function tagPages(posts: readonly Post[]): TagGroup[] {
  return groupPostsByTag(posts).map(([name, posts]) => ({ name, posts, url: tagUrl(name) }));
}

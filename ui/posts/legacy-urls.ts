import type { Post } from './list.ts';
import { groupCategories } from './categories.ts';

export interface LegacyRedirect { from: string; to: string }

export function legacyRedirects(posts: readonly Post[]): LegacyRedirect[] {
  const redirects: LegacyRedirect[] = [
    { from: '/blog/', to: '/posts/' },
    { from: '/blog/posts/', to: '/posts/' },
    { from: '/blog/search/', to: '/posts/' },
    { from: '/blog/categories/', to: '/categories/' },
    { from: '/blog/tags/', to: '/tags/' },
    ...groupCategories(posts).map(category => ({ from: `/blog${category.url}`, to: category.url })),
  ];
  for (const post of posts) {
    if (!post.data.legacyUrl) continue;
    const from = post.data.legacyUrl;
    if (!from.startsWith('/blog/') || !from.endsWith('/') || /[?#\\]/.test(from) || from.split('/').some(part => part === '.' || part === '..')) {
      throw new Error(`${post.url}: legacyUrl에는 기존 /blog/.../ 경로를 지정하세요.`);
    }
    if (redirects.some(item => decodeURI(item.from) === decodeURI(from))) throw new Error(`중복된 legacyUrl: ${from}`);
    redirects.push({ from, to: post.url });
  }
  return redirects;
}

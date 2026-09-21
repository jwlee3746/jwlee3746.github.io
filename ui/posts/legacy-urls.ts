import type { Post } from './list.ts';
import { groupCategories } from './categories.ts';

export interface LegacyRedirect { from: string; to: string }

// Published category paths from the original blog; keep aliases even before their posts are ported.
const legacyCategories = [
  ['Agent', 'Agent'], ['Algorithm', 'Algorithm'], ['Computer Vision', 'Computer Vision'],
  ['Etc', 'Etc'], ['Generative Model', 'Generative Model'], ['MLOps', 'MLOps'],
  ['Machine Learning', 'Machine Learning'], ['NLP', 'NLP'], ['Paper', 'Paper'],
  ['Project', 'Project'], ['evaluation', 'Evaluation'],
] as const;

export function legacyRedirects(posts: readonly Post[]): LegacyRedirect[] {
  const categories = groupCategories(posts);
  const redirects: LegacyRedirect[] = [
    { from: '/posts/evaluation-evolution-phase-1/', to: '/posts/fixed-prompt-plan-evaluation/' },
    { from: '/blog/', to: '/posts/' },
    { from: '/blog/posts/', to: '/posts/' },
    { from: '/blog/search/', to: '/posts/' },
    { from: '/blog/categories/', to: '/categories/' },
    { from: '/blog/tags/', to: '/tags/' },
    ...categories.map(category => ({ from: `/blog${category.url}`, to: category.url })),
  ];
  for (const [path, name] of legacyCategories) {
    const from = `/blog/categories/${encodeURIComponent(path)}/`;
    if (redirects.some(redirect => decodeURI(redirect.from) === decodeURI(from))) continue;
    const category = categories.find(category => category.name === name);
    redirects.push({ from, to: category?.url ?? '/categories/' });
  }
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

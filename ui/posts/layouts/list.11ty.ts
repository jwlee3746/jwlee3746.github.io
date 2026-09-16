import { renderPostList, type Post } from '../list.ts';

export const data = { layout: "page.11ty.ts" };

export default function ({ collections }: { collections: { posts: Post[] } }): string {
  return renderPostList(collections.posts);
}

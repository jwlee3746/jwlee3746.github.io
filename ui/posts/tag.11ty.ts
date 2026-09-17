import { renderPostList } from './list.ts';
import type { TagGroup } from './tags.ts';

export const data = {
  pagination: { data: 'collections.tagGroups', size: 1, alias: 'tagGroup' },
  eleventyExcludeFromCollections: true,
  layout: 'page.11ty.ts',
  permalink: ({ tagGroup }: { tagGroup: TagGroup }) => tagGroup.url,
  eleventyComputed: { title: ({ tagGroup }: { tagGroup: TagGroup }) => tagGroup.name },
};

export default function ({ tagGroup }: { tagGroup: TagGroup }): string {
  return `<div class="tag-results-heading"><p class="post-count">${tagGroup.posts.length}개의 글</p><a href="/tags/">전체 태그 <span aria-hidden="true">→</span></a></div>${renderPostList(tagGroup.posts)}`;
}

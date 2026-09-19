import { parseHTML } from 'linkedom';
import { inlinePostDiagrams } from '../diagrams.ts';
import { renderPostPagination } from '../pagination.ts';
import { renderRelatedPosts } from '../related.ts';
import type { Post } from '../list.ts';

export default class PostLayout {
  data() {
    return { layout: 'page.11ty.ts' };
  }

  render({ content, page, collections }: {
    content: string; page: { url: string }; collections: { posts: Post[] };
  }): string {
    const { document } = parseHTML(`<div class="post-content">${inlinePostDiagrams(content)}</div>`);
    const body = document.querySelector('.post-content')!;
    const currentUrl = new URL(page.url, 'https://jwlee3746.github.io');
    for (const link of body.querySelectorAll('a[href]')) {
      const href = link.getAttribute('href')!;
      if (!href.trim() || href.trim().startsWith('#')) continue;
      let url: URL;
      try { url = new URL(href, currentUrl); } catch { continue; }
      if (!['http:', 'https:'].includes(url.protocol)) continue;
      if (url.origin !== currentUrl.origin || /\.pdf$/i.test(url.pathname)) {
        link.setAttribute('target', '_blank');
        const rel = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
        rel.delete('opener');
        rel.add('noopener');
        link.setAttribute('rel', [...rel].join(' '));
      }
    }
    // Keep native table semantics while making wide tables keyboard-scrollable.
    for (const table of body.querySelectorAll('table')) {
      const region = document.createElement('div');
      region.className = 'post-table';
      region.setAttribute('tabindex', '0');
      region.setAttribute('role', 'region');
      region.setAttribute('aria-label', `${table.querySelector('caption')?.textContent?.trim() || '표'} (가로 스크롤)`);
      table.replaceWith(region);
      region.append(table);
    }
    return body.outerHTML + renderRelatedPosts(collections.posts, page.url) + renderPostPagination(collections.posts, page.url);
  }
}

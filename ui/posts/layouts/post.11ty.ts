import { parseHTML } from 'linkedom';

export default class PostLayout {
  data() {
    return { layout: 'page.11ty.ts' };
  }

  render({ content }: { content: string }): string {
    const { document } = parseHTML(`<div class="post-content">${content}</div>`);
    const body = document.querySelector('.post-content')!;
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
    return body.outerHTML;
  }
}

import { renderTableOfContents } from '../toc.ts';

export default class PostLayout {
  data() {
    return { layout: 'page.11ty.ts' };
  }

  render({ content, toc }: { content: string; toc?: boolean }): string {
    const body = renderTableOfContents(content);
    return `${toc === true ? body.toc : ''}${body.content}`;
  }
}

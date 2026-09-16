import type MarkdownIt from 'markdown-it';
import { parseHTML } from 'linkedom';
import { escapeHtml } from '../shared/html.ts';

// Markdown plugins cannot see headings inside raw HTML. Give them hidden tokens,
// then write assigned IDs back into the fragment without rendering duplicate headings.
export function htmlHeadings(md: MarkdownIt): void {
  md.core.ruler.push('html_headings', state => {
    if (state.inlineMode) return;
    const slugs: Record<string, boolean> = Object.create(null);
    state.env.markdownItAnchor = { slugs };
    state.tokens = state.tokens.flatMap(token => {
      const html = token.type === 'html_block' ? token.content
        : (token.children ?? []).filter(child => child.type === 'html_inline').map(child => child.content).join('');
      if (!html) return [token];
      const { document } = parseHTML(`<html><body>${html}</body></html>`);
      for (const element of document.querySelectorAll('[id]')) slugs[element.id] = true;
      if (token.type !== 'html_block') return [token];
      const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')];
      if (!headings.length) return [token];
      token.meta = { ...token.meta, headingDocument: document };
      return [token, ...headings.flatMap(element => {
        const copy = element.cloneNode(true) as Element;
        // Compatibility for existing raw HTML containing already-rendered KaTeX.
        const source = copy.cloneNode(true) as Element;
        for (const math of source.querySelectorAll('.katex')) {
          math.replaceWith(document.createTextNode(math.querySelector('annotation[encoding="application/x-tex"]')?.textContent ?? math.textContent ?? ''));
        }
        copy.querySelectorAll('.katex-html, annotation, annotation-xml').forEach(node => node.remove());
        const open = new state.Token(element.id ? 'html_heading_open' : 'heading_open', element.tagName.toLowerCase(), 1);
        open.hidden = true;
        if (element.id) open.attrSet('id', element.id);
        open.meta = { headingElement: element };
        const inline = new state.Token('inline', '', 0);
        const text = new state.Token('html_heading_text', '', 0);
        text.content = source.textContent ?? '';
        inline.children = [text];
        inline.meta = { tocLabel: escapeHtml(copy.textContent?.trim() || '제목 없음') };
        const close = new state.Token('heading_close', open.tag, -1);
        close.hidden = true;
        return [open, inline, close];
      })];
    });
  });
  md.renderer.rules.html_heading_text = () => '';
  const renderHTML = md.renderer.rules.html_block!;
  md.renderer.rules.html_block = (tokens, index, options, env, renderer) =>
    tokens[index].meta?.headingDocument?.body.innerHTML ?? renderHTML(tokens, index, options, env, renderer);
}

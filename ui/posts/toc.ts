import type MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import anchor from 'markdown-it-anchor';
import tableOfContents from 'markdown-it-table-of-contents';
import { htmlHeadings } from './html-headings.ts';
import { escapeHtml } from '../shared/html.ts';

// Preserve published fragments, including Korean and source TeX in math headings.
function headingText(tokens: Token[]): string {
  return tokens.filter(token => ['text', 'code_inline', 'math_inline', 'html_heading_text'].includes(token.type))
    .map(token => token.content).join('').trim() || '제목 없음';
}

export function postTableOfContents(md: MarkdownIt): void {
  md.use(htmlHeadings).use(anchor, {
    getTokensText: headingText,
    slugify: title => title.normalize('NFC').toLowerCase()
      .replace(/[^\p{L}\p{N}_\s-]/gu, '').trim().replace(/\s+/g, '-') || 'section',
  }).use(tableOfContents, {
    includeLevel: [1, 2, 3, 4, 5, 6],
    listType: 'ol',
    transformLink: (id: string | null) => id ? escapeHtml(encodeURIComponent(id)) : null,
    getTokensText: (tokens: Token[], inline: Token) => inline.meta?.tocLabel
      ?? (md.renderer.renderInline(tokens.filter(token =>
        ['text', 'code_inline', 'math_inline'].includes(token.type)), md.options, {}) || '제목 없음'),
    format: (html: string) => html,
  });
  // Front matter controls the TOC; literal [[toc]] in articles is not a second switch.
  md.block.ruler.disable('toc');
  md.core.ruler.after('anchor', 'post_toc', state => {
    for (const token of state.tokens) {
      if (token.type === 'html_heading_open') token.type = 'heading_open';
      if (token.meta?.headingElement) {
        token.meta.headingElement.id = token.attrGet('id');
        token.meta.headingElement.setAttribute('tabindex', '-1');
      }
    }
    if (state.env.toc !== true || !state.tokens.some(token => token.type === 'heading_open')) return;
    const list = md.renderer.rules.toc_body!(state.tokens, 0, state.md.options, state.env, md.renderer);
    const toc = new state.Token('html_block', '', 0);
    toc.content = `<nav class="post-toc" aria-label="목차"><strong>목차</strong>${list}</nav>\n`;
    state.tokens.unshift(toc);
  });
}

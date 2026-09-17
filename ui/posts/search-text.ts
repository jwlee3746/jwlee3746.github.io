import { parseHTML } from 'linkedom';

// Index rendered article text, excluding navigation and duplicate math accessibility markup.
export function searchText(html: string): string {
  const { document } = parseHTML(`<html><body>${html}</body></html>`);
  for (const element of document.querySelectorAll('script, style, template, .post-toc, .katex-mathml')) {
    element.remove();
  }
  for (const block of document.querySelectorAll('p, div, section, article, h1, h2, h3, h4, h5, h6, li, dt, dd, pre, blockquote, figure, figcaption, tr, td, th, br, hr')) {
    block.before(' ');
    block.after(' ');
  }
  return document.body.textContent.replace(/\s+/g, ' ').trim();
}

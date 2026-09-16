import { parseHTML } from 'linkedom';
import { escapeHtml } from '../shared/html.ts';

function headingText(heading: Element, mathFormat: 'text' | 'tex'): string {
  const copy = heading.cloneNode(true) as Element;
  for (const math of copy.querySelectorAll('.katex')) {
    const source = math.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
    const mathml = math.querySelector('.katex-mathml');
    // KaTeX includes MathML, its TeX annotation, and visual HTML for one formula.
    // Read one representation from a clone so the accessible body stays intact.
    mathml?.querySelectorAll('annotation, annotation-xml').forEach(node => node.remove());
    const text = mathFormat === 'tex' ? source : mathml?.textContent;
    math.replaceWith(copy.ownerDocument.createTextNode(
      text ?? math.querySelector('.katex-html')?.textContent ?? math.textContent ?? '',
    ));
  }
  return copy.textContent?.trim() || '제목 없음';
}

export function renderTableOfContents(content: string): { content: string; toc: string } {
  const { document } = parseHTML(`<html><body>${content}</body></html>`);
  const headings = [...document.body.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  if (!headings.length) return { content, toc: '' };

  const used = new Set([...document.body.querySelectorAll('[id]')].map(node => node.id));
  const minLevel = Math.min(...headings.map(node => Number(node.tagName.slice(1))));
  const items = headings.map(heading => {
    const label = headingText(heading, 'text');
    if (!heading.id) {
      // Source TeX keeps anchors stable when math rendering is enabled.
      const slug = headingText(heading, 'tex').normalize('NFC').toLowerCase()
        .replace(/[^\p{L}\p{N}_\s-]/gu, '').trim().replace(/\s+/g, '-') || 'section';
      let id = slug;
      for (let suffix = 1; used.has(id); suffix++) id = `${slug}-${suffix}`;
      heading.id = id;
      used.add(id);
    }
    const depth = Number(heading.tagName.slice(1)) - minLevel;
    return `<li style="--toc-depth: ${depth}"><a href="#${escapeHtml(encodeURIComponent(heading.id))}">${escapeHtml(label)}</a></li>`;
  });

  return {
    content: document.body.innerHTML,
    toc: `<nav class="post-toc" aria-label="목차"><strong>목차</strong><ol>${items.join('')}</ol></nav>`,
  };
}

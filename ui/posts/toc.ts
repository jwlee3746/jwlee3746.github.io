import { parseHTML } from 'linkedom';
import { escapeHtml } from '../shared/html.ts';

export function renderTableOfContents(content: string): { content: string; toc: string } {
  const { document } = parseHTML(`<html><body>${content}</body></html>`);
  const headings = [...document.body.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  if (!headings.length) return { content, toc: '' };

  const used = new Set([...document.body.querySelectorAll('[id]')].map(node => node.id));
  const minLevel = Math.min(...headings.map(node => Number(node.tagName.slice(1))));
  const items = headings.map(heading => {
    const label = heading.textContent?.trim() || '제목 없음';
    if (!heading.id) {
      const slug = label.normalize('NFC').toLowerCase()
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

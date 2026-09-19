import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';

/** Inline only repository-authored, opt-in diagrams so they share article fonts. */
export function inlinePostDiagrams(content: string): string {
  const { document } = parseHTML(`<div>${content}</div>`);
  const body = document.querySelector('div')!;
  let index = 0;
  for (const image of body.querySelectorAll('img[src]')) {
    const src = image.getAttribute('src')!;
    if (!/^\/data\/images\/posts\/[a-z0-9-]+\/[a-z0-9-]+\.svg$/.test(src)) continue;
    const source = readFileSync(`.${src}`, 'utf8');
    if (!source.includes('data-article-diagram="true"')) continue;
    const parsed = parseHTML(source).document;
    const svg = parsed.querySelector('svg')!;
    // Each embedded SVG needs its own title, description and arrow marker IDs.
    const rootId = `post-diagram-${++index}`;
    const prefix = `${rootId}-`;
    svg.setAttribute('id', rootId);
    svg.setAttribute('data-diagram-src', src);
    for (const style of svg.querySelectorAll('style')) {
      style.textContent = style.textContent!.replaceAll('.article-diagram-art', `:where(#${rootId})`);
    }
    let markup = svg.outerHTML;
    for (const node of svg.querySelectorAll('[id]')) {
      const id = node.getAttribute('id')!;
      markup = markup.replaceAll(`id="${id}"`, `id="${prefix}${id}"`)
        .replaceAll(`url(#${id})`, `url(#${prefix}${id})`)
        .replaceAll(`href="#${id}"`, `href="#${prefix}${id}"`);
    }
    markup = markup.replace(/aria-labelledby="([^"]+)"/g, (_, ids: string) =>
      `aria-labelledby="${ids.split(/\s+/).map(id => prefix + id).join(' ')}"`);
    const region = document.createElement('div');
    region.className = 'post-diagram';
    region.setAttribute('tabindex', '0');
    region.setAttribute('role', 'region');
    region.setAttribute('aria-label', `${image.getAttribute('alt') || '도표'} (가로 스크롤)`);
    region.innerHTML = markup;
    // Markdown wraps standalone images in a paragraph; avoid a div inside p.
    const parent = image.parentElement;
    if (parent?.tagName === 'P' && parent.childNodes.length === 1) parent.replaceWith(region);
    else image.replaceWith(region);
  }
  return body.innerHTML;
}

import { escapeHtml as e } from './html.ts';
export function externalLink(href: string, label: string, arrow = '↗'): string {
  return `<a href="${e(href)}" target="_blank" rel="noopener">${e(label)} <span aria-hidden="true">${arrow}</span><span class="sr-only"> (새 탭에서 열림)</span></a>`;
}

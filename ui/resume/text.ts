import { escapeHtml } from '../shared/html.ts';

/** Support bold spans only; source HTML always remains escaped text. */
export function renderEmphasis(text: string): string {
  return escapeHtml(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

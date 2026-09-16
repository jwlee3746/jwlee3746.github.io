/** Data is plain text. Only templates may emit HTML. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

export function formatPeriod(entry: { start: string; end: string | null }): string {
  return `${entry.start.replace('-', '.')} — ${entry.end?.replace('-', '.') ?? '현재'}`;
}

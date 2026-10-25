import type { HistoryEntry } from '../../../scripts/resume/data.ts';
import { escapeHtml as e, formatPeriod } from '../../shared/html.ts';

export function renderHistory(title: string, entries: HistoryEntry[]): string {
  return `  <h2>${e(title)}</h2>\n` + entries.map(entry => `  <div class="row">
    <div class="when">${formatPeriod(entry)}</div>
    <div>
      <div class="what">${e(entry.title)}</div>${entry.points.length ? `
      <ul>
${entry.points.map(point => `        <li>${e(point)}</li>`).join('\n')}
      </ul>` : ''}${entry.highlights.map(highlight => `
      <section class="history-period">
        <h3 class="history-period-title">${e(highlight.title)}</h3>
        <ul>
${highlight.points.map(point => `          <li>${e(point)}</li>`).join('\n')}
        </ul>
      </section>`).join('')}
    </div>
  </div>`).join('\n');
}

import type { Group, Project } from '../../../scripts/resume/data.ts';
import { escapeHtml as e, formatPeriod } from '../html.ts';

function renderProject(project: Project): string {
  const title = project.url
    ? `<a href="${e(project.url)}" target="_blank" rel="noopener">${e(project.title)}</a>`
    : e(project.title);
  return `    <article class="project">
      <header>
        <h4 class="project-title">${title}</h4>
        <p class="project-date">${formatPeriod(project)}</p>
        <p class="project-stack">${project.stack.map(e).join(' · ')}</p>
      </header>
      <div>
        <p class="project-impact">${e(project.impact)}</p>
        <ul class="project-points">
${project.points.map(point => `          <li><span class="bullet-label">${e(point.label)}</span> — ${e(point.text)}</li>`).join('\n')}
        </ul>
      </div>
    </article>`;
}

export function renderProjects(title: string, groups: Group[], projects: Project[]): string {
  const populated = groups.filter(group => projects.some(project => project.group === group.id));
  if (!populated.length) return '';
  return `  <h2 class="projects-heading">${e(title)}</h2>\n` + populated.map(group => `  <section class="project-group" aria-labelledby="${e(group.id)}-projects-heading">
    <header class="group-heading">
      <p class="group-label">${e(group.label)}</p>
      <div>
        <h3 class="group-title" id="${e(group.id)}-projects-heading">${e(group.title)}</h3>
        <p class="group-desc">${e(group.description)}</p>
      </div>
    </header>

${projects.filter(project => project.group === group.id).map(renderProject).join('\n\n')}
  </section>`).join('\n\n');
}

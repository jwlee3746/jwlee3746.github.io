import type { Portfolio } from '../../../scripts/site/data.ts';
import { escapeHtml as e } from '../../shared/html.ts';
import { externalLink } from '../../shared/links.ts';

export function renderContent(data: Portfolio): string {
  const section = (id: keyof Portfolio['headings'], content: string) => `<section id="${id}" aria-labelledby="${id}-h">
<h2 class="sec-title" id="${id}-h">${e(data.headings[id])}</h2>${content}</section>`;
  return section('about', `<p class="prose">${data.about.map(part => typeof part === 'string' ? e(part) : `<strong>${e(part.strong)}</strong>`).join('')}</p>`) +
  section('experience', `<div class="timeline">${data.experience.map(entry => `<article class="timeline-entry"${entry.id ? ` id="${e(entry.id)}"` : ''}>
<div class="timeline-date">${e(entry.date)}</div><div>
<h3 class="timeline-title">${entry.href ? externalLink(entry.href, entry.title) : e(entry.title)}${entry.kind ? ` <span class="timeline-kind">${e(entry.kind)}</span>` : ''}</h3>
<p class="timeline-desc">${e(entry.description)}</p></div></article>`).join('')}</div>`) +
  section('projects', `<div class="project-list">${data.projects.map(project => `<article class="project-row">
<div class="project-meta"><strong>${e(project.date)}</strong>${e(project.category)}</div><div>
<h3 class="project-title">${e(project.title)}</h3>
<p class="project-impact">${e(project.impact)}</p>
<ul class="project-points">${project.points.map(point => `<li><strong>${e(point.label)}</strong> — ${e(point.text)}</li>`).join('')}</ul>
${project.links.length ? `<div class="project-links">${project.links.map(link => externalLink(link.href, link.label)).join('\n')}</div>` : ""}
</div></article>`).join('')}</div>`) +
  section('writing', `<div class="post-list">${data.posts.map(post => `<a class="post-row" href="${e(post.href)}" target="_blank" rel="noopener">
<div class="post-thumb"><img src="${e(post.image)}" alt="" width="256" height="160" loading="lazy" onerror="this.remove()"></div>
<div><div class="post-cat">${e(post.category)}</div>
<div class="post-title">${e(post.title)} <span class="arrow" aria-hidden="true">↗</span><span class="sr-only"> (새 탭에서 열림)</span></div>
<p class="card-desc">${e(post.description)}</p></div></a>`).join('')}</div>
<a class="more" href="${e(data.more.href)}" target="_blank" rel="noopener">${e(data.more.label)} <span aria-hidden="true">→</span><span class="sr-only"> (새 탭에서 열림)</span></a>`);
}

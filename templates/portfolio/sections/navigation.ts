import type { Site, Profile } from '../../../scripts/site/data.ts';
import { escapeHtml as e } from '../../shared/html.ts';
export function renderSidebar(site: Site, profile: Profile): string {
  return `<header class="side"><div>
<a class="profile-mark" href="${e(profile.github)}" target="_blank" rel="noopener" aria-label="${e(profile.name)}의 GitHub 프로필"><img src="${e(profile.avatar)}" alt="${e(profile.avatarAlt)}" width="460" height="460"></a>
<h1 class="name">${e(profile.name)}</h1><div class="name-en">${e(profile.nameEn)}</div>
<p class="role">${e(profile.role)}</p><p class="tagline">${e(profile.tagline)}</p>
<a class="resume-cta" href="${e(site.resume.href)}" target="_blank" rel="noopener">${e(site.resume.label)} <span aria-hidden="true">→</span><span class="sr-only"> (새 탭에서 열림)</span></a>
<nav class="nav" aria-label="섹션"><div class="nav-group">
<a class="nav-parent" href="#about" aria-current="page"><i class="fa-fw fas fa-home" aria-hidden="true"></i><span class="label">HOME</span></a>
<div class="nav-sub" aria-label="Home 하위 섹션">${site.sections.map(link => `<a href="${e(link.href)}">${e(link.label)}</a>`).join('\n')}</div></div>
${site.navigation.map(link => `<a class="nav-parent ${link.href.endsWith('/posts/') ? 'nav-posts' : 'nav-categories'}" href="${e(link.href)}"><i class="${e(link.icon)}" aria-hidden="true"></i><span class="label">${e(link.label)}</span></a>`).join('\n')}</nav></div>
<div class="side-foot">${site.social.map(link => `<a href="${e(link.href)}"${link.href.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener"'}>${e(link.label)}${link.href.startsWith('mailto:') ? '' : '<span class="sr-only"> (새 탭에서 열림)</span>'}</a>`).join('\n')}</div></header>`;
}
export function renderPanel(site: Site): string {
  return `<aside class="panel" aria-label="바로가기"><section><h2>Featured</h2><ul>
${site.featured.map(link => `<li><a href="${e(link.href)}" target="_blank" rel="noopener">${e(link.label)}</a></li>`).join('\n')}
</ul></section><section><h2>Categories</h2><div class="panel-tags">
${site.categories.map(link => `<a href="${e(link.href)}">${e(link.label)}</a>`).join('\n')}
</div></section></aside>`;
}

import type { Site, Profile } from '../../../scripts/site/data.ts';
import { renderNavigation } from '../../shared/navigation.ts';
import type { Category } from '../../posts/categories.ts';
import { escapeHtml as e } from '../../shared/html.ts';
export function renderSidebar(site: Site, profile: Profile, categories: readonly Category[] = []): string {
  return `<header class="side" id="site-sidebar"><div>
<button type="button" class="sidebar-close" aria-label="메뉴 닫기" hidden>×</button>
<a class="profile-mark" href="${e(profile.github)}" target="_blank" rel="noopener" aria-label="${e(profile.name)}의 GitHub 프로필"><img src="${e(profile.avatar)}" alt="${e(profile.avatarAlt)}" width="460" height="460"></a>
<h1 class="name">${e(profile.name)}</h1><div class="name-en">${e(profile.nameEn)}</div>
<p class="role">${e(profile.role)}</p><p class="tagline">${e(profile.tagline)}</p>
<a class="resume-cta" href="${e(site.resume.href)}" target="_blank" rel="noopener">${e(site.resume.label)} <span aria-hidden="true">→</span><span class="sr-only"> (새 탭에서 열림)</span></a>
${renderNavigation(site, categories, '/')}</div>
<div class="side-foot">${site.social.map(link => `<a href="${e(link.href)}"${link.href.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener"'}>${e(link.label)}${link.href.startsWith('mailto:') ? '' : '<span class="sr-only"> (새 탭에서 열림)</span>'}</a>`).join('\n')}</div></header>`;
}
export function renderPanel(site: Site, categories: readonly Category[]): string {
  return `<aside class="panel" aria-label="바로가기"><section><h2>Featured</h2><ul>
${site.featured.map(link => `<li><a href="${e(link.href)}" target="_blank" rel="noopener">${e(link.label)}</a></li>`).join('\n')}
</ul></section><section><h2>Categories</h2><div class="panel-tags">
${categories.map(item => `<a href="${e(item.url)}">${e(item.name)} (${item.posts.length})</a>`).join('\n')}
</div></section></aside>`;
}

import type { Site, Profile } from '../../scripts/site/data.ts';
import type { Category } from '../posts/categories.ts';
import { renderNavigation } from './navigation.ts';
import { escapeHtml as e } from './html.ts';

export function renderSidebar(site: Site, profile: Profile, categories: readonly Category[] = [], url = '/', category?: string): string {
  return `<aside class="site-sidebar" id="site-sidebar" aria-label="사이트 메뉴"><div>
<button type="button" class="site-menu-close" aria-label="메뉴 닫기" hidden>×</button>
<a class="site-avatar" href="${e(profile.github)}" target="_blank" rel="noopener" aria-label="${e(profile.name)}의 GitHub 프로필"><img src="${e(profile.avatar)}" alt="${e(profile.avatarAlt)}" width="112" height="112"></a>
<p class="site-name">${e(profile.name)}</p><div class="site-name-en">${e(profile.nameEn)}</div>
<p class="site-role">${e(profile.role)}</p><p class="site-tagline">${e(profile.tagline)}</p>
<a class="site-resume" href="${e(site.resume.href)}" target="_blank" rel="noopener">${e(site.resume.label)} <span aria-hidden="true">→</span><span class="sr-only"> (새 탭에서 열림)</span></a>
${renderNavigation(site, categories, url, category)}</div>
<div class="site-social">${site.social.map(link => `<a href="${e(link.href)}"${link.href.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener"'}>${e(link.label)}${link.href.startsWith('mailto:') ? '' : '<span class="sr-only"> (새 탭에서 열림)</span>'}</a>`).join('')}</div></aside>`;
}

interface Crumb { label: string; href?: string }
export function renderTopbar(crumbs: readonly Crumb[]): string {
  return `<header class="site-topbar"><div class="site-topbar-inner">
<button type="button" class="site-menu-trigger" id="sidebar-trigger" aria-controls="site-sidebar" aria-label="메뉴 열기" aria-expanded="false" hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>
<nav class="site-breadcrumb" aria-label="현재 위치"><a href="/">Portfolio</a>${crumbs.map(crumb => `<span aria-hidden="true">/</span>${crumb.href ? `<a href="${e(crumb.href)}">${e(crumb.label)}</a>` : `<span aria-current="page">${e(crumb.label)}</span>`}`).join('')}</nav>
<form class="site-search" role="search" action="/posts/" method="get"><button type="submit" aria-label="검색"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg></button><input id="search-input" name="q" type="search" autocomplete="off" placeholder="Search..." aria-label="글 검색"></form>
</div></header>`;
}

export function renderFooter(site: Site): string {
  return `<footer class="site-footer">${site.footer.map(line => `<span>${e(line)}</span>`).join('')}</footer>`;
}
export const menuMask = '<div class="site-mask" aria-hidden="true" hidden></div>';

import type { Site, Profile } from '../../scripts/site/data.ts';
import { escapeHtml as e } from '../shared/html.ts';
import type { Post } from './list.ts';
import { normalizeTags, tagUrl } from './tags.ts';

export function renderSidebar(site: Site, profile: Profile, url: string): string {
  const isTags = url === '/blog/tags/' || url.startsWith('/blog/categories/');
  return `<aside class="blog-sidebar" id="blog-sidebar" aria-label="블로그 탐색">
    <div>
      <button type="button" class="blog-menu-close" aria-label="메뉴 닫기" hidden>×</button>
      <a class="blog-avatar" href="/" aria-label="${e(profile.name)} 포트폴리오"><img src="${e(profile.avatar)}" alt="${e(profile.avatarAlt)}" width="112" height="112"></a>
      <a class="blog-name" href="/">${e(profile.name)}</a>
      <p class="blog-name-en">${e(profile.nameEn)}</p>
      <p class="blog-role">${e(profile.role)}</p>
      <p class="blog-tagline">${e(profile.tagline)}</p>
      <a class="blog-resume" href="${e(site.resume.href)}" target="_blank" rel="noopener">${e(site.resume.label)} <span aria-hidden="true">→</span><span class="sr-only"> (새 탭에서 열림)</span></a>
      <nav class="blog-nav" aria-label="블로그">
        <a href="/">포트폴리오</a>
        <a href="/blog/posts/"${!isTags ? ' aria-current="' + (url === '/blog/posts/' ? 'page' : 'location') + '"' : ''}>글 목록</a>
        <a href="/blog/tags/"${isTags ? ' aria-current="page"' : ''}>태그</a>
      </nav>
    </div>
    <div class="blog-social">${site.social.map(link => `<a href="${e(link.href)}"${link.href.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener"'}>${e(link.label)}${link.href.startsWith('mailto:') ? '' : '<span class="sr-only"> (새 탭에서 열림)</span>'}</a>`).join('')}</div>
  </aside>`;
}

export function renderPanel(posts: readonly Post[]): string {
  const recent = [...posts].reverse().slice(0, 5);
  const tags = [...new Set(posts.flatMap(post => normalizeTags(post.data.tags)))].sort((a, b) => a.localeCompare(b, 'ko'));
  return `<aside class="blog-panel" aria-label="글 바로가기">
    <section><h2>최근 글</h2><ul class="blog-recent">${recent.map(post => `<li><a href="${e(post.url)}" title="${e(post.data.title)}">${e(post.data.title)}</a></li>`).join('')}</ul></section>
    <section><h2>태그</h2><ul class="post-tags">${tags.map(tag => `<li><a href="${tagUrl(tag)}">${e(tag)}</a></li>`).join('')}</ul></section>
  </aside>`;
}

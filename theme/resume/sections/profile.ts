import type { Profile } from '../../../scripts/resume/data.ts';
import { escapeHtml as e } from '../html.ts';

export function renderProfile(profile: Profile): string {
  return `  <div class="head">
    <div>
      <h1>${e(profile.name)} <span class="en">${e(profile.nameEn)}</span></h1>
      <div class="role">${e(profile.role)}</div>
    </div>
    <div class="contact">
      <div><a href="mailto:${e(profile.email)}">${e(profile.email)}</a></div>
    </div>
  </div>

  <p class="summary">${e(profile.summary)}</p>`;
}

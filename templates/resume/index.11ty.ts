import { loadResume } from '../../scripts/resume/data.ts';
import { projectRoot } from '../../scripts/site/data.ts';
import { renderResume } from './layout.ts';
export const data = { permalink: '/resume/index.html', eleventyExcludeFromCollections: true };
export default async function () { return renderResume(await loadResume(projectRoot)); }

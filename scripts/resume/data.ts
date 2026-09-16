import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

const text = z.string().trim().min(1);
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM 형식이어야 합니다');
const url = z.url({ protocol: /^https?$/ });
const period = { start: month, end: month.nullable() };
const validPeriod = (value: { start: string; end: string | null }) =>
  value.end === null || value.start <= value.end;
const periodError = { message: '종료일은 시작일보다 빠를 수 없습니다', path: ['end'] };

export const profileSchema = z.strictObject({
  name: text, nameEn: text, role: text, email: z.email(), summary: text,
});
export const siteSchema = z.strictObject({
  title: text, description: text, socialDescription: text, url,
});
export const historySchema = z.strictObject({
  title: text, ...period, points: z.array(text).default([]),
}).refine(validPeriod, periodError);
export const groupSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/), order: z.number().int().nonnegative(),
  label: text, title: text, description: text,
});
export const sectionsSchema = z.strictObject({
  historyTitle: text, projectsTitle: text, groups: z.array(groupSchema),
});
export const projectSchema = z.strictObject({
  group: text, order: z.number().int().nonnegative(), title: text,
  url: url.optional(), ...period, stack: z.array(text).min(1), impact: text,
  points: z.array(z.strictObject({ label: text, text })).min(1),
  visible: z.boolean().default(true),
}).refine(validPeriod, periodError);

export type Profile = z.infer<typeof profileSchema>;
export type Site = z.infer<typeof siteSchema>;
export type HistoryEntry = z.infer<typeof historySchema>;
export type Group = z.infer<typeof groupSchema>;
export type Project = z.infer<typeof projectSchema> & { id: string };
export interface ResumeData {
  site: Site;
  profile: Profile;
  history: HistoryEntry[];
  sections: z.infer<typeof sectionsSchema>;
  projects: Project[];
}

async function readJson<T>(root: string, file: string, schema: z.ZodType<T>): Promise<T> {
  try {
    return schema.parse(JSON.parse(await readFile(join(root, file), 'utf8')));
  } catch (error) {
    throw new Error(`${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function loadResume(root: string): Promise<ResumeData> {
  const [site, profile, experience, education, sections, files] = await Promise.all([
    readJson(root, 'data/site/resume.json', siteSchema),
    readJson(root, 'data/profile/resume.json', profileSchema),
    readJson(root, 'data/portfolio/experience.json', z.array(historySchema)),
    readJson(root, 'data/portfolio/education.json', z.array(historySchema)),
    readJson(root, 'data/portfolio/resume.json', sectionsSchema),
    readdir(join(root, 'data/portfolio/projects')).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    }),
  ]);
  const groups = new Set(sections.groups.map(group => group.id));
  if (groups.size !== sections.groups.length) {
    throw new Error('data/portfolio/resume.json: 프로젝트 그룹 id가 중복됩니다');
  }
  const projects = await Promise.all(files.filter(file => file.endsWith('.json')).sort().map(async file => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(file)) {
      throw new Error(`data/portfolio/projects/${file}: 파일명은 영문 소문자·숫자·하이픈을 사용하세요`);
    }
    const project = await readJson(root, `data/portfolio/projects/${file}`, projectSchema);
    if (!groups.has(project.group)) {
      throw new Error(`data/portfolio/projects/${file}: 알 수 없는 그룹 '${project.group}'`);
    }
    return { ...project, id: file.slice(0, -5) };
  }));
  return {
    site, profile,
    history: [...experience, ...education].sort((a, b) =>
      (b.end ?? '9999-12').localeCompare(a.end ?? '9999-12') ||
      b.start.localeCompare(a.start) || a.title.localeCompare(b.title)),
    sections: { ...sections, groups: sections.groups.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)) },
    projects: projects.filter(project => project.visible)
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
  };
}

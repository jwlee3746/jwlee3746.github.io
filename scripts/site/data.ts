import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const text = z.string().min(1);
export const href = text.refine(value => {
  if (/\s|\\/.test(value)) return false;
  if (/^\/(?!\/)/.test(value) || /^#[a-z][a-z0-9-]*$/i.test(value)) return true;
  try { return ['https:', 'http:', 'mailto:'].includes(new URL(value).protocol); } catch { return false; }
}, '안전한 사이트 경로 또는 http(s)/mailto URL이어야 합니다');
const image = text.regex(/^\/data\/images\/[a-zA-Z0-9/_.-]+$/);
const link = z.strictObject({ label: text, href });
const person = z.strictObject({
  '@context': z.literal('https://schema.org'), '@type': z.literal('Person'),
  name: text, alternateName: text, url: href, jobTitle: text,
  worksFor: z.strictObject({ '@type': z.literal('Organization'), name: text }),
  alumniOf: z.strictObject({ '@type': z.literal('CollegeOrUniversity'), name: text }),
  sameAs: z.array(href),
});
export const siteSchema = z.strictObject({
  title: text, description: text, socialDescription: text, url: href, schema: person,
  resume: link, sections: z.array(link), navigation: z.array(link.extend({ icon: text })),
  social: z.array(link), featured: z.array(link), categories: z.array(link), footer: z.array(text),
});
export const profileSchema = z.strictObject({
  name: text, nameEn: text, role: text, tagline: text, github: href, avatar: image, avatarAlt: text,
});
export const portfolioSchema = z.strictObject({
  about: z.array(z.union([text, z.strictObject({ strong: text })])),
  headings: z.strictObject({ about: text, experience: text, projects: text, writing: text }),
  experience: z.array(z.strictObject({
    date: text, title: text, description: text, id: text.regex(/^[a-z][a-z0-9-]*$/).optional(),
    kind: text.optional(), href: href.optional(),
  })),
  projects: z.array(z.strictObject({
    date: text, category: text, title: text, impact: text,
    points: z.array(z.strictObject({ label: text, text })), links: z.array(link),
  })),
  posts: z.array(z.strictObject({ href, image, category: text, title: text, description: text })),
  more: link,
});
export const errorSchema = z.strictObject({ title: text, heading: text, message: text, links: z.array(link) });
export type Site = z.infer<typeof siteSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Portfolio = z.infer<typeof portfolioSchema>;

export async function readData<T>(file: string, schema: z.ZodType<T>, root = projectRoot): Promise<T> {
  try { return schema.parse(JSON.parse(await readFile(resolve(root, file), 'utf8'))); }
  catch (error) { throw new Error(`${file}: ${error instanceof Error ? error.message : String(error)}`); }
}
export async function loadPortfolio(root = projectRoot) {
  const { site, profile, content } = await readData('data/home.json', z.strictObject({
    site: siteSchema, profile: profileSchema, content: portfolioSchema,
  }), root);
  return { site, profile, portfolio: content };
}

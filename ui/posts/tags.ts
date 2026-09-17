export function normalizeTags(tags?: string | string[]): string[] {
  const names = typeof tags === 'string' ? [tags] : tags ?? [];
  return [...new Set(names.map(tag => tag.trim()).filter(Boolean))];
}

export function tagAnchor(tag: string): string {
  // Stable, distinct fragments even for Korean, spaces, C++ and C#.
  return `tag-${Buffer.from(tag).toString('base64url')}`;
}

export function tagUrl(tag: string): string {
  return `/tags/#${tagAnchor(tag)}`;
}

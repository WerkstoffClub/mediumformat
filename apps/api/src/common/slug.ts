/** URL slug from a display name: "Bengkel Space SCBD" → "bengkel-space-scbd". */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'item';
}

/** First free slug: base, base-2, base-3 … `taken` checks the DB. */
export async function uniqueSlug(base: string, taken: (slug: string) => Promise<boolean>): Promise<string> {
  const root = slugify(base);
  for (let n = 1; n < 100; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    if (!(await taken(candidate))) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/** Rolling window start, e.g. 30 days back from now. */
export const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

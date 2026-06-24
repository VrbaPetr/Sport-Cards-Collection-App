import { transliterate } from 'transliteration';

export function toSlug(text: string): string {
  return transliterate(text)
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function uniqueSlug(
  candidate: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!(await exists(candidate))) return candidate;
  let counter = 2;
  while (await exists(`${candidate}-${counter}`)) {
    counter++;
  }
  return `${candidate}-${counter}`;
}

const NOT_SLUG_CHARACTER = /[^\p{Letter}\p{Mark}\p{Number}\p{Connector_Punctuation} -]/gu;
const EMPTY_SLUG_FALLBACK = 'section';

export function slugify(text: string): string {
  return text.toLowerCase().replace(NOT_SLUG_CHARACTER, '').replace(/ /g, '-');
}

export function createSlugger(): (text: string) => string {
  const counts = new Map<string, number>();
  return function uniqueSlug(text: string): string {
    const base = slugify(text.trim()) || EMPTY_SLUG_FALLBACK;
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    if (seen === 0) {
      return base;
    }
    return `${base}-${seen}`;
  };
}

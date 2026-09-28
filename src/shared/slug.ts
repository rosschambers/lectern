const NOT_SLUG_CHARACTER = /[^\p{Letter}\p{Mark}\p{Number}\p{Connector_Punctuation} -]/gu;
const EMPTY_SLUG_FALLBACK = 'section';

export function slugify(text: string): string {
  return text.toLowerCase().replace(NOT_SLUG_CHARACTER, '').replace(/ /g, '-');
}

export function createSlugger(): (text: string) => string {
  // github-slugger semantics: keep deduplicating against every slug already handed
  // out, not just the base form, so a later heading that literally spells out a
  // previously deduplicated slug (for example "Overview 1" after two "Overview"
  // headings) still gets its own unique id instead of colliding.
  const occurrences = new Map<string, number>();
  return function uniqueSlug(text: string): string {
    const original = slugify(text.trim()) || EMPTY_SLUG_FALLBACK;
    let result = original;
    while (occurrences.has(result)) {
      const count = (occurrences.get(original) ?? 0) + 1;
      occurrences.set(original, count);
      result = `${original}-${count}`;
    }
    occurrences.set(result, 0);
    return result;
  };
}

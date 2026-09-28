export interface FrontmatterSplit {
  frontmatter: string | null;
  body: string;
}

const OPENING_FENCE = /^---[ \t]*\r?\n/;
const CLOSING_FENCE = /^(?:---|\.\.\.)[ \t]*\r?$/m;
const BYTE_ORDER_MARK = '\uFEFF';

export function splitFrontmatter(text: string): FrontmatterSplit {
  const source = text.startsWith(BYTE_ORDER_MARK) ? text.slice(1) : text;
  const opening = OPENING_FENCE.exec(source);
  if (opening === null) {
    return { frontmatter: null, body: text };
  }
  const rest = source.slice(opening[0].length);
  const closing = CLOSING_FENCE.exec(rest);
  if (closing === null) {
    return { frontmatter: null, body: text };
  }
  const frontmatter = rest.slice(0, closing.index).replace(/\r?\n$/, '').replace(/\r\n/g, '\n');
  const body = rest.slice(closing.index + closing[0].length).replace(/^\n/, '');
  return { frontmatter, body };
}

import type { Token } from 'markdown-it';

export interface OutlineEntry {
  level: number;
  text: string;
  id: string;
}

const TEXT_CHILD_TYPES = new Set(['text', 'code_inline']);

export function inlineText(inline: Token | undefined): string {
  if (inline === undefined) {
    return '';
  }
  if (inline.children === null) {
    return inline.content;
  }
  return inline.children
    .map((child) => {
      if (TEXT_CHILD_TYPES.has(child.type)) {
        return child.content;
      }
      if (child.type === 'softbreak' || child.type === 'hardbreak') {
        return ' ';
      }
      return '';
    })
    .join('')
    .trim();
}

export function buildOutline(tokens: readonly Token[]): OutlineEntry[] {
  const entries: OutlineEntry[] = [];
  tokens.forEach((token, index) => {
    if (token.type !== 'heading_open') {
      return;
    }
    entries.push({
      level: Number(token.tag.slice(1)),
      text: inlineText(tokens[index + 1]),
      id: String(token.attrGet('id') ?? ''),
    });
  });
  return entries;
}

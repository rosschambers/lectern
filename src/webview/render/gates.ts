import type { MarkdownIt, StateBlock } from 'markdown-it';

const OPENING_TAG = /^<([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*)>\s*$/;
const GATE_OPEN = 'lectern_gate_open';
const GATE_CLOSE = 'lectern_gate_close';

function escapeAttribute(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function lineText(state: StateBlock, line: number): string {
  return state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
}

function gateRule(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  if (state.sCount[startLine] - state.blkIndent >= 4) {
    return false;
  }
  const match = OPENING_TAG.exec(lineText(state, startLine));
  if (match === null) {
    return false;
  }
  const tagName = match[1] ?? '';
  const closingTag = `</${tagName}>`;
  let closeLine = startLine + 1;
  while (closeLine < endLine && lineText(state, closeLine).trim() !== closingTag) {
    closeLine += 1;
  }
  if (closeLine >= endLine) {
    return false;
  }
  if (silent) {
    return true;
  }

  const previousParentType = state.parentType;
  const previousLineMax = state.lineMax;
  state.parentType = 'lectern_gate';
  state.lineMax = closeLine;

  const openToken = state.push(GATE_OPEN, 'div', 1);
  openToken.block = true;
  openToken.info = tagName;
  openToken.markup = match[0];
  openToken.map = [startLine, closeLine + 1];

  state.md.block.tokenize(state, startLine + 1, closeLine);

  const closeToken = state.push(GATE_CLOSE, 'div', -1);
  closeToken.block = true;
  closeToken.markup = closingTag;

  state.parentType = previousParentType;
  state.lineMax = previousLineMax;
  state.line = closeLine + 1;
  return true;
}

export function gatesPlugin(markdown: MarkdownIt): void {
  markdown.block.ruler.before('html_block', 'lectern_gate', gateRule, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  });
  markdown.renderer.rules[GATE_OPEN] = (tokens, index) => {
    const tagName = tokens[index]?.info ?? '';
    return `<div class="gate" data-gate="${escapeAttribute(tagName)}"><div class="gate-label">${escapeAttribute(tagName.replace(/-/g, ' '))}</div>\n`;
  };
  markdown.renderer.rules[GATE_CLOSE] = () => '</div>\n';
}

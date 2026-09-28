import type { MarkdownIt, StateCore, Token } from 'markdown-it';

const TASK_MARKER = /^\[([ xX])\]\s+/;

function findParentList(tokens: Token[], listItemIndex: number): Token | undefined {
  const listItem = tokens[listItemIndex];
  if (listItem === undefined) {
    return undefined;
  }
  for (let index = listItemIndex - 1; index >= 0; index -= 1) {
    const candidate = tokens[index];
    if (
      candidate !== undefined &&
      (candidate.type === 'bullet_list_open' || candidate.type === 'ordered_list_open') &&
      candidate.level === listItem.level - 1
    ) {
      return candidate;
    }
  }
  return undefined;
}

function taskRule(state: StateCore): void {
  const tokens = state.tokens;
  for (let index = 2; index < tokens.length; index += 1) {
    const inline = tokens[index];
    if (inline?.type !== 'inline' || tokens[index - 1]?.type !== 'paragraph_open' || tokens[index - 2]?.type !== 'list_item_open') {
      continue;
    }
    const match = TASK_MARKER.exec(inline.content);
    const firstChild = inline.children?.[0];
    if (match === null || firstChild === undefined || firstChild.type !== 'text' || inline.children === null) {
      continue;
    }
    const checked = match[1] !== ' ';
    firstChild.content = firstChild.content.replace(TASK_MARKER, '');
    const checkbox = new state.Token('html_inline', '', 0);
    checkbox.content = `<input type="checkbox" class="task-checkbox" disabled${checked ? ' checked' : ''}> `;
    inline.children.unshift(checkbox);
    tokens[index - 2]?.attrJoin('class', checked ? 'task-item done' : 'task-item');
    const parentList = findParentList(tokens, index - 2);
    if (parentList !== undefined && !String(parentList.attrGet('class') ?? '').includes('task-list')) {
      parentList.attrJoin('class', 'task-list');
    }
  }
}

export function tasksPlugin(markdown: MarkdownIt): void {
  markdown.core.ruler.push('lectern_tasks', taskRule);
}

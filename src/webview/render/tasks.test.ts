import markdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { tasksPlugin } from './tasks';

function render(source: string): string {
  return markdownIt().use(tasksPlugin).render(source);
}

describe('tasksPlugin', () => {
  it('renders unchecked and checked items', () => {
    const html = render('- [ ] a\n- [x] b\n- [X] c\n');
    expect(html).toContain('<ul class="task-list">');
    expect(html).toContain('<li class="task-item"><input type="checkbox" class="task-checkbox" disabled> a</li>');
    expect(html).toContain('<li class="task-item done"><input type="checkbox" class="task-checkbox" disabled checked> b</li>');
    expect(html).toContain('<li class="task-item done"><input type="checkbox" class="task-checkbox" disabled checked> c</li>');
  });

  it('leaves ordinary brackets alone', () => {
    const html = render('- see [ ] here\n\nparagraph [ ] text\n');
    expect(html).not.toContain('checkbox');
    expect(html).not.toContain('task-list');
  });

  it('marks nested bullet lists and a separate ordered list as task lists', () => {
    const html = render('- [ ] outer\n  - [x] inner\n\n1. [ ] first\n');
    const bulletListOpenCount = html.match(/<ul class="task-list">/g)?.length ?? 0;
    expect(bulletListOpenCount).toBe(2);
    expect(html).toContain('<li class="task-item done"><input type="checkbox" class="task-checkbox" disabled checked> inner</li>');
    expect(html).toContain('<ol class="task-list">');
  });
});

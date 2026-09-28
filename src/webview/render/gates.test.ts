import markdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { gatesPlugin } from './gates';

function render(source: string): string {
  return markdownIt({ html: true }).use(gatesPlugin).render(source);
}

describe('gatesPlugin', () => {
  it('turns a gate tag into a labelled callout with parsed markdown', () => {
    const html = render('<HARD-GATE>\nSTOP and confirm:\n\n- one\n- two\n</HARD-GATE>\n');
    expect(html).toContain('<div class="gate" data-gate="HARD-GATE"><div class="gate-label">HARD GATE</div>');
    expect(html).toContain('<li>one</li>');
    expect(html.trim().endsWith('</div>')).toBe(true);
  });

  it('parses inline markdown directly after the tag and interrupts paragraphs', () => {
    const html = render('intro text\n<EXTREMELY-IMPORTANT>\n**bold**\n</EXTREMELY-IMPORTANT>\n');
    expect(html).toContain('<p>intro text</p>');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('ignores lowercase html, code fences, and unclosed tags', () => {
    expect(render('<details>\nx\n</details>\n')).not.toContain('class="gate"');
    expect(render('```\n<HARD-GATE>\nx\n</HARD-GATE>\n```\n')).not.toContain('class="gate"');
    const unclosed = render('<HARD-GATE>\ntext\n\nafter\n');
    expect(unclosed).not.toContain('class="gate"');
    expect(unclosed).toContain('after');
  });
});

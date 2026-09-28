import { describe, expect, it } from 'vitest';
import { createRenderer } from './renderer';

const render = createRenderer({ imageBaseUri: 'https://webview/base/' });

describe('headings and outline', () => {
  it('adds ids and anchors', () => {
    expect(render('# Add Exocortex Project').html).toContain(
      '<h1 id="add-exocortex-project"><a class="anchor" href="#add-exocortex-project" aria-hidden="true">#</a>Add Exocortex Project</h1>',
    );
  });

  it('builds an H1 to H6 outline with unique ids and inline code text', () => {
    const { outline } = render('# A\n## B `code`\n### C\n#### D\n##### E\n###### F\n## B `code`\n');
    expect(outline.map((entry) => entry.level)).toEqual([1, 2, 3, 4, 5, 6, 2]);
    expect(outline[1]).toEqual({ level: 2, text: 'B code', id: 'b-code' });
    expect(outline[6]?.id).toBe('b-code-1');
  });

  it('ignores hash lines inside code fences', () => {
    expect(render('```bash\n# comment\n```\n\n## Real\n').outline).toEqual([{ level: 2, text: 'Real', id: 'real' }]);
  });

  it('never gives two headings the same id, even when a later heading spells out a deduplicated slug', () => {
    const { outline } = render('# Overview\n# Overview\n# Overview 1\n');
    expect(outline.map((entry) => entry.id)).toEqual(['overview', 'overview-1', 'overview-1-1']);
  });

  it('renders CRLF exactly like LF', () => {
    const source = '---\na: 1\n---\n# T\n\n- [ ] x\n\n```dot\ndigraph { a -> b }\n```\n';
    expect(render(source.replace(/\n/g, '\r\n'))).toEqual(render(source));
  });
});

describe('blocks', () => {
  it('renders frontmatter as highlighted YAML, never as a rule or heading', () => {
    const { html, outline } = render('---\nname: x\n---\n# T\n');
    expect(html.startsWith('<pre class="frontmatter"><code class="hljs language-yaml">')).toBe(true);
    expect(html).not.toContain('<hr');
    expect(outline).toEqual([{ level: 1, text: 'T', id: 't' }]);
    expect(render('---\n---\n# T\n').html).not.toContain('frontmatter');
  });

  it('emits diagram placeholders with escaped source', () => {
    const mermaid = render('```mermaid\ngraph TD; A-->B\n```\n').html;
    expect(mermaid).toContain('<div class="diagram diagram-mermaid" data-diagram-kind="mermaid" data-diagram-status="pending"><pre class="diagram-source">graph TD; A--&gt;B\n</pre></div>');
    for (const language of ['dot', 'graphviz', 'digraph', 'gv']) {
      expect(render(`\`\`\`${language}\ndigraph { a -> b }\n\`\`\`\n`).html).toContain('data-diagram-kind="graphviz"');
    }
  });

  it('unescapes html entities in a fence info string before choosing the diagram kind', () => {
    expect(render('```&#x64;ot\ndigraph { a -> b }\n```\n').html).toContain('data-diagram-kind="graphviz"');
  });

  it('highlights known languages and escapes unknown ones', () => {
    expect(render('```ts\nconst a = 1;\n```\n').html).toMatch(/<pre><code class="hljs language-ts">.*hljs-keyword/s);
    expect(render('```nosuchlanguage\n<b>\n```\n').html).toContain('<code class="hljs language-nosuchlanguage">&lt;b&gt;\n</code>');
  });

  it('escapes unlabeled fences beyond the auto-highlight length bound instead of auto-detecting', () => {
    const body = '<>'.repeat(10000); // 20,000 characters; the fence content becomes 20,001 with the closing newline
    const html = render(`\`\`\`\n${body}\n\`\`\`\n`).html;
    expect(html).toContain(`<code class="hljs">${'&lt;&gt;'.repeat(10000)}\n</code>`);
    expect(html).not.toContain('hljs-');
  });

  it('rebases relative images only', () => {
    expect(render('![a](images/one.png)').html).toContain('src="https://webview/base/images/one.png"');
    expect(render('![a](https://example.com/x.png)').html).toContain('src="https://example.com/x.png"');
    expect(render('![a](data:image/png;base64,AAAA)').html).toContain('src="data:image/png;base64,AAAA"');
  });

  it('integrates gates and task lists', () => {
    const { html } = render('<HARD-GATE>\n- [x] done\n</HARD-GATE>\n');
    expect(html).toContain('class="gate"');
    expect(html).toContain('task-item done');
  });
});

describe('failure', () => {
  it('shows an error panel instead of throwing', () => {
    const exploding = createRenderer({
      imageBaseUri: '',
      plugins: [(markdown) => { markdown.core.ruler.push('explode', () => { throw new Error('boom'); }); }],
    });
    const result = exploding('# <T>');
    expect(result.html).toContain('<div class="render-error">');
    expect(result.html).toContain('boom');
    expect(result.html).toContain('# &lt;T&gt;');
    expect(result.outline).toEqual([]);
  });
});

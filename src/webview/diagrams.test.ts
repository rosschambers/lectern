// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mermaidThemeVariables, renderDiagrams, type DiagramLoaders } from './diagrams';
import { diagramPlaceholderHtml } from './render/renderer';

function mount(html: string): HTMLElement {
  document.body.innerHTML = `<article id="document">${html}</article>`;
  const root = document.getElementById('document');
  if (root === null) {
    throw new Error('mount failed');
  }
  return root;
}

function loaders(overrides: Partial<DiagramLoaders> = {}): DiagramLoaders {
  return {
    loadMermaid: vi.fn(async () => ({
      initialize: vi.fn(),
      render: vi.fn(async (_id: string, source: string) => {
        if (source.includes('broken')) {
          throw new Error('parse error');
        }
        return { svg: '<svg data-kind="mermaid"></svg>' };
      }),
    })),
    loadGraphviz: vi.fn(async () => ({ layout: () => '<svg data-kind="graphviz"></svg>' })),
    ...overrides,
  };
}

const context = { themeVariables: {}, isCancelled: () => false };

describe('renderDiagrams', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('does not load anything without placeholders', async () => {
    const fakeLoaders = loaders();
    await renderDiagrams(mount('<p>plain</p>'), { ...context, loaders: fakeLoaders });
    expect(fakeLoaders.loadMermaid).not.toHaveBeenCalled();
    expect(fakeLoaders.loadGraphviz).not.toHaveBeenCalled();
  });

  it('renders each diagram and isolates failures', async () => {
    const root = mount(
      diagramPlaceholderHtml('digraph { a -> b }', 'graphviz') +
        diagramPlaceholderHtml('graph TD; broken', 'mermaid') +
        diagramPlaceholderHtml('graph TD; A-->B', 'mermaid'),
    );
    await renderDiagrams(root, { ...context, loaders: loaders() });
    const blocks = Array.from(root.querySelectorAll<HTMLElement>('.diagram'));
    expect(blocks.map((block) => block.dataset.diagramStatus)).toEqual(['rendered', 'failed', 'rendered']);
    expect(blocks[1]?.classList.contains('diagram-error')).toBe(true);
    expect(blocks[1]?.textContent).toContain('parse error');
    expect(blocks[1]?.textContent).toContain('graph TD; broken');
    expect(blocks[2]?.innerHTML).toBe('<svg data-kind="mermaid"></svg>');
  });

  it('marks every diagram of a kind when its loader fails', async () => {
    const root = mount(diagramPlaceholderHtml('a', 'graphviz') + diagramPlaceholderHtml('b', 'graphviz'));
    const failing = loaders({ loadGraphviz: vi.fn(async () => { throw new Error('no wasm'); }) });
    await renderDiagrams(root, { ...context, loaders: failing });
    for (const block of root.querySelectorAll('.diagram')) {
      expect(block.textContent).toContain('Graphviz failed to load: no wasm');
    }
  });

  it('touches nothing once cancelled', async () => {
    const root = mount(diagramPlaceholderHtml('digraph { a }', 'graphviz'));
    await renderDiagrams(root, { themeVariables: {}, isCancelled: () => true, loaders: loaders() });
    expect(root.querySelector('.diagram')?.getAttribute('data-diagram-status')).toBe('pending');
  });
});

describe('mermaidThemeVariables', () => {
  it('maps VS Code variables and omits empty values', () => {
    const values: Record<string, string> = {
      '--vscode-editor-background': '#1f1f1f',
      '--vscode-editor-foreground': '#cccccc',
      '--vscode-font-family': 'Segoe UI',
    };
    const variables = mermaidThemeVariables((name) => values[name] ?? '', true);
    expect(variables).toEqual({ darkMode: true, background: '#1f1f1f', tertiaryColor: '#1f1f1f', primaryTextColor: '#cccccc', fontFamily: 'Segoe UI' });
  });
});

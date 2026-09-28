import { escapeHtml, type DiagramKind } from './render/renderer';

/* ---------- ports ---------- */

export interface MermaidApi {
  initialize(configuration: Record<string, unknown>): void;
  render(id: string, source: string): Promise<{ svg: string }>;
}

export interface GraphvizApi {
  layout(source: string, format: 'svg', engine: 'dot'): string;
}

export interface DiagramLoaders {
  loadMermaid(): Promise<MermaidApi>;
  loadGraphviz(): Promise<GraphvizApi>;
}

export interface DiagramRenderContext {
  loaders: DiagramLoaders;
  themeVariables: Record<string, string | boolean>;
  isCancelled(): boolean;
}

/* ---------- default loaders (lazy chunks) ---------- */

let graphvizInstance: Promise<GraphvizApi> | undefined;

export const defaultDiagramLoaders: DiagramLoaders = {
  async loadMermaid(): Promise<MermaidApi> {
    const module = await import('mermaid');
    return module.default as unknown as MermaidApi;
  },
  loadGraphviz(): Promise<GraphvizApi> {
    graphvizInstance ??= import('@hpcc-js/wasm-graphviz')
      .then((module) => module.Graphviz.load() as Promise<GraphvizApi>)
      .catch((error: unknown) => {
        graphvizInstance = undefined;
        throw error;
      });
    return graphvizInstance;
  },
};

/* ---------- theme ---------- */

const MERMAID_VARIABLE_SOURCES: Array<[string, string]> = [
  ['background', '--vscode-editor-background'],
  ['tertiaryColor', '--vscode-editor-background'],
  ['primaryColor', '--vscode-textCodeBlock-background'],
  ['primaryTextColor', '--vscode-editor-foreground'],
  ['primaryBorderColor', '--vscode-descriptionForeground'],
  ['lineColor', '--vscode-descriptionForeground'],
  ['secondaryColor', '--vscode-editorWidget-background'],
  ['fontFamily', '--vscode-font-family'],
];

export function mermaidThemeVariables(read: (name: string) => string, darkMode: boolean): Record<string, string | boolean> {
  const variables: Record<string, string | boolean> = { darkMode };
  for (const [mermaidName, cssName] of MERMAID_VARIABLE_SOURCES) {
    const value = read(cssName).trim();
    if (value !== '') {
      variables[mermaidName] = value;
    }
  }
  return variables;
}

/* ---------- rendering ---------- */

let mermaidRenderCounter = 0;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function showDiagramError(placeholder: HTMLElement, source: string, message: string): void {
  placeholder.classList.add('diagram-error');
  placeholder.dataset.diagramStatus = 'failed';
  placeholder.innerHTML = `<p class="diagram-error-message">${escapeHtml(message)}</p><pre><code class="hljs">${escapeHtml(source)}</code></pre>`;
}

function sourceOf(placeholder: HTMLElement): string {
  return placeholder.querySelector('.diagram-source')?.textContent ?? '';
}

export async function renderDiagrams(root: ParentNode, context: DiagramRenderContext): Promise<void> {
  const placeholders = Array.from(root.querySelectorAll<HTMLElement>('.diagram[data-diagram-status="pending"]'));
  if (placeholders.length === 0) {
    return;
  }
  const ofKind = (kind: DiagramKind): HTMLElement[] => placeholders.filter((element) => element.dataset.diagramKind === kind);
  const loaded: { mermaid?: MermaidApi; graphviz?: GraphvizApi } = {};

  if (ofKind('mermaid').length > 0) {
    try {
      loaded.mermaid = await context.loaders.loadMermaid();
      loaded.mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'base', themeVariables: context.themeVariables });
    } catch (error) {
      if (!context.isCancelled()) {
        ofKind('mermaid').forEach((placeholder) => showDiagramError(placeholder, sourceOf(placeholder), `Mermaid failed to load: ${messageOf(error)}`));
      }
    }
  }
  if (ofKind('graphviz').length > 0) {
    try {
      loaded.graphviz = await context.loaders.loadGraphviz();
    } catch (error) {
      if (!context.isCancelled()) {
        ofKind('graphviz').forEach((placeholder) => showDiagramError(placeholder, sourceOf(placeholder), `Graphviz failed to load: ${messageOf(error)}`));
      }
    }
  }

  // Sequential on purpose: mermaid's renderer must not be re-entered concurrently.
  for (const placeholder of placeholders) {
    if (context.isCancelled() || !placeholder.isConnected || placeholder.dataset.diagramStatus !== 'pending') {
      continue;
    }
    const source = sourceOf(placeholder);
    const renderIdentifier = `lectern-mermaid-${(mermaidRenderCounter += 1)}`;
    try {
      let svg: string;
      if (placeholder.dataset.diagramKind === 'graphviz') {
        if (loaded.graphviz === undefined) {
          continue;
        }
        svg = loaded.graphviz.layout(source, 'svg', 'dot');
      } else {
        if (loaded.mermaid === undefined) {
          continue;
        }
        svg = (await loaded.mermaid.render(renderIdentifier, source)).svg;
      }
      if (context.isCancelled() || !placeholder.isConnected) {
        continue;
      }
      placeholder.innerHTML = svg;
      placeholder.dataset.diagramStatus = 'rendered';
    } catch (error) {
      // mermaid leaves an orphaned error element in the body on a parse failure
      document.getElementById(`d${renderIdentifier}`)?.remove();
      if (!context.isCancelled() && placeholder.isConnected) {
        showDiagramError(placeholder, source, messageOf(error));
      }
    }
  }
}

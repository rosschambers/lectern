import DOMPurify from 'dompurify';
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
  /**
   * Cancel only when a new render is about to replace this DOM subtree.
   * A cancelled placeholder is left in the "pending" status rather than
   * being marked failed, so a subsequent render pass can pick it up again.
   */
  isCancelled(): boolean;
}

/* ---------- status ---------- */

export type DiagramStatus = 'pending' | 'rendered' | 'failed';

const DIAGRAM_STATUS_PENDING: DiagramStatus = 'pending';
const DIAGRAM_STATUS_RENDERED: DiagramStatus = 'rendered';
const DIAGRAM_STATUS_FAILED: DiagramStatus = 'failed';

function setDiagramStatus(placeholder: HTMLElement, status: DiagramStatus): void {
  placeholder.dataset.diagramStatus = status;
}

function diagramStatusOf(placeholder: HTMLElement): DiagramStatus | undefined {
  return placeholder.dataset.diagramStatus as DiagramStatus | undefined;
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
  setDiagramStatus(placeholder, DIAGRAM_STATUS_FAILED);
  placeholder.innerHTML = `<p class="diagram-error-message">${escapeHtml(message)}</p><pre><code class="hljs">${escapeHtml(source)}</code></pre>`;
}

// Graphviz output is untrusted SVG markup assigned straight to innerHTML: DOT lets a
// node carry a URL attribute (`URL="javascript:..."`) that graphviz renders as an
// <a xlink:href>, and a hand-crafted DOT source could smuggle a <script> element too.
// Sanitize with the SVG-only profile before it ever touches the DOM.
// Mermaid output is deliberately NOT sanitized here: mermaid's own "strict" security
// level already runs it through DOMPurify, and the SVG-only profile would strip the
// <foreignObject> HTML labels mermaid relies on for text rendering.
function sanitizeGraphvizSvg(svg: string): string {
  return DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
}

function sourceOf(placeholder: HTMLElement): string {
  return placeholder.querySelector('.diagram-source')?.textContent ?? '';
}

export async function renderDiagrams(root: ParentNode, context: DiagramRenderContext): Promise<void> {
  const placeholders = Array.from(
    root.querySelectorAll<HTMLElement>(`.diagram[data-diagram-status="${DIAGRAM_STATUS_PENDING}"]`),
  );
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
    if (context.isCancelled() || !placeholder.isConnected || diagramStatusOf(placeholder) !== DIAGRAM_STATUS_PENDING) {
      continue;
    }
    const source = sourceOf(placeholder);
    const kind = placeholder.dataset.diagramKind;
    if (kind !== 'graphviz' && kind !== 'mermaid') {
      showDiagramError(placeholder, source, `Unknown diagram kind: ${kind}`);
      continue;
    }
    // Only the mermaid branch needs a render identifier (mermaid.render() requires
    // one, and a failed render leaves an orphaned error element under it in the
    // document body that must be cleaned up); the counter must not advance for
    // graphviz diagrams, which do not use it.
    let mermaidRenderIdentifier: string | undefined;
    try {
      let svg: string;
      if (kind === 'graphviz') {
        if (loaded.graphviz === undefined) {
          continue;
        }
        svg = sanitizeGraphvizSvg(loaded.graphviz.layout(source, 'svg', 'dot'));
      } else {
        if (loaded.mermaid === undefined) {
          continue;
        }
        mermaidRenderIdentifier = `lectern-mermaid-${(mermaidRenderCounter += 1)}`;
        svg = (await loaded.mermaid.render(mermaidRenderIdentifier, source)).svg;
      }
      // A concurrent render pass may have cancelled this one, and may already have
      // called mermaid.initialize() again on the shared mermaid module-level state,
      // while the await above was in flight — re-check before trusting the output
      // and touching a DOM subtree that is about to be replaced or discarded.
      if (context.isCancelled() || !placeholder.isConnected) {
        continue;
      }
      placeholder.innerHTML = svg;
      setDiagramStatus(placeholder, DIAGRAM_STATUS_RENDERED);
    } catch (error) {
      // mermaid leaves an orphaned error element in the body on a parse failure
      if (mermaidRenderIdentifier !== undefined) {
        document.getElementById(`d${mermaidRenderIdentifier}`)?.remove();
      }
      if (!context.isCancelled() && placeholder.isConnected) {
        showDiagramError(placeholder, source, messageOf(error));
      }
    }
  }
}

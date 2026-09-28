import highlighter from 'highlight.js/lib/common';
import markdownIt, { type MarkdownIt } from 'markdown-it';
import { createSlugger } from '../../shared/slug';
import { splitFrontmatter } from './frontmatter';
import { gatesPlugin } from './gates';
import { buildOutline, inlineText, type OutlineEntry } from './outline';
import { tasksPlugin } from './tasks';

/* ---------- types ---------- */

export type DiagramKind = 'mermaid' | 'graphviz';

export interface RenderResult {
  html: string;
  outline: OutlineEntry[];
}

export interface RendererOptions {
  imageBaseUri: string;
  plugins?: Array<(markdown: MarkdownIt) => void>;
}

/* ---------- helpers ---------- */

const GRAPHVIZ_LANGUAGES = new Set(['dot', 'graphviz', 'digraph', 'gv']);
const NON_RELATIVE_URL = /^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/|#)/;
// highlight.js auto-detection tokenizes the source once per registered language and
// runs synchronously on the webview main thread, so an unbounded unlabeled fence can
// block rendering. Beyond this length, skip detection and show escaped plain text.
const AUTO_HIGHLIGHT_MAXIMUM_LENGTH = 20_000;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function highlightCode(source: string, language: string | undefined): string {
  if (language === undefined) {
    if (source.length > AUTO_HIGHLIGHT_MAXIMUM_LENGTH) {
      return escapeHtml(source);
    }
    return highlighter.highlightAuto(source).value;
  }
  if (highlighter.getLanguage(language) !== undefined) {
    return highlighter.highlight(source, { language, ignoreIllegals: true }).value;
  }
  return escapeHtml(source);
}

export function diagramKind(language: string): DiagramKind | null {
  if (language === 'mermaid') {
    return 'mermaid';
  }
  if (GRAPHVIZ_LANGUAGES.has(language)) {
    return 'graphviz';
  }
  return null;
}

export function diagramPlaceholderHtml(source: string, kind: DiagramKind): string {
  return `<div class="diagram diagram-${kind}" data-diagram-kind="${kind}" data-diagram-status="pending"><pre class="diagram-source">${escapeHtml(source)}</pre></div>\n`;
}

function renderErrorHtml(message: string, source: string): string {
  return `<div class="render-error"><p class="render-error-message">Lectern could not render this file: ${escapeHtml(message)}</p><pre>${escapeHtml(source)}</pre></div>`;
}

/* ---------- renderer ---------- */

export function createRenderer(options: RendererOptions): (text: string) => RenderResult {
  const markdown = markdownIt({ html: true, linkify: true });
  markdown.use(gatesPlugin).use(tasksPlugin);
  for (const plugin of options.plugins ?? []) {
    markdown.use(plugin);
  }

  markdown.core.ruler.push('lectern_heading_ids', (state) => {
    const uniqueSlug = createSlugger();
    state.tokens.forEach((token, index) => {
      if (token.type === 'heading_open') {
        token.attrSet('id', uniqueSlug(inlineText(state.tokens[index + 1])));
      }
    });
  });

  markdown.renderer.rules.heading_open = (tokens, index, rendererOptions, _environment, self) => {
    const id = String(tokens[index]?.attrGet('id') ?? '');
    return `${self.renderToken(tokens, index, rendererOptions)}<a class="anchor" href="#${escapeHtml(id)}" aria-hidden="true">#</a>`;
  };

  markdown.renderer.rules.fence = (tokens, index) => {
    const token = tokens[index];
    if (token === undefined) {
      return '';
    }
    const language = (markdown.utils.unescapeAll(token.info).trim().split(/\s+/)[0] ?? '').toLowerCase();
    const kind = diagramKind(language);
    if (kind !== null) {
      return diagramPlaceholderHtml(token.content, kind);
    }
    const languageClass = language === '' ? '' : ` language-${escapeHtml(language)}`;
    const highlighted = highlightCode(token.content, language === '' ? undefined : language);
    return `<pre><code class="hljs${languageClass}">${highlighted}</code></pre>\n`;
  };

  const defaultImageRule = markdown.renderer.rules.image;
  if (defaultImageRule === undefined) {
    throw new Error('markdown-it is missing its default image rule');
  }
  markdown.renderer.rules.image = (tokens, index, rendererOptions, environment, self) => {
    const attribute = tokens[index]?.attrGet('src');
    const source = attribute === null || attribute === undefined ? '' : String(attribute);
    if (source !== '' && !NON_RELATIVE_URL.test(source)) {
      tokens[index]?.attrSet('src', options.imageBaseUri + source);
    }
    return defaultImageRule(tokens, index, rendererOptions, environment, self);
  };

  return function render(text: string): RenderResult {
    try {
      const { frontmatter, body } = splitFrontmatter(text);
      const environment = {};
      const tokens = markdown.parse(body, environment);
      let frontmatterHtml = '';
      if (frontmatter !== null && frontmatter.trim() !== '') {
        frontmatterHtml = `<pre class="frontmatter"><code class="hljs language-yaml">${highlightCode(frontmatter, 'yaml')}</code></pre>\n`;
      }
      return {
        html: frontmatterHtml + markdown.renderer.render(tokens, markdown.options, environment),
        outline: buildOutline(tokens),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { html: renderErrorHtml(message, text), outline: [] };
    }
  };
}

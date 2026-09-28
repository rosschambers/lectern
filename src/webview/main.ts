// SPIKE (Task 4): replaced wholesale in Task 18. Proves the webview Content Security
// Policy allows lazy import() chunks, mermaid, and Graphviz WebAssembly.
import './reader.css';
import { isExtensionToWebviewMessage } from '../shared/messages';
import { getVsCodeApi } from './vscode-api';

const FENCE_PATTERN = /^```(mermaid|dot)[ \t]*\r?\n([\s\S]*?)^```/gm;

async function renderDiagramBlock(language: string, source: string, identifier: number, block: HTMLElement): Promise<void> {
  try {
    if (language === 'mermaid') {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
      block.innerHTML = (await mermaid.render(`spike-${identifier}`, source)).svg;
    } else {
      const { Graphviz } = await import('@hpcc-js/wasm-graphviz');
      block.innerHTML = (await Graphviz.load()).layout(source, 'svg', 'dot');
    }
    block.dataset.status = 'rendered';
  } catch (error) {
    block.textContent = `${language} failed: ${error instanceof Error ? error.message : String(error)}`;
    block.dataset.status = 'failed';
  }
}

async function renderSpike(text: string): Promise<void> {
  const root = document.getElementById('root');
  if (root === null) {
    return;
  }
  root.replaceChildren();
  const status = document.createElement('p');
  status.textContent = `Lectern spike: ${text.length} characters`;
  root.append(status);
  const normalizedText = text.replace(/\r\n/g, '\n');
  for (const match of normalizedText.matchAll(FENCE_PATTERN)) {
    const block = document.createElement('div');
    block.className = 'spike-diagram';
    root.append(block);
    await renderDiagramBlock(match[1] ?? '', match[2] ?? '', match.index ?? 0, block);
  }
  const raw = document.createElement('pre');
  raw.textContent = text;
  root.append(raw);
}

window.addEventListener('message', (event: MessageEvent<unknown>) => {
  const message = event.data;
  if (!isExtensionToWebviewMessage(message)) {
    return;
  }
  if (message.type === 'document' || message.type === 'update') {
    void renderSpike(message.text);
  }
});

getVsCodeApi().postMessage({ type: 'ready' });

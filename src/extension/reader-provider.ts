import { randomBytes } from 'node:crypto';
import * as vscode from 'vscode';
import {
  isWebviewToExtensionMessage,
  type ExtensionToWebviewMessage,
  type WebviewToExtensionMessage,
} from '../shared/messages';
import { buildWebviewHtml } from './webview-html';

export const READER_VIEW_TYPE = 'lectern.reader';
const UPDATE_DEBOUNCE_MILLISECONDS = 150;
const SPIKE_CONTENTS_WIDTH = 190; // replaced by the contents store in Task 19

export class ReaderProvider implements vscode.CustomTextEditorProvider {
  private readonly panelsByDocument = new Map<string, Set<vscode.WebviewPanel>>();

  public constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(document: vscode.TextDocument, panel: vscode.WebviewPanel): Promise<void> {
    const webviewRoot = vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview');
    const documentFolder = vscode.Uri.joinPath(document.uri, '..');
    const workspaceRoots = (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri);
    panel.webview.options = { enableScripts: true, localResourceRoots: [webviewRoot, documentFolder, ...workspaceRoots] };
    panel.webview.html = buildWebviewHtml({
      nonce: randomBytes(16).toString('base64'),
      cspSource: panel.webview.cspSource,
      scriptUri: panel.webview.asWebviewUri(vscode.Uri.joinPath(webviewRoot, 'main.js')).toString(),
      styleUri: panel.webview.asWebviewUri(vscode.Uri.joinPath(webviewRoot, 'main.css')).toString(),
    });

    const documentKey = document.uri.toString();
    this.trackPanel(documentKey, panel);

    let pendingUpdate: ReturnType<typeof setTimeout> | undefined;
    let changeSubscription: vscode.Disposable | undefined;
    let messageSubscription: vscode.Disposable | undefined;

    panel.onDidDispose(() => {
      if (pendingUpdate !== undefined) {
        clearTimeout(pendingUpdate);
      }
      changeSubscription?.dispose();
      messageSubscription?.dispose();
      this.untrackPanel(documentKey, panel);
    });

    function post(message: ExtensionToWebviewMessage): void {
      void panel.webview.postMessage(message);
    }

    changeSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() !== documentKey) {
        return;
      }
      if (pendingUpdate !== undefined) {
        clearTimeout(pendingUpdate);
      }
      pendingUpdate = setTimeout(() => {
        pendingUpdate = undefined;
        post({ type: 'update', text: document.getText() });
      }, UPDATE_DEBOUNCE_MILLISECONDS);
    });

    messageSubscription = panel.webview.onDidReceiveMessage((message: unknown) => {
      if (!isWebviewToExtensionMessage(message)) {
        console.warn('lectern: ignoring unknown webview message', message);
        return;
      }
      this.handleMessage(message, document, panel, post);
    });
  }

  /* ---------- messages ---------- */

  private handleMessage(
    message: WebviewToExtensionMessage,
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel,
    post: (message: ExtensionToWebviewMessage) => void,
  ): void {
    switch (message.type) {
      case 'ready':
        post({
          type: 'document',
          text: document.getText(),
          imageBaseUri: `${panel.webview.asWebviewUri(vscode.Uri.joinPath(document.uri, '..')).toString()}/`,
          contents: { width: SPIKE_CONTENTS_WIDTH, visible: true },
          defaultContentsWidth: SPIKE_CONTENTS_WIDTH,
          fragment: null,
        });
        return;
      case 'open-link':
      case 'contents-changed':
        return; // wired in Task 19
    }
  }

  /* ---------- panel registry ---------- */

  private trackPanel(documentKey: string, panel: vscode.WebviewPanel): void {
    const panels = this.panelsByDocument.get(documentKey) ?? new Set<vscode.WebviewPanel>();
    panels.add(panel);
    this.panelsByDocument.set(documentKey, panels);
  }

  private untrackPanel(documentKey: string, panel: vscode.WebviewPanel): void {
    const panels = this.panelsByDocument.get(documentKey);
    panels?.delete(panel);
    if (panels !== undefined && panels.size === 0) {
      this.panelsByDocument.delete(documentKey);
    }
  }
}

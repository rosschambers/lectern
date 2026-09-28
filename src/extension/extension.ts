import * as vscode from 'vscode';
import { registerSourceCommands } from './commands';
import { READER_VIEW_TYPE, ReaderProvider } from './reader-provider';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new ReaderProvider(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(READER_VIEW_TYPE, provider, {
      supportsMultipleEditorsPerDocument: true,
    }),
    ...registerSourceCommands(),
  );
}

export function deactivate(): void {}

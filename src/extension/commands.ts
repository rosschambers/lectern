import * as vscode from 'vscode';
import { READER_VIEW_TYPE } from './reader-provider';

const TEXT_EDITOR_VIEW_TYPE = 'default';

/* ---------- tab helpers ---------- */

function activeResourceUri(): vscode.Uri | undefined {
  const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
  if (input instanceof vscode.TabInputCustom || input instanceof vscode.TabInputText) {
    return input.uri;
  }
  return vscode.window.activeTextEditor?.document.uri;
}

function isSameEditor(tab: vscode.Tab, previous: vscode.Tab): boolean {
  const input = tab.input;
  const previousInput = previous.input;
  if (input instanceof vscode.TabInputCustom && previousInput instanceof vscode.TabInputCustom) {
    return input.viewType === previousInput.viewType && input.uri.toString() === previousInput.uri.toString();
  }
  if (input instanceof vscode.TabInputText && previousInput instanceof vscode.TabInputText) {
    return input.uri.toString() === previousInput.uri.toString();
  }
  return false;
}

async function reopenWith(uriArgument: unknown, viewType: string, toSide: boolean): Promise<void> {
  const uri = uriArgument instanceof vscode.Uri ? uriArgument : activeResourceUri();
  if (uri === undefined) {
    void vscode.window.showInformationMessage('Lectern: no markdown file is active.');
    return;
  }
  const group = vscode.window.tabGroups.activeTabGroup;
  const previousTab = group.activeTab;
  const viewColumn = toSide ? vscode.ViewColumn.Beside : group.viewColumn;
  await vscode.commands.executeCommand('vscode.openWith', uri, viewType, { viewColumn, preview: false });
  if (toSide || previousTab === undefined) {
    return;
  }
  // Close the editor we came from if VS Code kept it next to the new one, so the
  // group holds exactly one tab for this resource.
  const leftover = group.tabs.find((tab) => !tab.isActive && isSameEditor(tab, previousTab));
  if (leftover !== undefined) {
    await vscode.window.tabGroups.close(leftover);
  }
}

/* ---------- registration ---------- */

export function registerSourceCommands(): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('lectern.editSource', (uri: unknown) => reopenWith(uri, TEXT_EDITOR_VIEW_TYPE, false)),
    vscode.commands.registerCommand('lectern.editSourceToSide', (uri: unknown) => reopenWith(uri, TEXT_EDITOR_VIEW_TYPE, true)),
    vscode.commands.registerCommand('lectern.openInLectern', (uri: unknown) => reopenWith(uri, READER_VIEW_TYPE, false)),
  ];
}

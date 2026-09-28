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

function tabResourceUri(tab: vscode.Tab): vscode.Uri | undefined {
  const input = tab.input;
  if (input instanceof vscode.TabInputCustom || input instanceof vscode.TabInputText) {
    return input.uri;
  }
  return undefined;
}

function groupHasResource(group: vscode.TabGroup, uri: vscode.Uri): boolean {
  return group.tabs.some((tab) => tabResourceUri(tab)?.toString() === uri.toString());
}

function findGroupContaining(uri: vscode.Uri): vscode.TabGroup | undefined {
  const activeGroup = vscode.window.tabGroups.activeTabGroup;
  if (groupHasResource(activeGroup, uri)) {
    return activeGroup;
  }
  return vscode.window.tabGroups.all.find((group) => groupHasResource(group, uri));
}

function determineViewColumn(group: vscode.TabGroup | undefined, toSide: boolean): vscode.ViewColumn {
  if (toSide) {
    return vscode.ViewColumn.Beside;
  }
  if (group !== undefined) {
    return group.viewColumn;
  }
  return vscode.ViewColumn.Active;
}

async function reopenWith(uriArgument: unknown, viewType: string, toSide: boolean): Promise<void> {
  const uri = uriArgument instanceof vscode.Uri ? uriArgument : activeResourceUri();
  if (uri === undefined) {
    void vscode.window.showInformationMessage('Lectern: no markdown file is active.');
    return;
  }
  const group = findGroupContaining(uri);
  const viewColumn = determineViewColumn(group, toSide);
  try {
    await vscode.commands.executeCommand('vscode.openWith', uri, viewType, { viewColumn, preview: false });
    if (group === undefined) {
      return;
    }
    // Close the editor we came from if VS Code kept it next to the new one, so the
    // group holds exactly one tab for this resource.
    const leftover = group.tabs.find((tab) => !tab.isActive && tabResourceUri(tab)?.toString() === uri.toString());
    if (leftover !== undefined) {
      await vscode.window.tabGroups.close(leftover);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`Lectern: could not reopen ${uri.fsPath}: ${message}`);
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

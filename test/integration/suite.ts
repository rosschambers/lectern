import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';

const WAIT_TIMEOUT_MILLISECONDS = 10_000;

async function waitFor(condition: () => boolean, description: string): Promise<void> {
  const deadline = Date.now() + WAIT_TIMEOUT_MILLISECONDS;
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for: ${description}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

function activeInput(): unknown {
  return vscode.window.tabGroups.activeTabGroup.activeTab?.input;
}

function isLecternTab(): boolean {
  const input = activeInput();
  return input instanceof vscode.TabInputCustom && input.viewType === 'lectern.reader';
}

function tabsFor(uri: vscode.Uri): number {
  return vscode.window.tabGroups.activeTabGroup.tabs.filter((tab) => {
    const input = tab.input;
    return (input instanceof vscode.TabInputCustom || input instanceof vscode.TabInputText) && input.uri.toString() === uri.toString();
  }).length;
}

export async function run(): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'fixture workspace is open');
  const fixture = vscode.Uri.joinPath(folder.uri, 'basic.md');

  await vscode.commands.executeCommand('vscode.open', fixture);
  await waitFor(isLecternTab, 'basic.md opens in Lectern by default');

  await vscode.commands.executeCommand('lectern.editSource');
  await waitFor(() => activeInput() instanceof vscode.TabInputText, 'edit source shows the text editor');
  assert.equal(tabsFor(fixture), 1, 'edit source leaves exactly one tab for the file');

  await vscode.commands.executeCommand('lectern.openInLectern');
  await waitFor(isLecternTab, 'open in Lectern switches back');
  assert.equal(tabsFor(fixture), 1, 'open in Lectern leaves exactly one tab for the file');
}

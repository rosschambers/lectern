import { mkdtempSync, openSync, readSync, closeSync, rmSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runTests } from '@vscode/test-electron';

const SCRIPT_SIGNATURE = '#!';

/* ---------- launcher guard ---------- */

// A shell-script launcher (the NixOS `code` wrapper, for example) runs the VS Code
// command-line interface, which drops the test process's exit code and returns before
// the tests finish, so a failing suite looks green. Only the Electron binary is allowed.
function assertElectronBinary(executablePath: string): void {
  const descriptor = openSync(executablePath, 'r');
  const header = Buffer.alloc(SCRIPT_SIGNATURE.length);
  readSync(descriptor, header, 0, header.length, 0);
  closeSync(descriptor);
  if (header.toString('utf8') === SCRIPT_SIGNATURE) {
    throw new Error(
      `LECTERN_VSCODE_PATH (${executablePath}) is a script launcher, which hides test failures. ` +
        'Point it at the VS Code Electron binary instead; see "Integration tests" in AGENTS.md.',
    );
  }
}

/* ---------- run ---------- */

async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, '..');
  const extensionTestsPath = path.resolve(__dirname, 'suite.js');
  const workspace = path.resolve(extensionDevelopmentPath, 'test', 'fixtures');
  const vscodeExecutablePath = process.env.LECTERN_VSCODE_PATH || undefined;
  if (vscodeExecutablePath !== undefined) {
    assertElectronBinary(vscodeExecutablePath);
  }
  // A fresh profile per run: a reused profile restores the previous run's editors,
  // which made `vscode.open` focus a restored text tab instead of the default editor.
  const userDataDirectory = mkdtempSync(path.join(os.tmpdir(), 'lectern-test-'));
  try {
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      vscodeExecutablePath,
      launchArgs: [workspace, '--disable-extensions', '--disable-crash-reporter', `--user-data-dir=${userDataDirectory}`],
    });
  } finally {
    rmSync(userDataDirectory, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

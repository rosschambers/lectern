import * as path from 'node:path';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, '..');
  const extensionTestsPath = path.resolve(__dirname, 'suite.js');
  const workspace = path.resolve(extensionDevelopmentPath, 'test', 'fixtures');
  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    vscodeExecutablePath: process.env.LECTERN_VSCODE_PATH || undefined,
    launchArgs: [workspace, '--disable-extensions'],
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

import * as esbuild from 'esbuild';
import { cpSync, rmSync } from 'node:fs';

const commandLine = process.argv.slice(2);
const production = commandLine.includes('--production');

/* ---------- bundle definitions ---------- */
const extensionBuild = {
  entryPoints: ['src/extension/extension.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  outfile: 'dist/extension.js',
  external: ['vscode'],
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
};

const webviewBuild = {
  entryPoints: { main: 'src/webview/main.ts' },
  bundle: true,
  format: 'esm',
  splitting: true,
  platform: 'browser',
  target: 'chrome120',
  outdir: 'dist/webview',
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
};

const integrationBuild = {
  entryPoints: ['test/integration/run.ts', 'test/integration/suite.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  outdir: 'dist-test',
  external: ['vscode', '@vscode/test-electron'],
  logLevel: 'info',
};

const harnessBuild = {
  entryPoints: { harness: 'harness/harness.ts' },
  bundle: true,
  format: 'esm',
  splitting: true,
  platform: 'browser',
  target: 'chrome120',
  outdir: 'dist-harness',
  loader: { '.md': 'text' },
  sourcemap: true,
  logLevel: 'info',
};

/* ---------- modes ---------- */
async function buildHarness() {
  rmSync('dist-harness', { recursive: true, force: true });
  cpSync('harness/index.html', 'dist-harness/index.html');
  cpSync('test/fixtures/images', 'dist-harness/fixtures/images', { recursive: true });
  const context = await esbuild.context(harnessBuild);
  if (commandLine.includes('--serve')) {
    const { port } = await context.serve({ servedir: 'dist-harness', port: 8766 });
    console.log(`harness: http://127.0.0.1:${port}/?theme=dark (also light, high-contrast)`);
    await context.watch();
    return;
  }
  await context.rebuild();
  await context.dispose();
}

async function main() {
  if (commandLine.includes('--harness')) {
    await buildHarness();
    return;
  }
  rmSync('dist', { recursive: true, force: true });
  await esbuild.build(extensionBuild);
  await esbuild.build(webviewBuild);
  if (commandLine.includes('--integration')) {
    rmSync('dist-test', { recursive: true, force: true });
    await esbuild.build(integrationBuild);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

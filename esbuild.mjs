import * as esbuild from 'esbuild';
import { cpSync, rmSync } from 'node:fs';

const commandLine = process.argv.slice(2);
const production = commandLine.includes('--production');

/* ---------- named constants ---------- */
const extensionOutputDirectory = 'dist';
const integrationOutputDirectory = 'dist-test';
const harnessOutputDirectory = 'dist-harness';
const extensionHostTarget = 'node20';
const webviewTarget = 'chrome120';
const nodeEnvironmentDefine = {
  'process.env.NODE_ENV': production ? '"production"' : '"development"',
};

/* ---------- bundle definitions ---------- */
const extensionBuild = {
  entryPoints: ['src/extension/extension.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: extensionHostTarget,
  outfile: `${extensionOutputDirectory}/extension.js`,
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
  target: webviewTarget,
  outdir: `${extensionOutputDirectory}/webview`,
  define: nodeEnvironmentDefine,
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
};

const integrationBuild = {
  entryPoints: ['test/integration/run.ts', 'test/integration/suite.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: extensionHostTarget,
  outdir: integrationOutputDirectory,
  external: ['vscode', '@vscode/test-electron'],
  logLevel: 'info',
};

const harnessBuild = {
  entryPoints: { harness: 'harness/harness.ts' },
  bundle: true,
  format: 'esm',
  splitting: true,
  platform: 'browser',
  target: webviewTarget,
  outdir: harnessOutputDirectory,
  loader: { '.md': 'text' },
  define: nodeEnvironmentDefine,
  sourcemap: true,
  logLevel: 'info',
};

/* ---------- modes ---------- */
async function buildHarness() {
  rmSync(harnessOutputDirectory, { recursive: true, force: true });
  cpSync('harness/index.html', `${harnessOutputDirectory}/index.html`);
  cpSync('test/fixtures/images', `${harnessOutputDirectory}/fixtures/images`, { recursive: true });
  const context = await esbuild.context(harnessBuild);
  if (commandLine.includes('--serve')) {
    const { port } = await context.serve({ servedir: harnessOutputDirectory, port: 8766 });
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
  rmSync(extensionOutputDirectory, { recursive: true, force: true });
  await esbuild.build(extensionBuild);
  await esbuild.build(webviewBuild);
  if (commandLine.includes('--integration')) {
    rmSync(integrationOutputDirectory, { recursive: true, force: true });
    await esbuild.build(integrationBuild);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

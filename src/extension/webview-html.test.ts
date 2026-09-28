import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy, buildWebviewHtml } from './webview-html';

describe('buildContentSecurityPolicy', () => {
  it('builds the strict nonce policy', () => {
    expect(buildContentSecurityPolicy('N', 'SOURCE')).toBe(
      "default-src 'none'; script-src 'nonce-N' 'strict-dynamic' 'wasm-unsafe-eval'; style-src SOURCE 'unsafe-inline'; img-src SOURCE https: data:; font-src SOURCE",
    );
  });

  it('never allows eval or resource-origin scripts', () => {
    const policy = buildContentSecurityPolicy('N', 'SOURCE');
    expect(policy).not.toContain("'unsafe-eval'");
    const scriptDirective = policy.split('; ').find((directive) => directive.startsWith('script-src')) ?? '';
    expect(scriptDirective).not.toContain('SOURCE');
  });
});

describe('buildWebviewHtml', () => {
  it('emits one nonce-bearing module script, the root, and the stylesheet', () => {
    const html = buildWebviewHtml({ nonce: 'N', cspSource: 'SOURCE', scriptUri: 'https://x/main.js', styleUri: 'https://x/main.css' });
    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html).toContain('<script type="module" nonce="N" src="https://x/main.js"></script>');
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('<link rel="stylesheet" href="https://x/main.css">');
  });
});

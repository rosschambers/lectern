export interface WebviewHtmlOptions {
  nonce: string;
  cspSource: string;
  scriptUri: string;
  styleUri: string;
}

export function buildContentSecurityPolicy(nonce: string, cspSource: string): string {
  return [
    "default-src 'none'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'`,
    `style-src ${cspSource} 'unsafe-inline'`,
    `img-src ${cspSource} https: data:`,
    `font-src ${cspSource}`,
  ].join('; ');
}

export function buildWebviewHtml(options: WebviewHtmlOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${buildContentSecurityPolicy(options.nonce, options.cspSource)}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${options.styleUri}">
</head>
<body>
<div id="root"></div>
<script type="module" nonce="${options.nonce}" src="${options.scriptUri}"></script>
</body>
</html>`;
}

export type LinkTarget =
  | { kind: 'fragment'; fragment: string }
  | { kind: 'markdown'; uri: string; fragment: string | null }
  | { kind: 'file'; uri: string }
  | { kind: 'external'; uri: string }
  | { kind: 'ignored' };

const WINDOWS_DRIVE_PATH = /^([a-zA-Z]):[\\/]/;
const SCHEME = /^([a-zA-Z][a-zA-Z0-9+.-]*):/;
const EXTERNAL_SCHEMES = new Set(['http', 'https', 'mailto']);
const MARKDOWN_EXTENSION = /\.(?:md|markdown)$/i;

function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

function windowsPathToFileUrl(path: string): string {
  const hashIndex = path.indexOf('#');
  const pathPart = hashIndex === -1 ? path : path.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : path.slice(hashIndex);
  const drive = pathPart.charAt(0).toLowerCase();
  const segments = pathPart.slice(2).replace(/\\/g, '/').split('/').map((segment) => encodeURIComponent(segment));
  return `file:///${drive}%3A${segments.join('/')}${hash}`;
}

function classifyFileUrl(url: URL): LinkTarget {
  if (url.protocol !== 'file:') {
    return { kind: 'ignored' };
  }
  const fragment = url.hash === '' ? null : safeDecode(url.hash.slice(1));
  url.hash = '';
  if (MARKDOWN_EXTENSION.test(safeDecode(url.pathname))) {
    return { kind: 'markdown', uri: url.href, fragment };
  }
  return { kind: 'file', uri: url.href };
}

export function resolveLinkTarget(href: string, documentUri: string): LinkTarget {
  const trimmed = href.replace(/[\t\n\r]/g, '').trim();
  if (trimmed === '') {
    return { kind: 'ignored' };
  }
  if (trimmed.startsWith('#')) {
    return { kind: 'fragment', fragment: safeDecode(trimmed.slice(1)) };
  }
  try {
    if (WINDOWS_DRIVE_PATH.test(trimmed)) {
      return classifyFileUrl(new URL(windowsPathToFileUrl(trimmed)));
    }
    const scheme = SCHEME.exec(trimmed)?.[1]?.toLowerCase();
    if (scheme !== undefined && EXTERNAL_SCHEMES.has(scheme)) {
      return { kind: 'external', uri: trimmed };
    }
    if (scheme !== undefined && scheme !== 'file') {
      return { kind: 'ignored' };
    }
    return classifyFileUrl(new URL(trimmed, documentUri));
  } catch {
    return { kind: 'ignored' };
  }
}

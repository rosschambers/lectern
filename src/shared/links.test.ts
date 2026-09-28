import { describe, expect, it } from 'vitest';
import { resolveLinkTarget } from './links';

const linuxDocument = 'file:///home/ross/notes/doc.md';
const windowsDocument = 'file:///c%3A/Users/ross/notes/doc.md';

describe('resolveLinkTarget', () => {
  it('keeps in-page fragments in the webview', () => {
    expect(resolveLinkTarget('#overview', linuxDocument)).toEqual({ kind: 'fragment', fragment: 'overview' });
    expect(resolveLinkTarget('#caf%C3%A9', linuxDocument)).toEqual({ kind: 'fragment', fragment: 'café' });
  });

  it('resolves relative markdown links with fragments', () => {
    expect(resolveLinkTarget('other.md', linuxDocument)).toEqual({ kind: 'markdown', uri: 'file:///home/ross/notes/other.md', fragment: null });
    expect(resolveLinkTarget('../x/Guide.MARKDOWN#Step-1', linuxDocument)).toEqual({ kind: 'markdown', uri: 'file:///home/ross/x/Guide.MARKDOWN', fragment: 'Step-1' });
  });

  it('handles Windows paths', () => {
    expect(resolveLinkTarget('..\\other.md#part', windowsDocument)).toEqual({ kind: 'markdown', uri: 'file:///c%3A/Users/ross/other.md', fragment: 'part' });
    expect(resolveLinkTarget('C:\\Users\\ross\\x.md#top', windowsDocument)).toEqual({ kind: 'markdown', uri: 'file:///c%3A/Users/ross/x.md', fragment: 'top' });
    expect(resolveLinkTarget('images/a%20b.png', windowsDocument)).toEqual({ kind: 'file', uri: 'file:///c%3A/Users/ross/notes/images/a%20b.png' });
  });

  it('sends web and mail links outside and drops everything else', () => {
    expect(resolveLinkTarget('https://example.com/a#b', linuxDocument)).toEqual({ kind: 'external', uri: 'https://example.com/a#b' });
    expect(resolveLinkTarget('mailto:someone@example.com', linuxDocument)).toEqual({ kind: 'external', uri: 'mailto:someone@example.com' });
    expect(resolveLinkTarget('javascript:alert(1)', linuxDocument)).toEqual({ kind: 'ignored' });
    expect(resolveLinkTarget('vscode://settings', linuxDocument)).toEqual({ kind: 'ignored' });
    expect(resolveLinkTarget('   ', linuxDocument)).toEqual({ kind: 'ignored' });
  });

  it('accepts explicit file urls', () => {
    expect(resolveLinkTarget('file:///c%3A/x/y.md', windowsDocument)).toEqual({ kind: 'markdown', uri: 'file:///c%3A/x/y.md', fragment: null });
  });
});

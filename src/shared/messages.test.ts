import { describe, expect, it } from 'vitest';
import { isContentsState, isExtensionToWebviewMessage, isWebviewToExtensionMessage } from './messages';

const contents = { width: 190, visible: true };

describe('isWebviewToExtensionMessage', () => {
  it('accepts every variant', () => {
    expect(isWebviewToExtensionMessage({ type: 'ready' })).toBe(true);
    expect(isWebviewToExtensionMessage({ type: 'open-link', href: 'other.md' })).toBe(true);
    expect(isWebviewToExtensionMessage({ type: 'contents-changed', contents })).toBe(true);
  });

  it('rejects malformed values', () => {
    expect(isWebviewToExtensionMessage(null)).toBe(false);
    expect(isWebviewToExtensionMessage('ready')).toBe(false);
    expect(isWebviewToExtensionMessage({ type: 'unknown' })).toBe(false);
    expect(isWebviewToExtensionMessage({ type: 'open-link' })).toBe(false);
    expect(isWebviewToExtensionMessage({ type: 'contents-changed', contents: { width: Number.NaN, visible: true } })).toBe(false);
  });
});

describe('isExtensionToWebviewMessage', () => {
  it('accepts every variant', () => {
    expect(isExtensionToWebviewMessage({ type: 'document', text: '# a', imageBaseUri: 'https://x/', contents, defaultContentsWidth: 190, fragment: null })).toBe(true);
    expect(isExtensionToWebviewMessage({ type: 'document', text: '', imageBaseUri: '', contents, defaultContentsWidth: 190, fragment: 'overview' })).toBe(true);
    expect(isExtensionToWebviewMessage({ type: 'update', text: 'b' })).toBe(true);
    expect(isExtensionToWebviewMessage({ type: 'contents', contents })).toBe(true);
    expect(isExtensionToWebviewMessage({ type: 'scroll-to', fragment: 'overview' })).toBe(true);
  });

  it('rejects malformed values', () => {
    expect(isExtensionToWebviewMessage({ type: 'document', text: 'a' })).toBe(false);
    expect(isExtensionToWebviewMessage({ type: 'update' })).toBe(false);
    expect(isExtensionToWebviewMessage({ type: 'scroll-to', fragment: 3 })).toBe(false);
  });
});

describe('isContentsState', () => {
  it('requires a finite width and a boolean visibility', () => {
    expect(isContentsState(contents)).toBe(true);
    expect(isContentsState({ width: '190', visible: true })).toBe(false);
    expect(isContentsState({ width: 190 })).toBe(false);
  });
});

/* ---------- shared state ---------- */

export interface ContentsState {
  width: number;
  visible: boolean;
}

/* ---------- extension to webview ---------- */

export type ExtensionToWebviewMessage =
  | {
      type: 'document';
      text: string;
      imageBaseUri: string;
      contents: ContentsState;
      defaultContentsWidth: number;
      fragment: string | null;
    }
  | { type: 'update'; text: string }
  | { type: 'contents'; contents: ContentsState }
  | { type: 'scroll-to'; fragment: string };

/* ---------- webview to extension ---------- */

export type WebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'open-link'; href: string }
  | { type: 'contents-changed'; contents: ContentsState };

/* ---------- guards ---------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isContentsState(value: unknown): value is ContentsState {
  return (
    isRecord(value) &&
    typeof value.width === 'number' &&
    Number.isFinite(value.width) &&
    typeof value.visible === 'boolean'
  );
}

export function isWebviewToExtensionMessage(value: unknown): value is WebviewToExtensionMessage {
  if (!isRecord(value)) {
    return false;
  }
  switch (value.type) {
    case 'ready':
      return true;
    case 'open-link':
      return typeof value.href === 'string';
    case 'contents-changed':
      return isContentsState(value.contents);
    default:
      return false;
  }
}

export function isExtensionToWebviewMessage(value: unknown): value is ExtensionToWebviewMessage {
  if (!isRecord(value)) {
    return false;
  }
  switch (value.type) {
    case 'document':
      return (
        typeof value.text === 'string' &&
        typeof value.imageBaseUri === 'string' &&
        isContentsState(value.contents) &&
        typeof value.defaultContentsWidth === 'number' &&
        Number.isFinite(value.defaultContentsWidth) &&
        (value.fragment === null || typeof value.fragment === 'string')
      );
    case 'update':
      return typeof value.text === 'string';
    case 'contents':
      return isContentsState(value.contents);
    case 'scroll-to':
      return typeof value.fragment === 'string';
    default:
      return false;
  }
}

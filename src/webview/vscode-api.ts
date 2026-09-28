import type { WebviewToExtensionMessage } from '../shared/messages';

export interface VsCodeApi {
  postMessage(message: WebviewToExtensionMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

let cachedApi: VsCodeApi | undefined;

export function getVsCodeApi(): VsCodeApi {
  cachedApi ??= acquireVsCodeApi();
  return cachedApi;
}

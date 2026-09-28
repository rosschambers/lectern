export const DEFAULT_CONTENTS_WIDTH = 190;
export const MINIMUM_CONTENTS_WIDTH = 120;
export const MAXIMUM_CONTENTS_WIDTH = 480;

export function clampContentsWidth(width: number): number {
  if (!Number.isFinite(width)) {
    return DEFAULT_CONTENTS_WIDTH;
  }
  return Math.round(Math.min(MAXIMUM_CONTENTS_WIDTH, Math.max(MINIMUM_CONTENTS_WIDTH, width)));
}

import { describe, expect, it } from 'vitest';
import { clampContentsWidth, DEFAULT_CONTENTS_WIDTH } from './contents-width';

describe('clampContentsWidth', () => {
  it('clamps, rounds, and repairs', () => {
    expect(clampContentsWidth(50)).toBe(120);
    expect(clampContentsWidth(900)).toBe(480);
    expect(clampContentsWidth(200.6)).toBe(201);
    expect(clampContentsWidth(Number.NaN)).toBe(DEFAULT_CONTENTS_WIDTH);
  });
});

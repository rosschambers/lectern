import { describe, expect, it } from 'vitest';
import { captureScrollAnchor, isScrollAnchor, restoreScrollTop } from './scroll-anchor';

const headings = [{ id: 'a', top: 0 }, { id: 'b', top: 400 }, { id: 'c', top: 900 }];

describe('scroll anchoring', () => {
  it('captures the heading above the viewport', () => {
    expect(captureScrollAnchor(headings, 450)).toEqual({ id: 'b', offset: 50 });
    expect(captureScrollAnchor([{ id: 'late', top: 100 }], 20)).toEqual({ id: null, offset: 20 });
  });

  it('restores against moved headings', () => {
    expect(restoreScrollTop({ id: 'b', offset: 50 }, [{ id: 'b', top: 700 }])).toBe(750);
    expect(restoreScrollTop({ id: 'gone', offset: 50 }, headings)).toBe(50);
  });

  it('validates persisted anchors', () => {
    expect(isScrollAnchor({ id: 'b', offset: 3 })).toBe(true);
    expect(isScrollAnchor({ id: null, offset: 0 })).toBe(true);
    expect(isScrollAnchor({ id: 3, offset: 0 })).toBe(false);
    expect(isScrollAnchor(undefined)).toBe(false);
  });
});

export interface ScrollAnchor {
  id: string | null;
  offset: number;
}

export interface HeadingPosition {
  id: string;
  top: number;
}

export function captureScrollAnchor(headings: readonly HeadingPosition[], scrollTop: number): ScrollAnchor {
  let anchor: ScrollAnchor = { id: null, offset: scrollTop };
  for (const heading of headings) {
    if (heading.top > scrollTop) {
      break;
    }
    anchor = { id: heading.id, offset: scrollTop - heading.top };
  }
  return anchor;
}

export function restoreScrollTop(anchor: ScrollAnchor, headings: readonly HeadingPosition[]): number {
  if (anchor.id !== null) {
    const heading = headings.find((candidate) => candidate.id === anchor.id);
    if (heading !== undefined) {
      return heading.top + anchor.offset;
    }
  }
  return anchor.offset;
}

export function isScrollAnchor(value: unknown): value is ScrollAnchor {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (candidate.id === null || typeof candidate.id === 'string') && typeof candidate.offset === 'number' && Number.isFinite(candidate.offset);
}

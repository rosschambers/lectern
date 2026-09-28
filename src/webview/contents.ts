import { clampContentsWidth } from '../shared/contents-width';
import type { ContentsState } from '../shared/messages';
import type { OutlineEntry } from './render/outline';

export const ACTIVE_HEADING_THRESHOLD = 40;
const JUMP_TOLERANCE = 10;
const MINIMUM_ENTRIES_FOR_RAIL = 2;
const CONTENTS_WIDTH_PROPERTY = '--lectern-contents-width';

/* ---------- pure helpers ---------- */

export function findActiveHeadingIndex(tops: readonly number[], threshold: number): number {
  if (tops.length === 0) {
    return -1;
  }
  let active = 0;
  tops.forEach((top, index) => {
    if (top <= threshold) {
      active = index;
    }
  });
  return active;
}

export function nextHeadingIndex(tops: readonly number[]): number {
  return tops.findIndex((top) => top > JUMP_TOLERANCE);
}

export function previousHeadingIndex(tops: readonly number[]): number {
  for (let index = tops.length - 1; index >= 0; index -= 1) {
    if ((tops[index] ?? 0) < -JUMP_TOLERANCE) {
      return index;
    }
  }
  return -1;
}

/* ---------- controller ---------- */

export interface ContentsOptions {
  rail: HTMLElement;
  handle: HTMLElement;
  scroller: HTMLElement;
  defaultWidth(): number;
  onStateCommitted(state: ContentsState): void;
}

export interface ContentsController {
  update(outline: readonly OutlineEntry[]): void;
  applyState(state: ContentsState): void;
  refreshActive(): void;
  headingTops(): number[];
  outline(): readonly OutlineEntry[];
}

export function mountContents(options: ContentsOptions): ContentsController {
  const { rail, handle, scroller } = options;
  let state: ContentsState = { width: options.defaultWidth(), visible: true };
  let entries: readonly OutlineEntry[] = [];
  let previousActiveIndex = -1;

  function applyLayout(): void {
    const hidden = !state.visible || entries.length < MINIMUM_ENTRIES_FOR_RAIL;
    rail.hidden = hidden;
    handle.hidden = hidden;
    document.documentElement.style.setProperty(CONTENTS_WIDTH_PROPERTY, `${state.width}px`);
  }

  function headingTops(): number[] {
    const scrollerTop = scroller.getBoundingClientRect().top;
    return entries.map((entry) => {
      const element = document.getElementById(entry.id);
      return element === null ? Number.POSITIVE_INFINITY : element.getBoundingClientRect().top - scrollerTop;
    });
  }

  function refreshActive(): void {
    const activeIndex = findActiveHeadingIndex(headingTops(), ACTIVE_HEADING_THRESHOLD);
    const activeIndexChanged = activeIndex !== previousActiveIndex;
    rail.querySelectorAll('li').forEach((item, index) => {
      const isActive = index === activeIndex;
      item.classList.toggle('active', isActive);
      if (isActive && activeIndexChanged && !rail.hidden && typeof item.scrollIntoView === 'function') {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
    previousActiveIndex = activeIndex;
  }

  function update(outline: readonly OutlineEntry[]): void {
    entries = outline;
    const title = document.createElement('div');
    title.className = 'contents-title';
    title.textContent = 'Contents';
    const list = document.createElement('ul');
    for (const entry of outline) {
      const item = document.createElement('li');
      item.dataset.id = entry.id;
      item.style.setProperty('--level', String(entry.level - 1));
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = entry.text;
      button.title = entry.text;
      button.addEventListener('click', () => document.getElementById(entry.id)?.scrollIntoView({ block: 'start' }));
      item.append(button);
      list.append(item);
    }
    rail.replaceChildren(title, list);
    applyLayout();
  }

  function commit(width: number): void {
    state = { ...state, width: clampContentsWidth(width) };
    applyLayout();
    options.onStateCommitted(state);
  }

  /* ---------- resizing ---------- */

  handle.addEventListener('mousedown', (downEvent: MouseEvent) => {
    downEvent.preventDefault();
    const startX = downEvent.clientX;
    const startWidth = state.width;
    let previewedWidth = startWidth;
    handle.classList.add('dragging');

    function computeWidth(clientX: number): number {
      return clampContentsWidth(startWidth + clientX - startX);
    }

    function preview(width: number): void {
      previewedWidth = width;
      document.documentElement.style.setProperty(CONTENTS_WIDTH_PROPERTY, `${previewedWidth}px`);
    }

    function finishDrag(): void {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('blur', onBlur);
      handle.classList.remove('dragging');
      commit(previewedWidth);
    }

    function onMove(moveEvent: MouseEvent): void {
      if (moveEvent.buttons === 0) {
        finishDrag();
        return;
      }
      preview(computeWidth(moveEvent.clientX));
    }

    function onUp(upEvent: MouseEvent): void {
      preview(computeWidth(upEvent.clientX));
      finishDrag();
    }

    function onBlur(): void {
      finishDrag();
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('blur', onBlur);
  });

  handle.addEventListener('dblclick', () => commit(options.defaultWidth()));

  return {
    update,
    applyState(next: ContentsState): void {
      state = { width: clampContentsWidth(next.width), visible: next.visible };
      applyLayout();
    },
    refreshActive,
    headingTops,
    outline: () => entries,
  };
}

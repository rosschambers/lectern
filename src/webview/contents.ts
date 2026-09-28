import { clampContentsWidth } from '../shared/contents-width';
import type { ContentsState } from '../shared/messages';
import type { OutlineEntry } from './render/outline';

export const ACTIVE_HEADING_THRESHOLD = 40;
const JUMP_TOLERANCE = 10;
const MINIMUM_ENTRIES_FOR_RAIL = 2;

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

  function applyLayout(): void {
    const hidden = !state.visible || entries.length < MINIMUM_ENTRIES_FOR_RAIL;
    rail.hidden = hidden;
    handle.hidden = hidden;
    document.documentElement.style.setProperty('--lectern-contents-width', `${state.width}px`);
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
    rail.querySelectorAll('li').forEach((item, index) => {
      const isActive = index === activeIndex;
      item.classList.toggle('active', isActive);
      if (isActive && !rail.hidden && typeof item.scrollIntoView === 'function') {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
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
    handle.classList.add('dragging');
    function onMove(moveEvent: MouseEvent): void {
      const width = clampContentsWidth(startWidth + moveEvent.clientX - startX);
      document.documentElement.style.setProperty('--lectern-contents-width', `${width}px`);
    }
    function onUp(upEvent: MouseEvent): void {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      handle.classList.remove('dragging');
      commit(startWidth + upEvent.clientX - startX);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
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

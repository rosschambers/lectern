// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { ContentsState } from '../shared/messages';
import { findActiveHeadingIndex, mountContents, nextHeadingIndex, previousHeadingIndex } from './contents';

describe('heading index helpers', () => {
  it('finds the active heading', () => {
    expect(findActiveHeadingIndex([], 40)).toBe(-1);
    expect(findActiveHeadingIndex([100, 300], 40)).toBe(0);
    expect(findActiveHeadingIndex([-500, 20, 300], 40)).toBe(1);
  });

  it('finds next and previous headings', () => {
    expect(nextHeadingIndex([-200, 5, 120])).toBe(2);
    expect(previousHeadingIndex([-200, -50, 5])).toBe(1);
    expect(nextHeadingIndex([-5])).toBe(-1);
  });
});

function setup(): {
  rail: HTMLElement;
  handle: HTMLElement;
  scroller: HTMLElement;
  committed: ReturnType<typeof vi.fn<(state: ContentsState) => void>>;
} {
  document.body.innerHTML = '<nav id="rail"></nav><div id="handle"></div><main id="scroller"><h1 id="a">A</h1><h2 id="b">B</h2></main>';
  const committed = vi.fn();
  const rail = document.getElementById('rail') as HTMLElement;
  const handle = document.getElementById('handle') as HTMLElement;
  const scroller = document.getElementById('scroller') as HTMLElement;
  return { rail, handle, scroller, committed };
}

describe('mountContents', () => {
  it('renders entries, hides short outlines, and scrolls on click', () => {
    const { rail, handle, scroller, committed } = setup();
    const controller = mountContents({ rail, handle, scroller, defaultWidth: () => 190, onStateCommitted: committed });
    controller.applyState({ width: 190, visible: true });
    controller.update([{ level: 1, text: 'A', id: 'a' }]);
    expect(rail.hidden).toBe(true);
    controller.update([{ level: 1, text: 'A', id: 'a' }, { level: 2, text: 'B', id: 'b' }]);
    expect(rail.hidden).toBe(false);
    expect(handle.hidden).toBe(false);
    const items = rail.querySelectorAll('li');
    expect(items).toHaveLength(2);
    expect((items[1] as HTMLElement).style.getPropertyValue('--level')).toBe('1');
    const heading = document.getElementById('b') as HTMLElement;
    heading.scrollIntoView = vi.fn();
    (items[1]?.querySelector('button') as HTMLElement).click();
    expect(heading.scrollIntoView).toHaveBeenCalled();
  });

  it('scrolls the active rail item into view only when the active index changes', () => {
    const { rail, handle, scroller, committed } = setup();
    const controller = mountContents({ rail, handle, scroller, defaultWidth: () => 190, onStateCommitted: committed });
    controller.applyState({ width: 190, visible: true });
    controller.update([{ level: 1, text: 'A', id: 'a' }, { level: 2, text: 'B', id: 'b' }]);
    const items = Array.from(rail.querySelectorAll('li'));
    const scrollSpies = items.map((item) => {
      const spy = vi.fn();
      (item as HTMLElement).scrollIntoView = spy;
      return spy;
    });
    controller.refreshActive();
    controller.refreshActive();
    const totalCalls = scrollSpies.reduce((sum, spy) => sum + spy.mock.calls.length, 0);
    expect(totalCalls).toBeLessThanOrEqual(1);
  });

  it('commits dragged and reset widths', () => {
    const { rail, handle, scroller, committed } = setup();
    const controller = mountContents({ rail, handle, scroller, defaultWidth: () => 190, onStateCommitted: committed });
    controller.applyState({ width: 190, visible: true });
    handle.dispatchEvent(new MouseEvent('mousedown', { clientX: 200, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 260, buttons: 1 }));
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 260 }));
    expect(committed).toHaveBeenLastCalledWith({ width: 250, visible: true });
    handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(committed).toHaveBeenLastCalledWith({ width: 190, visible: true });
  });

  it('ends the drag and commits the last previewed width when the button is released outside the webview', () => {
    const { rail, handle, scroller, committed } = setup();
    const controller = mountContents({ rail, handle, scroller, defaultWidth: () => 190, onStateCommitted: committed });
    controller.applyState({ width: 190, visible: true });
    handle.dispatchEvent(new MouseEvent('mousedown', { clientX: 200, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 230, buttons: 1 }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 999, buttons: 0 }));
    expect(committed).toHaveBeenLastCalledWith({ width: 220, visible: true });
    expect(handle.classList.contains('dragging')).toBe(false);
    committed.mockClear();
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 400, buttons: 1 }));
    expect(committed).not.toHaveBeenCalled();
  });

  it('ends the drag when the window loses focus', () => {
    const { rail, handle, scroller, committed } = setup();
    const controller = mountContents({ rail, handle, scroller, defaultWidth: () => 190, onStateCommitted: committed });
    controller.applyState({ width: 190, visible: true });
    handle.dispatchEvent(new MouseEvent('mousedown', { clientX: 200, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 230, buttons: 1 }));
    window.dispatchEvent(new Event('blur'));
    expect(committed).toHaveBeenLastCalledWith({ width: 220, visible: true });
    expect(handle.classList.contains('dragging')).toBe(false);
    committed.mockClear();
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 400, buttons: 1 }));
    expect(committed).not.toHaveBeenCalled();
  });
});

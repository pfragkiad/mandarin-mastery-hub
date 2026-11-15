import { describe, expect, it } from 'vitest';
import { rowItemsWrap, shouldShortenRadicalPill } from './use-radical-pill-label';

/** A row whose items sit on the given lines (top, height), one item per entry. */
function fakeRow(items: { top: number; height: number }[]): HTMLElement {
  const row = document.createElement('span');
  items.forEach(({ top, height }) => {
    const item = document.createElement('span');
    item.getBoundingClientRect = () => ({ top, height, bottom: top + height, left: 0, right: 0, width: 0, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
    row.appendChild(item);
  });
  return row;
}

describe('rowItemsWrap', () => {
  it('keeps a row whose items share one line', () => {
    // The pill is taller than the rank text, but the row centres them, so both share a centre.
    expect(rowItemsWrap(fakeRow([{ top: 10, height: 14 }, { top: 7, height: 20 }]))).toBe(false);
  });
  it('reports a row whose pill dropped to a second line', () => {
    expect(rowItemsWrap(fakeRow([{ top: 7, height: 20 }, { top: 31, height: 20 }]))).toBe(true);
  });
  it('ignores labels with no box and a single-item row', () => {
    expect(rowItemsWrap(fakeRow([{ top: 0, height: 0 }, { top: 7, height: 20 }]))).toBe(false);
    expect(rowItemsWrap(fakeRow([{ top: 7, height: 20 }]))).toBe(false);
  });
});

describe('shouldShortenRadicalPill', () => {
  it('shortens only when the abbreviation keeps the row on one line', () => {
    expect(shouldShortenRadicalPill(true, false)).toBe(true);
  });
  it('keeps the full label while it still fits', () => {
    expect(shouldShortenRadicalPill(false, false)).toBe(false);
  });
  it('keeps the full label when even the abbreviation wraps', () => {
    expect(shouldShortenRadicalPill(true, true)).toBe(false);
  });
});

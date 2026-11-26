import { describe, expect, it } from 'vitest';
import { cardWidth, gridColumnsFor, syncRowHeaderHeights } from './use-footer-fit-columns';

// Rule: when a card's Details/Trace/Recall buttons would wrap, the grid shows fewer cards per row.
describe('gridColumnsFor', () => {
  it('keeps the stylesheet column count while nothing has wrapped', () => {
    expect(gridColumnsFor({ natural: 5, width: 1300, gap: 20, needed: 0 })).toBe(5);
  });
  it('drops to fewer columns once cards of a given width wrapped', () => {
    // 5 columns are 244px wide; cards that wide wrapped, so 4 columns (310px) are used.
    expect(cardWidth(1300, 20, 5)).toBe(244);
    expect(gridColumnsFor({ natural: 5, width: 1300, gap: 20, needed: 244 })).toBe(4);
  });
  it('never exceeds the stylesheet count and never goes below one column', () => {
    expect(gridColumnsFor({ natural: 3, width: 3000, gap: 18, needed: 0 })).toBe(3);
    expect(gridColumnsFor({ natural: 3, width: 600, gap: 18, needed: 5000 })).toBe(1);
  });
  it("Start's six cards go 6 → 3, never 5 or 4", () => {
    expect(gridColumnsFor({ natural: 6, width: 1400, gap: 14, needed: cardWidth(1400, 14, 6), choices: [6, 3, 2, 1] })).toBe(3);
  });
});

// Rule: cards in the same visual row share the tallest header height so their top hanzi align.
describe('syncRowHeaderHeights', () => {
  it('matches header min-height across cards in the same visual row and leaves other rows untouched', () => {
    const grid = document.createElement('div');
    const makeCard = (cardTop: number, headerHeight: number) => {
      const card = document.createElement('article');
      card.className = 'word-card';
      card.getBoundingClientRect = () => ({ top: cardTop, bottom: cardTop + 200, left: 0, right: 300, width: 300, height: 200, x: 0, y: cardTop, toJSON: () => ({}) });
      const top = document.createElement('div');
      top.className = 'word-card-top';
      top.getBoundingClientRect = () => ({ top: cardTop, bottom: cardTop + headerHeight, left: 0, right: 300, width: 300, height: headerHeight, x: 0, y: cardTop, toJSON: () => ({}) });
      card.appendChild(top);
      grid.appendChild(card);
      return top;
    };
    const row1Tall = makeCard(0, 52);
    const row1Short = makeCard(0, 26);
    const row2A = makeCard(220, 26);
    const row2B = makeCard(220, 26);

    syncRowHeaderHeights(grid);
    expect(row1Tall.style.minHeight).toBe('52px');
    expect(row1Short.style.minHeight).toBe('52px');
    expect(row1Short.style.alignItems).toBe('start');
    expect(row2A.style.minHeight).toBe('');
    expect(row2B.style.minHeight).toBe('');
  });
});

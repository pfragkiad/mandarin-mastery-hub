import { describe, expect, it } from 'vitest';
import { cardWidth, gridColumnsFor } from './use-footer-fit-columns';

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

import { describe, expect, it } from 'vitest';
import { HEAD_FONT_STEPS, rowItemsWrap, topRowFitPlan, type TopRowFit } from './use-card-top-row-fit';

/** A row whose items sit on one line (identical vertical centres) does not wrap. */
function oneLineRow(): HTMLElement {
  const row = document.createElement('span');
  const rank = document.createElement('span');
  const pill = document.createElement('span');
  rank.getBoundingClientRect = () => ({ height: 16, top: 0, width: 100, left: 0, right: 100, bottom: 16, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  pill.getBoundingClientRect = () => ({ height: 20, top: -2, width: 90, left: 108, right: 198, bottom: 18, x: 108, y: -2, toJSON: () => ({}) }) as DOMRect;
  row.append(rank, pill);
  return row;
}

/** A row whose last item dropped to a second line (one line lower) does wrap. */
function wrappedRow(): HTMLElement {
  const row = document.createElement('span');
  const rank = document.createElement('span');
  const pill = document.createElement('span');
  rank.getBoundingClientRect = () => ({ height: 16, top: 0, width: 100, left: 0, right: 100, bottom: 16, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  pill.getBoundingClientRect = () => ({ height: 20, top: 18, width: 90, left: 0, right: 90, bottom: 38, x: 0, y: 18, toJSON: () => ({}) }) as DOMRect;
  row.append(rank, pill);
  return row;
}

/** A row whose only visible item is hidden (no box) cannot wrap. */
function singleItemRow(): HTMLElement {
  const row = document.createElement('span');
  const hidden = document.createElement('span');
  const pill = document.createElement('span');
  hidden.getBoundingClientRect = () => ({ height: 0, top: 0, width: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  pill.getBoundingClientRect = () => ({ height: 20, top: 0, width: 90, left: 0, right: 90, bottom: 20, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  row.append(hidden, pill);
  return row;
}

describe('rowItemsWrap', () => {
  it('reports no wrap when every item shares one line', () => {
    expect(rowItemsWrap(oneLineRow())).toBe(false);
  });

  it('reports a wrap when an item sits a line lower', () => {
    expect(rowItemsWrap(wrappedRow())).toBe(true);
  });

  it('ignores hidden items and never wraps a single visible item', () => {
    expect(rowItemsWrap(singleItemRow())).toBe(false);
  });
});

describe('topRowFitPlan', () => {
  it('keeps the full label and the view header size when the row already fits', () => {
    const tried: TopRowFit[] = [];
    expect(topRowFitPlan(fit => { tried.push(fit); return fit.step === 0 && !fit.abbreviate; }, true)).toEqual({ abbreviate: false, step: 0 });
    expect(tried).toEqual([{ abbreviate: false, step: 0 }]);
  });

  it('uses the abbreviated Radical label as the first attempt', () => {
    const tried: TopRowFit[] = [];
    expect(topRowFitPlan(fit => { tried.push(fit); return fit.abbreviate && fit.step === 0; }, true)).toEqual({ abbreviate: true, step: 0 });
    expect(tried).toEqual([{ abbreviate: false, step: 0 }, { abbreviate: true, step: 0 }]);
  });

  it('shortens the header font as the second attempt, keeping the accepted abbreviation', () => {
    expect(topRowFitPlan(fit => fit.step === 1, true)).toEqual({ abbreviate: true, step: 1 });
    expect(topRowFitPlan(fit => fit.step === 2, true)).toEqual({ abbreviate: true, step: 2 });
  });

  it('steps the header font without an abbreviation on cards that have no Radical pill', () => {
    const tried: TopRowFit[] = [];
    expect(topRowFitPlan(fit => { tried.push(fit); return fit.step === 1; }, false)).toEqual({ abbreviate: false, step: 1 });
    expect(tried).toEqual([{ abbreviate: false, step: 0 }, { abbreviate: false, step: 1 }]);
  });

  it('keeps the smallest header size when nothing fits, so the row wraps as the last fallback', () => {
    expect(topRowFitPlan(() => false, true)).toEqual({ abbreviate: true, step: HEAD_FONT_STEPS[HEAD_FONT_STEPS.length - 1] });
    expect(topRowFitPlan(() => false, false)).toEqual({ abbreviate: false, step: HEAD_FONT_STEPS[HEAD_FONT_STEPS.length - 1] });
  });

  it('never offers a header size below the 9px / 13px floors', () => {
    expect(HEAD_FONT_STEPS).toEqual([1, 2]);
  });
});

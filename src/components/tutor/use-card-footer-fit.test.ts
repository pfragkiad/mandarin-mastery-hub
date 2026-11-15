import { describe, expect, it } from 'vitest';
import { FOOT_FONT_STEPS, footerFontPlan, footerItemsWrap } from './use-card-footer-fit';

/** A footer whose controls share one line (identical vertical centres) does not wrap. */
function oneLineFooter(): HTMLElement {
  const footer = document.createElement('div');
  const details = document.createElement('button');
  const trace = document.createElement('a');
  const recall = document.createElement('a');
  const bookmark = document.createElement('button');
  const at = (el: HTMLElement, left: number, top: number) => {
    el.getBoundingClientRect = () => ({ height: 26, width: 60, left, top, right: left + 60, bottom: top + 26, x: left, y: top, toJSON: () => ({}) }) as DOMRect;
    return el;
  };
  footer.append(at(details, 0, 4), at(trace, 66, 4), at(recall, 132, 4), at(bookmark, 198, 4));
  return footer;
}

/** A footer where Recall and the bookmark dropped to a second line does wrap. */
function wrappedFooter(): HTMLElement {
  const footer = document.createElement('div');
  const details = document.createElement('button');
  const trace = document.createElement('a');
  const recall = document.createElement('a');
  const bookmark = document.createElement('button');
  const at = (el: HTMLElement, left: number, top: number) => {
    el.getBoundingClientRect = () => ({ height: 26, width: 60, left, top, right: left + 60, bottom: top + 26, x: left, y: top, toJSON: () => ({}) }) as DOMRect;
    return el;
  };
  footer.append(at(details, 0, 4), at(trace, 66, 4), at(recall, 0, 34), at(bookmark, 66, 34));
  return footer;
}

describe('footerItemsWrap', () => {
  it('reports no wrap when every action shares one line', () => {
    expect(footerItemsWrap(oneLineFooter())).toBe(false);
  });

  it('reports a wrap when Recall and the bookmark drop a line', () => {
    expect(footerItemsWrap(wrappedFooter())).toBe(true);
  });
});

describe('footerFontPlan', () => {
  it('keeps the view button size when the row already fits', () => {
    expect(footerFontPlan(() => true)).toBe(0);
  });

  it('takes the first smaller size that puts the row back on one line', () => {
    expect(footerFontPlan(step => step === 2)).toBe(2);
  });

  it('returns to the view size when the row wraps anyway', () => {
    expect(footerFontPlan(() => false)).toBe(0);
  });

  it('never offers a button size below the 9px / 13px floors', () => {
    expect(FOOT_FONT_STEPS).toEqual([1, 2]);
  });
});

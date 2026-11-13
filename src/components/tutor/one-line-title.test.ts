import { describe, expect, it } from 'vitest';
import { ONE_LINE_TITLE_MIN_PX, oneLineFontSize } from './one-line-title';

// Numbers are the real phone case: a 360px phone leaves the heading 320px of box, while the
// stylesheet draws "Get to know the characters." plus its inline source-info icon 388px wide
// at 28px (measured live in the preview).
describe('oneLineFontSize', () => {
  it('leaves a title that already fits on one line untouched', () => {
    expect(oneLineFontSize({ naturalWidth: 250, availableWidth: 320, baseSize: 28 })).toBe(28);
  });

  it('lowers the font size only as far as the single line needs', () => {
    // 388px of title in a 320px box: 28 × 320/388 = 23.06, floored to 23.0.
    expect(oneLineFontSize({ naturalWidth: 388, availableWidth: 320, baseSize: 28 })).toBe(23);
  });

  it('never shrinks below the readable floor', () => {
    // A 700px title in a 200px box would need 8px; the floor keeps it at 17px so the
    // title wraps instead of becoming unreadable.
    expect(oneLineFontSize({ naturalWidth: 700, availableWidth: 200, baseSize: 28 })).toBe(ONE_LINE_TITLE_MIN_PX);
  });

  it('fails closed to the stylesheet size when measurement is unavailable', () => {
    expect(oneLineFontSize({ naturalWidth: 0, availableWidth: 320, baseSize: 28 })).toBe(28);
    expect(oneLineFontSize({ naturalWidth: 388, availableWidth: 0, baseSize: 28 })).toBe(28);
    expect(oneLineFontSize({ naturalWidth: 388, availableWidth: 320, baseSize: 0 })).toBe(0);
  });
});

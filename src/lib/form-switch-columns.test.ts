import { describe, expect, it } from 'vitest';
import { formSwitchColumns } from './form-switch-columns';

// Practice form-switch trays wrap evenly: at most 4 per row, rows balanced (5 → 3+2).
describe('formSwitchColumns', () => {
  it('keeps up to four forms on one row', () => {
    expect(formSwitchColumns(1)).toBe(1);
    expect(formSwitchColumns(2)).toBe(2);
    expect(formSwitchColumns(3)).toBe(3);
    expect(formSwitchColumns(4)).toBe(4);
  });

  it('balances five forms as 3+2, never 4+1', () => {
    expect(formSwitchColumns(5)).toBe(3);
  });

  it('balances six forms as 3+3', () => {
    expect(formSwitchColumns(6)).toBe(3);
  });

  it('balances seven and eight forms across two rows of at most four', () => {
    expect(formSwitchColumns(7)).toBe(4);
    expect(formSwitchColumns(8)).toBe(4);
  });

  it('balances nine forms as 3+3+3', () => {
    expect(formSwitchColumns(9)).toBe(3);
  });
});

import { describe, expect, it } from 'vitest';
import { libraryPageSize, libraryRows } from './library-density';

describe('library row preferences', () => {
  it('defaults phones to 3 rows', () => expect(libraryRows(undefined, true)).toBe(3));
  it('defaults desktop to 5 rows', () => expect(libraryRows(undefined, false)).toBe(5));
  it('keeps the chosen preset across screen sizes', () => {
    for (const rows of [3, 5, 10] as const) {
      expect(libraryRows(rows, true)).toBe(rows);
      expect(libraryRows(rows, false)).toBe(rows);
    }
  });
  it('calculates actual row capacity from responsive columns', () => {
    expect(libraryPageSize(3, 2)).toBe(6);
    expect(libraryPageSize(5, 5)).toBe(25);
    expect(libraryPageSize(10, 4)).toBe(40);
  });
});
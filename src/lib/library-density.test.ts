import { describe, expect, it } from 'vitest';
import { libraryPageSize, libraryRows } from './library-density';

describe('library row preferences', () => {
  it('defaults to 3 rows on every screen size', () => {
    expect(libraryRows(undefined)).toBe(3);
  });
  it('keeps the chosen preset', () => {
    for (const rows of [3, 5, 10] as const) {
      expect(libraryRows(rows)).toBe(rows);
    }
  });
  it('falls back to 3 rows for unknown stored values', () => {
    expect(libraryRows(4)).toBe(3);
    expect(libraryRows('5')).toBe(3);
  });
  it('calculates actual row capacity from responsive columns', () => {
    expect(libraryPageSize(3, 2)).toBe(6);
    expect(libraryPageSize(5, 5)).toBe(25);
    expect(libraryPageSize(10, 4)).toBe(40);
  });
});

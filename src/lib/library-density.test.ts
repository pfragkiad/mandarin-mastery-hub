import { describe, expect, it } from 'vitest';
import { libraryPerPage } from './library-density';

describe('library page-size preference', () => {
  it('defaults to 10 records per page', () => {
    expect(libraryPerPage(undefined)).toBe(10);
  });
  it('keeps the chosen preset', () => {
    for (const perPage of [10, 20, 50] as const) {
      expect(libraryPerPage(perPage)).toBe(perPage);
    }
  });
  it('falls back to 10 records for unknown stored values, including the old rows setting', () => {
    expect(libraryPerPage(4)).toBe(10);
    expect(libraryPerPage('20')).toBe(10);
    expect(libraryPerPage(3)).toBe(10);
  });
});

import { expect, it } from 'vitest';
import { restoredLibraryView } from './learning-preferences';

it('defaults mobile libraries to list without a saved choice', () => {
  expect(restoredLibraryView(undefined, true)).toBe('list');
});
it('retains an explicit grid choice on mobile', () => {
  expect(restoredLibraryView('grid', true)).toBe('grid');
});
it('retains an explicit list choice on desktop', () => {
  expect(restoredLibraryView('list', false)).toBe('list');
});
it('keeps grid as the desktop default', () => {
  expect(restoredLibraryView(undefined, false)).toBe('grid');
});
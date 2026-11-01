import type { LibraryPerPage } from './learning-preferences';

// Page size is a plain record count (10/20/50), independent of the responsive
// column count: the grid only decides how many rows those records fill.
export function libraryPerPage(stored: unknown): LibraryPerPage {
  return stored === 10 || stored === 20 || stored === 50 ? stored : 10;
}

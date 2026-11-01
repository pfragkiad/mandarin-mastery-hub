import type { LibraryRows } from './learning-preferences';

export function libraryRows(stored: unknown): LibraryRows {
  return stored === 3 || stored === 5 || stored === 10 ? stored : 3;
}

export function libraryPageSize(rows: LibraryRows, columns: number) {
  return rows * Math.max(1, Math.floor(columns));
}
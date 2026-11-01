import { useEffect, useRef, useState } from 'react';
import { libraryPageSize, libraryRows } from '@/lib/library-density';
import type { LibraryRows } from '@/lib/learning-preferences';
import { useWorkspace } from './workspace';

/** Read resolved grid tracks, including collapsed auto-fit tracks, to measure capacity. */
export function useLibraryDensity(context: string, onResetPage: () => void) {
  const { preferences, setPreferences } = useWorkspace();
  const gridRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const sync = () => {
      // Read actual CSS tracks instead of duplicating responsive breakpoints in
      // JavaScript; pagination and the rendered card grid then share capacity.
      const tracks = getComputedStyle(grid).gridTemplateColumns;
      if (tracks && tracks !== 'none') setColumns(tracks.trim().split(/\s+/).length);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [context]);
  const rows = libraryRows(preferences.libraryRows);
  // Density is a shared display preference; only page reset belongs to the URL.
  const onRowsChange = (value: LibraryRows) => {
    setPreferences({ ...preferences, libraryRows: value });
    onResetPage();
  };
  return { gridRef, rows, size: libraryPageSize(rows, columns), onRowsChange };
}
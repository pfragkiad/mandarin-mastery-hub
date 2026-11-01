import { useEffect, useRef, useState } from 'react';
import { libraryPageSize, libraryRows } from '@/lib/library-density';
import type { LibraryRows } from '@/lib/learning-preferences';
import { useWorkspace } from './workspace';

/** Read resolved grid tracks, including collapsed auto-fit tracks, to measure capacity. */
export function useLibraryDensity(context: string, onResetPage: () => void) {
  const { preferences, setPreferences } = useWorkspace();
  const gridRef = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(false);
  const [columns, setColumns] = useState(1);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 580px)');
    const sync = () => setPhone(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const sync = () => {
      const tracks = getComputedStyle(grid).gridTemplateColumns;
      if (tracks && tracks !== 'none') setColumns(tracks.trim().split(/\s+/).length);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [context]);
  const rows = libraryRows(preferences.libraryRows, phone);
  const onRowsChange = (value: LibraryRows) => {
    setPreferences({ ...preferences, libraryRows: value });
    onResetPage();
  };
  return { gridRef, rows, size: libraryPageSize(rows, columns), onRowsChange };
}
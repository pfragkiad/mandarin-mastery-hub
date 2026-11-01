import { libraryPerPage } from '@/lib/library-density';
import type { LibraryPerPage } from '@/lib/learning-preferences';
import { useWorkspace } from './workspace';

/**
 * Library page size, a shared display preference stored as a plain record
 * count (10/20/50). Only the page reset belongs to the URL; the responsive
 * grid no longer influences pagination capacity.
 */
export function useLibraryDensity(onResetPage: () => void) {
  const { preferences, setPreferences } = useWorkspace();
  const onPerPageChange = (value: LibraryPerPage) => {
    setPreferences({ ...preferences, libraryPerPage: value });
    onResetPage();
  };
  return { size: libraryPerPage(preferences.libraryPerPage), onPerPageChange };
}

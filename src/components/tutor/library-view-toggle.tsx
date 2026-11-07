import { LayoutGrid, Rows3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';

/** Shared library layout control. Only the remembered display preference changes:
 * filters, page, selected record and card-reveal state remain untouched.
 * The card DOM is reused in both layouts so bookmarks/audio stay independent. */
export function LibraryViewToggle() {
  const { preferences, setPreferences } = useWorkspace();
  const view = preferences.libraryView === 'list' ? 'list' : 'grid';
  return <div role="group" aria-label="Card view" className="library-view-toggle">
    <Button variant="ghost" size="sm" aria-label="Grid view" aria-pressed={view === 'grid'} title="Grid view" onClick={() => setPreferences({ ...preferences, libraryView: 'grid' })}><LayoutGrid/>Grid</Button>
    <Button variant="ghost" size="sm" aria-label="List view" aria-pressed={view === 'list'} title="Large list view" onClick={() => setPreferences({ ...preferences, libraryView: 'list' })}><Rows3/>List</Button>
  </div>;
}
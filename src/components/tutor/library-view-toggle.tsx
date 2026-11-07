import { ALargeSmall, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';

/** Shared header display control couples readable controls with library layout.
 * The existing saved layout field is retained so prior device choices survive.
 * Only the remembered display preference changes:
 * filters, page, selected record and card-reveal state remain untouched.
 * The card DOM is reused in both layouts so bookmarks/audio stay independent. */
export function LibraryViewToggle() {
  const { preferences, setPreferences } = useWorkspace();
  const view = preferences.libraryView === 'list' ? 'list' : 'grid';
  const label = view === 'list' ? 'Comfortable' : 'Compact';
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="display-size-trigger" aria-label={`Display size: ${label}`} title={`Display size: ${label}`}><ALargeSmall/><span>{label}</span><ChevronDown className="display-size-chevron"/></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end"><DropdownMenuRadioGroup value={view} onValueChange={value => { if (value === 'grid' || value === 'list') setPreferences({ ...preferences, libraryView: value }); }}>
      <DropdownMenuRadioItem value="grid">Compact</DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="list">Comfortable</DropdownMenuRadioItem>
    </DropdownMenuRadioGroup></DropdownMenuContent>
  </DropdownMenu>;
}
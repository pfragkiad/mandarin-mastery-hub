import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

/**
 * Saved-only browsing control shared by the Glyphs and Vocabulary libraries.
 *
 * Inputs: `on` (the URL-backed saved-only state), `count` (bookmarked records in the
 * current tab, independent of the other filters), `onToggle` (flips the URL state at
 * once — it is not a draft, so unapplied search/dropdown edits stay untouched) and
 * `noun` for accessible labels ("glyphs", "words"…).
 *
 * Two presentations of the same state:
 * - SavedFilterToggle: a compact bookmark button with the count, used inline after the
 *   desktop dropdowns and beside the phone Filters button.
 * - SavedFilterRow: the "Saved only" switch row that opens the phone Filters drawer.
 */
export type SavedFilter = { on: boolean; count: number; onToggle: () => void; noun: string };

export function SavedFilterToggle({ on, count, onToggle, noun }: SavedFilter) {
  return <Button type="button" variant="outline" size="sm" className={`saved-filter-toggle${on ? ' selected' : ''}`} aria-pressed={on}
    aria-label={on ? `Show all ${noun} (showing ${count} saved)` : `Show only saved ${noun} (${count})`}
    title={on ? `Showing saved ${noun} only` : `Show only saved ${noun}`} onClick={onToggle}>
    <Bookmark fill={on ? 'currentColor' : 'none'}/><span className="saved-filter-count">{count.toLocaleString('en-US')}</span>
  </Button>;
}

export function SavedFilterRow({ on, count, onToggle, noun }: SavedFilter) {
  return <label className="saved-filter-row">
    <Bookmark fill={on ? 'currentColor' : 'none'}/><span className="saved-filter-row-label">Saved only</span>
    <span className="saved-filter-row-count">{count.toLocaleString('en-US')} saved</span>
    <Switch checked={on} onCheckedChange={onToggle} aria-label={`Show only saved ${noun}`}/>
  </label>;
}

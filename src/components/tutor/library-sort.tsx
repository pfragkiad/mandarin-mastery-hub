import { Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterSelect } from './filter-select';
import type { LibrarySort as Sort } from '@/lib/library-order';

/** Immediate shared control; caller owns URL mode/seed and resets page/selection.
 * Reshuffle replaces the whole deck order, never just the visible page. */
export function LibrarySort({ value, words = false, onChange, onReshuffle }: { value: Sort; words?: boolean; onChange: (sort: Sort) => void; onReshuffle: () => void }) {
  const normalized: Sort = value === 'hsk' ? 'rank' : value;
  return <div className="flex shrink-0 items-center gap-1">
    {/* Words/Phrases: the default order IS the recorded HSK index, so it is the
        first entry's label rather than a separate option. */}
    <FilterSelect
      value={normalized}
      onValueChange={next => { if (next === 'rank' || next === 'pinyin' || next === 'hsk' || next === 'random') onChange(next); }}
      ariaLabel="Sort order"
      className="min-w-44"
      items={[
        { value: 'rank', label: words ? 'HSK index' : 'Frequency rank' },
        { value: 'pinyin', label: 'Pinyin' },
        { value: 'random', label: 'Shuffle' },
      ]}
    />
    {value === 'random' && <Button type="button" variant="ghost" size="icon" aria-label="Reshuffle" title="Reshuffle the whole deck" onClick={onReshuffle}><Shuffle/></Button>}
  </div>;
}

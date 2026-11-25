import { Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import type { LibrarySort as Sort } from '@/lib/library-order';
/** Immediate shared control; caller owns URL mode/seed and resets page/selection.
 * Reshuffle replaces the whole deck order, never just the visible page. */
export function LibrarySort({ value, words = false, onChange, onReshuffle }: { value: Sort; words?: boolean; onChange: (sort: Sort) => void; onReshuffle: () => void }) {
  return <div className="flex shrink-0 items-center gap-1">
    <Select value={value} onValueChange={next => { if (next === 'rank' || next === 'pinyin' || next === 'hsk' || next === 'random') onChange(next); }}>
      <SelectTrigger className="filter-select min-w-32" aria-label="Sort order"><SelectValue/></SelectTrigger>
      {/* Words/Phrases: the default order IS the recorded HSK index, so it is the
          first entry's label rather than a separate option. */}
      <SelectContent><SelectItem value="rank">{words ? 'HSK index' : 'Frequency rank'}</SelectItem><SelectItem value="pinyin">Pinyin</SelectItem><SelectItem value="random">Shuffle</SelectItem></SelectContent>
    </Select>
    {value === 'random' && <Button type="button" variant="ghost" size="icon" aria-label="Reshuffle" title="Reshuffle the whole deck" onClick={onReshuffle}><Shuffle/></Button>}
  </div>;
}

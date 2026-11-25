import { radicalCardRecord, type LibraryEntry, type LibraryKind } from './character-library';
import { includeScript } from './learning-preferences';
import { usageGroupFor, usageGroups, usageRank, usageRankMatches } from './usage-frequency';
import { matchesStrokeFilter } from './stroke-range';

/** Available opposite-filter choices from recorded entries, not pages or selected
 * detail exceptions. Each facet ignores itself so replacing it remains possible.
 * The caller memoizes applied values; draft typing never runs this scan.
 * usageUpTo/strokesUpTo mirror filterLibrary's cumulative widening ("include
 * lower ranks" / "include fewer strokes"), so availability never offers a
 * choice the widened filter would empty. */
export function libraryFilterOptions(entries: readonly LibraryEntry[], kind: LibraryKind, includeTraditional: boolean, usage?: string, strokes = '', usageUpTo = false, strokesUpTo = false, hideRadicals = false) {
  const counts = new Set<number>();
  const ranks = new Set<string>();
  for (const entry of entries) {
    if (!includeScript(entry.script, includeTraditional)) continue;
    // The "hide radicals" switch is an applied pick too, so a hidden radical card can never
    // keep a rank group or stroke count alive that the visible list no longer offers.
    if (hideRadicals && radicalCardRecord(entry, kind, entries, includeTraditional)) continue;
    const rank = usageRank(entry, kind, includeTraditional);
    const group = usageGroupFor(kind, rank);
    const usageOk = !usage || usageRankMatches(kind, rank, usage, usageUpTo);
    const strokesOk = matchesStrokeFilter(entry.strokes, strokes, strokesUpTo);
    if (usageOk && entry.strokes) counts.add(entry.strokes);
    if (strokesOk && group) ranks.add(group.value);
  }
  return {
    strokes: [...counts].sort((a, b) => a - b),
    ranks: usageGroups(kind).filter(group => ranks.has(group.value)),
  };
}

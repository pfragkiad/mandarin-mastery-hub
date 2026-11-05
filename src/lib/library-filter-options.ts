import type { LibraryEntry, LibraryKind } from './character-library';
import { includeScript } from './learning-preferences';
import { usageGroupFor, usageGroups, usageRank } from './usage-frequency';

/** Available opposite-filter choices from recorded entries, not pages or selected
 * detail exceptions. Each facet ignores itself so replacing it remains possible.
 * The caller memoizes applied values; draft typing never runs this scan. */
export function libraryFilterOptions(entries: readonly LibraryEntry[], kind: LibraryKind, includeTraditional: boolean, usage?: string, strokes = '') {
  const counts = new Set<number>();
  const ranks = new Set<string>();
  for (const entry of entries) {
    if (!includeScript(entry.script, includeTraditional)) continue;
    const group = usageGroupFor(kind, usageRank(entry, kind, includeTraditional));
    if ((!usage || group?.value === usage) && entry.strokes) counts.add(entry.strokes);
    if ((!strokes || entry.strokes === Number(strokes)) && group) ranks.add(group.value);
  }
  return {
    strokes: [...counts].sort((a, b) => a - b),
    ranks: usageGroups(kind).filter(group => ranks.has(group.value)),
  };
}
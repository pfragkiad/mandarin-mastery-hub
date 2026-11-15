import type { LibraryEntry, LibraryKind } from './character-library';
import { includeScript } from './learning-preferences';
import { UNRANKED, usageGroupFor, usageGroups, usageRank } from './usage-frequency';

/** Available opposite-filter choices from recorded entries, not pages or selected
 * detail exceptions. Each facet ignores itself so replacing it remains possible.
 * The caller memoizes applied values; draft typing never runs this scan.
 * usageUpTo/strokesUpTo mirror filterLibrary's cumulative widening ("include
 * lower ranks" / "include fewer strokes"), so availability never offers a
 * choice the widened filter would empty. */
export function libraryFilterOptions(entries: readonly LibraryEntry[], kind: LibraryKind, includeTraditional: boolean, usage?: string, strokes = '', usageUpTo = false, strokesUpTo = false) {
  const counts = new Set<number>();
  const ranks = new Set<string>();
  const usageGroup = usage ? usageGroups(kind).find(group => group.value === usage) : undefined;
  const cumulativeUsage = Boolean(usageUpTo && usageGroup && usageGroup.value !== UNRANKED && Number.isFinite(usageGroup.max));
  const maxStrokes = strokesUpTo && strokes ? Number(strokes) : null;
  for (const entry of entries) {
    if (!includeScript(entry.script, includeTraditional)) continue;
    const rank = usageRank(entry, kind, includeTraditional);
    const group = usageGroupFor(kind, rank);
    const usageOk = !usage || (cumulativeUsage ? rank !== null && rank <= usageGroup.max : group?.value === usage);
    const strokesOk = !strokes || (maxStrokes !== null ? entry.strokes !== undefined && entry.strokes <= maxStrokes : entry.strokes === Number(strokes));
    if (usageOk && entry.strokes) counts.add(entry.strokes);
    if (strokesOk && group) ranks.add(group.value);
  }
  return {
    strokes: [...counts].sort((a, b) => a - b),
    ranks: usageGroups(kind).filter(group => ranks.has(group.value)),
  };
}

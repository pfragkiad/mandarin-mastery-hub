import type { CharacterEnrichment, ComponentOccurrence } from './character-enrichment';

export type PracticeStrokeGroup = { id: string; glyph: string | null; strokeIndices: number[]; palette: number };
export const DEFAULT_GROUPING_SOURCE = 'make-me-a-hanzi';

/** Receives only checksum-validated mappings; never interprets an IDS as stroke assignments. */
export function practiceStrokeGroups(character: string, count: number, record: CharacterEnrichment | null | undefined,
  radical = false, source = DEFAULT_GROUPING_SOURCE): PracticeStrokeGroup[] {
  const all = Array.from({ length: count }, (_, i) => i);
  const whole = () => [{ id: 'whole', glyph: character, strokeIndices: all, palette: 0 }];
  if (radical || !record || record.bindings.strokeCount !== count || source !== DEFAULT_GROUPING_SOURCE || record.mapping.status === 'unavailable') return whole();
  const groups: PracticeStrokeGroup[] = record.mapping.groups.map((group, palette) => ({
    id: JSON.stringify(group.path), glyph: group.glyph, strokeIndices: [...group.strokeIndices], palette,
  }));
  if (!groups.length) return whole();
  if (record.mapping.unknownStrokeIndices.length) groups.push({ id: 'unassigned', glyph: null,
    strokeIndices: [...record.mapping.unknownStrokeIndices], palette: groups.length });
  const indices = groups.flatMap(group => group.strokeIndices);
  if (indices.length !== count || new Set(indices).size !== count || indices.some(i => i < 0 || i >= count)) return whole();
  return groups;
}

export function componentGroups(character: string, count: number, groups: ComponentOccurrence[]): PracticeStrokeGroup[] {
  return practiceStrokeGroups(character, count, { bindings: { strokeCount: count }, mapping: { status: 'complete', groups, unknownStrokeIndices: [] } } as CharacterEnrichment);
}

export function strokeGroupAt(groups: PracticeStrokeGroup[], index: number) {
  return groups.find(group => group.strokeIndices.includes(index));
}
export function componentInk(palette = 0): string { return `var(--component-ink-${palette % 8})`; }

/** Split only at writing-order boundaries; noncontiguous occurrences retain the same identity/color. */
export function strokeGroupRuns(groups: PracticeStrokeGroup[], count: number) {
  const runs: { group: PracticeStrokeGroup; indices: number[] }[] = [];
  for (let i = 0; i < count; i++) {
    const group = strokeGroupAt(groups, i);
    if (!group) continue;
    const last = runs[runs.length - 1];
    if (last?.group.id === group.id) last.indices.push(i);
    else runs.push({ group, indices: [i] });
  }
  return runs;
}
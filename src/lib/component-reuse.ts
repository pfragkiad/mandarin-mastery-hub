import type { DecompositionNode } from './character-library';
import type { CatalogRow } from './catalog-store';

export const reuseGroups = [
  { value: 'very-frequent', label: 'Very frequent', min: 100, max: Infinity },
  { value: 'frequent', label: 'Frequent', min: 20, max: 99 },
  { value: 'moderate', label: 'Moderate', min: 5, max: 19 },
  { value: 'less-frequent', label: 'Less frequent', min: 1, max: 4 },
  { value: 'unrecorded', label: 'No recorded usage', min: 0, max: 0 },
] as const;
export type ReuseGroup = typeof reuseGroups[number]['value'];
export function reuseGroup(count: number) {
  return reuseGroups.find(group => count >= group.min && count <= group.max) ?? reuseGroups[4];
}

/** Imported Unihan dictionary assignments, not component appearances. */
export function countRadicalUsage(radicals: string[], characters: CatalogRow[]): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(radicals.map(glyph => [glyph, 0]));
  const seen = new Set<string>();
  for (const [glyph, , , note] of characters) {
    if (seen.has(glyph)) continue;
    seen.add(glyph);
    const radical = note.match(/·\s*(.+?) radical$/)?.[1];
    if (radical && Object.hasOwn(counts, radical)) counts[radical] = (counts[radical] ?? 0) + 1;
  }
  return counts;
}

/** Count each component once per distinct parent character, including both scripts. */
export function countComponentReuse(components: string[], characters: string[], trees: Record<string, DecompositionNode>): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(components.map(glyph => [glyph, 0]));
  for (const parent of new Set(characters)) {
    const tree = trees[parent];
    if (!tree) continue;
    const seen = new Set<string>();
    const visit = (node: DecompositionNode) => {
      if (node.glyph !== parent && Object.hasOwn(counts, node.glyph)) seen.add(node.glyph);
      node.children?.forEach(visit);
    };
    visit(tree);
    seen.forEach(glyph => { counts[glyph] = (counts[glyph] ?? 0) + 1; });
  }
  return counts;
}
// Simplified ↔ traditional script groups (public/data/character-variants.json, built by
// scripts/import-character-variants.py from mutual Unihan variant links). Loaded lazily with
// the catalogue. Groups only decide presentation — which records share one library card;
// every glyph keeps its own record, reading, meaning, rank and strokes.
export type CharacterVariantFile = { schemaVersion: number; source: string; groups: Record<string, string[]> };

export const characterVariants = { source: '', groups: {} as Record<string, string[]>, head: {} as Record<string, string> };

export function hydrateCharacterVariants(file: CharacterVariantFile) {
  characterVariants.source = file.source;
  characterVariants.groups = file.groups;
  characterVariants.head = {};
  for (const [simplified, forms] of Object.entries(file.groups)) for (const form of forms) characterVariants.head[form] = simplified;
}

/** The simplified glyph that owns this glyph's card (itself when it heads or has no group). */
export const scriptHead = (glyph: string) => characterVariants.head[glyph] ?? glyph;
/** Simplified head first, then its recorded traditional forms; a lone glyph returns [glyph]. */
export const scriptGroup = (glyph: string) => { const head = scriptHead(glyph); return [head, ...(characterVariants.groups[head] ?? [])]; };

/** Collapse grouped traditional records into their simplified card, keeping first-seen order.
 * `all` resolves a head that the filtered list itself lacks (e.g. a search matching only 爺).
 * `head` picks the card owner; Components pass componentCardHead so radical-family forms
 * (刂, ⺈) also fold into their main form's card. First-seen order means a card sits at its
 * best-ranked member's position in a rank-sorted list. */
export function collapseScriptForms<T extends { id: string; hanzi: string }>(entries: T[], all: T[], head: (glyph: string) => string = scriptHead): T[] {
  const byGlyph = new Map(all.map(entry => [entry.hanzi, entry]));
  const seen = new Set<string>();
  const out: T[] = [];
  for (const entry of entries) {
    const card = byGlyph.get(head(entry.hanzi)) ?? entry;
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    out.push(card);
  }
  return out;
}

import { glyphIndex, libraryEntries, radicalVariantEntry, savedGlyphDestination, type LibraryEntry, type LibraryKind } from './character-library';
import { catalog } from './catalog-store';
import { isRadicalGlyph } from './card-ink';
import { includeScript } from './learning-preferences';
import finderMissing from '@/data/finder-missing.json';

/**
 * Which library record a Hanzi finder match opens (browser-safe).
 *
 * One exact glyph is one result: in "All", a glyph recorded in several
 * libraries resolves like every glyph link (glyphIndex: the radical card wins,
 * then Characters, then Components), so the same form never appears twice.
 * Characters and Components scopes only accept glyphs that are records of that
 * library. The Radicals scope accepts every match that wears radical gold: it
 * resolves exactly like "All" (so the tile, label and destination never differ
 * between the two filters) and keeps the radical cards, the family variant forms
 * (⻏) and any Components/Characters record with an exact radical identity
 * (isRadicalGlyph, the same test as the ink): 阝 "Component · Radical", 门
 * "Character · Radical". Nothing is added by shape, only by recorded identity.
 * The Traditional preference filters by the exact record's script. Returns null
 * for glyphs outside the scope, never a look-alike substitute.
 *
 * Radical variant forms that are not library records (⻏ in family #163) resolve
 * to their exact family form instead (radicalVariantEntry, Radicals kind), so the
 * match opens the family card with that form selected. Only a form recorded in
 * exactly one family qualifies: a glyph shared by several families stays out
 * rather than picking one.
 */
export type FinderScope = 'all' | 'Characters' | 'Components' | 'Radicals';
export const FINDER_SCOPES: { key: FinderScope; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'Characters', label: 'Characters' }, { key: 'Components', label: 'Components' }, { key: 'Radicals', label: 'Radicals' },
];
const kindLabels: Record<LibraryKind, string> = { Characters: 'Character', Components: 'Component', Radicals: 'Radical', Strokes: 'Stroke' };
/** The tile label: the library the match opens, plus "· Radical" whenever the tile wears
 *  radical gold for another library (isRadicalGlyph, the same exact-identity test as the
 *  ink), so 阝 reads "Component · Radical" and its colour never contradicts its label. */
function matchLabel(kind: LibraryKind, entry: LibraryEntry): string {
  return kind !== 'Radicals' && isRadicalGlyph(entry, kind) ? `${kindLabels[kind]} · ${kindLabels.Radicals}` : kindLabels[kind];
}

const byKind = new WeakMap<LibraryEntry[], Map<string, LibraryEntry>>();
function record(kind: LibraryKind, glyph: string) {
  const all = libraryEntries(kind);
  let map = byKind.get(all);
  if (!map) { map = new Map(all.map(e => [e.hanzi, e])); byKind.set(all, map); }
  return map.get(glyph);
}

export function finderRecord(glyph: string, scope: FinderScope, includeTraditional: boolean): { kind: LibraryKind; kindLabel: string; entry: LibraryEntry } | null {
  const kind: LibraryKind | undefined = scope === 'all' || scope === 'Radicals' ? glyphIndex()[glyph]?.kind : scope;
  const entry = kind ? record(kind, glyph) : undefined;
  // Radicals keeps only gold matches; anything else (你) stays out of that filter.
  if (entry && kind && scope === 'Radicals' && kind !== 'Radicals' && !isRadicalGlyph(entry, kind)) return null;
  if (!entry) {
    const variant = scope === 'all' || scope === 'Radicals' ? radicalVariantRecord(glyph) : undefined;
    return variant && includeScript(variant.script, includeTraditional) ? { kind: 'Radicals', kindLabel: kindLabels.Radicals, entry: variant } : null;
  }
  if (!kind || !includeScript(entry.script, includeTraditional)) return null;
  return { kind, kindLabel: matchLabel(kind, entry), entry };
}

/** Where a finder match opens: a variant form opens its family card with that exact form
 *  selected (family-qualified, like a saved variant); any record opens itself. */
export function finderDestination(kind: LibraryKind, entry: LibraryEntry) {
  return entry.radicalVariant ? savedGlyphDestination(entry) : { tab: kind, character: entry.hanzi };
}

// Variant-only forms by exact glyph, rebuilt when the catalogue (and its radical sidecar) changes.
const variantCache: { version: number; map: Map<string, LibraryEntry> | null } = { version: -1, map: null };
/** The exact family-qualified variant entry for a glyph that is a radical-family form but no
 *  library record, or undefined (not a form, a record already, or a form of several families). */
function radicalVariantRecord(glyph: string): LibraryEntry | undefined {
  if (variantCache.version !== catalog.version || !variantCache.map) {
    const owners = new Map<string, { familyId: number; key: string }[]>();
    for (const family of catalog.radicalStrokes.families ?? []) for (const form of family.forms) {
      owners.set(form.character, [...(owners.get(form.character) ?? []), { familyId: family.id, key: form.key }]);
    }
    const map = new Map<string, LibraryEntry>();
    for (const [character, list] of owners) {
      const only = list.length === 1 ? list[0] : undefined;
      if (!only || (['Radicals', 'Characters', 'Components'] as LibraryKind[]).some(kind => record(kind, character))) continue;
      const family = (catalog.radicalStrokes.families ?? []).find(item => item.id === only.familyId);
      const heading = family && libraryEntries('Radicals').find(entry => entry.kangxiIndex === family.id && entry.hanzi === family.kangxiHeading);
      const form = family?.forms.find(item => item.key === only.key);
      if (heading && form) map.set(character, radicalVariantEntry(heading, form));
    }
    variantCache.version = catalog.version; variantCache.map = map;
  }
  return variantCache.map.get(glyph);
}

const missing = new Set(finderMissing.missing);
/**
 * Whether the finder index holds recorded strokes for this exact glyph, decided
 * without fetching the index: the index covers exactly the Characters,
 * Components and Radicals record glyphs minus finder-missing.json (both written
 * by scripts/build-finder-medians.py), plus every radical-family form (⻏), which
 * Practice traces too. Forms without exact recorded geometry (⺿, outlined only
 * through a reviewed look-alike) are in `missing`, so they offer no "Find similar".
 */
export function finderCoversGlyph(glyph: string): boolean {
  if (missing.has(glyph)) return false;
  return (['Radicals', 'Characters', 'Components'] as LibraryKind[]).some(kind => record(kind, glyph) !== undefined)
    || (catalog.radicalStrokes.families ?? []).some(family => family.forms.some(form => form.character === glyph));
}

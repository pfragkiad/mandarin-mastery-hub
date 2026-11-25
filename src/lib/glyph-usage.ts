import { radicalFamily, radicalForms } from './radical-strokes';
import type { DecompositionNode, LibraryEntry, LibraryKind } from './character-library';
import { gSourceDecompositions, loadRecord, type CharacterEnrichment } from './character-enrichment';
import { includeScript } from './learning-preferences';
import type { Word } from './mandarin';
import { sortByUsage } from './usage-frequency';
import { breakdownUsesForm } from './radical-context';
import { breakdownDisplayGlyph, radicalIdentity } from './radical-identities';

export type GlyphUsage = { word: Word; sentence: boolean; matchedGlyph: string };
const containsComponent = (node: DecompositionNode, glyph: string): boolean => node.glyph === glyph || Boolean(node.children?.some(child => containsComponent(child, glyph)));

export type EnrichmentLoader = (character: string) => Promise<CharacterEnrichment | null>;

/** Every form of each radical family the glyph belongs to (exact recorded forms plus the
 * family heading): 聿 and 肀 are one family, so neither is ever a parent character of the
 * other. A radical is the family itself, never a compound built from its own forms, even
 * when BabelStone draws 聿 as ⿻肀二. Exact form identity only, never shape similarity. */
export function ownRadicalFamilyForms(glyph: string, kangxiIndex?: number): Set<string> {
  const families = [...(kangxiIndex !== undefined ? [radicalFamily(kangxiIndex)] : []), ...radicalForms(glyph).map(match => match.family)];
  const forms = new Set([glyph]);
  for (const family of families) {
    if (!family) continue;
    forms.add(family.kangxiHeading);
    forms.add(family.canonical);
    for (const form of family.forms) forms.add(form.character);
  }
  return forms;
}

/** Component parents come only from recorded BabelStone direct-G trees, never the Hanzi structure. */
export async function glyphParentCharactersGSource(entry: LibraryEntry, characters: LibraryEntry[], includeTraditional = false, load: EnrichmentLoader = loadRecord): Promise<LibraryEntry[]> {
  const seen = new Set<string>();
  const own = ownRadicalFamilyForms(entry.hanzi);
  const candidates = characters.filter(parent => {
    if (own.has(parent.hanzi) || seen.has(parent.id) || !includeScript(parent.script, includeTraditional)) return false;
    seen.add(parent.id);
    return true;
  });
  const matches = await Promise.all(candidates.map(async parent => {
    const record = await load(parent.hanzi);
    const related = gSourceDecompositions(record).some(alternative => alternative.tree && containsComponent(alternative.tree, entry.hanzi));
    return related ? parent : null;
  }));
  return sortByUsage(matches.filter((parent): parent is LibraryEntry => parent !== null), 'Characters', includeTraditional);
}

/** Recorded BabelStone direct-G trees per character, already loaded by the caller. */
export type GSourceTrees = (character: string) => DecompositionNode[];

const isMultiFormRadical = (entry: LibraryEntry) => entry.kangxiIndex !== undefined && new Set(radicalFamily(entry.kangxiIndex)?.forms.map(form => form.character) ?? []).size > 1;

/** Exact recorded relationships only; exclude the glyph's own radical family, hidden scripts
 * and duplicate records.
 * Radical examples: characters whose dictionary radical is the family heading. When the
 * family has several forms (刀 / 刂 / ⺈), the parent must also contain the exact selected
 * form in a recorded BabelStone direct-G tree (`gSource`, loaded by radicalParentCharacters),
 * so each variant only lists characters that use that form. Without those trees a
 * multi-form variant lists nothing (fail closed) — the Hanzi graphical structure is never
 * consulted for radicals. */
export function glyphParentCharacters(entry: LibraryEntry, kind: LibraryKind, characters: LibraryEntry[], includeTraditional = false, familyGlyph?: string, gSource?: GSourceTrees): LibraryEntry[] {
  if (kind !== 'Components' && kind !== 'Radicals') return [];
  const seen = new Set<string>();
  const assigned = familyGlyph ?? entry.hanzi;
  const own = ownRadicalFamilyForms(entry.hanzi, kind === 'Radicals' ? entry.kangxiIndex : undefined);
  const multiForm = kind === 'Radicals' && isMultiFormRadical(entry);
  return sortByUsage(characters.filter(parent => {
    if (own.has(parent.hanzi) || seen.has(parent.id) || !includeScript(parent.script, includeTraditional)) return false;
    const related = kind === 'Radicals'
      // Shared glyphs count for the form their context resolves to (鄱's right-side 阝 → ⻏ of 邑).
      ? parent.note.match(/·\s*(.+?) radical$/)?.[1] === assigned && (!multiForm || Boolean(gSource && entry.kangxiIndex !== undefined && gSource(parent.hanzi).some(tree => breakdownUsesForm(tree, parent.hanzi, entry.kangxiIndex!, entry.hanzi))))
      : Boolean(parent.decomposition && containsComponent(parent.decomposition.root, entry.hanzi));
    if (related) seen.add(parent.id);
    return related;
  }), 'Characters', includeTraditional);
}

/** BabelStone often writes a radical form with another code point (𥫗 for ⺮, ⺝ for 月).
 * A token counts as a family form only through recorded links: the radical file's alias list
 * (breakdownDisplayGlyph, ⺝ → 月), an owner-reviewed link (REVIEWED_RADICAL_FORM_LINKS, 𤣩 → 王)
 * or a Unihan equivalent glyph that is itself a form of the token's single recorded Kangxi family
 * (𥫗 ↔ ⺮). Unlinked look-alikes keep their code point, so no shape similarity ever creates a match. The source tree is not mutated. */
/** Owner-reviewed BabelStone token links (confirmed by the owner, 2026-11-16). No Unihan field
 * records these, so they are listed here explicitly rather than derived: each is the compressed
 * shape BabelStone writes for a radical form in position. Only radical "In a character" matching
 * reads them (through sourcedFormGlyph); source trees, breakdown display and identities keep the
 * exact BabelStone code point. 𫇦 is 艹 over 冖 (茔, 营), so it counts as containing 艹; 艸, 艹
 * and ⺿ stay separate recorded forms of #140 and are never merged into one another. */
export const REVIEWED_RADICAL_FORM_LINKS: Readonly<Record<string, { family: number; form: string }>> = {
  '𤣩': { family: 96, form: '王' }, // jade 王 on the left: 玩 = ⿰𤣩元
  '𠆢': { family: 9, form: '人' }, // top 人: 今, 会
  '𧘇': { family: 145, form: '衣' }, // lower 衣: 表
  '𫜹': { family: 58, form: '彐' }, // 归, 当, 彗
  '𫇦': { family: 140, form: '艹' }, // 艹 over 冖: 茔, 营 (contains 艹)
};

function sourcedFormGlyph(token: string): string {
  const reviewed = REVIEWED_RADICAL_FORM_LINKS[token];
  if (reviewed && radicalFamily(reviewed.family)?.forms.some(item => item.character === reviewed.form)) return reviewed.form;
  const identity = radicalIdentity(token);
  if (identity.radicals.length === 1) {
    const family = radicalFamily(identity.radicals[0]!.number);
    // A token that is itself a recorded form (肉, ⺼) keeps its own identity.
    if (family?.forms.some(item => item.character === token)) return token;
    const form = family?.forms.find(item => item.character !== token && identity.equivalentGlyphs.includes(item.character));
    if (form) return form.character;
  }
  return breakdownDisplayGlyph(token);
}
const withSourcedForms = (node: DecompositionNode): DecompositionNode => ({ ...node, glyph: sourcedFormGlyph(node.glyph), ...(node.children ? { children: node.children.map(withSourcedForms) } : {}) });

/** Radical "In a character" examples: dictionary-assigned candidates, with multi-form
 * families checked against lazily loaded BabelStone direct-G trees (only the candidates'
 * sidecars are fetched, never the whole catalogue). */
export async function radicalParentCharacters(entry: LibraryEntry, characters: LibraryEntry[], includeTraditional = false, familyGlyph?: string, load: EnrichmentLoader = loadRecord): Promise<LibraryEntry[]> {
  if (!isMultiFormRadical(entry)) return glyphParentCharacters(entry, 'Radicals', characters, includeTraditional, familyGlyph);
  const assigned = familyGlyph ?? entry.hanzi;
  const candidates = characters.filter(parent => parent.note.match(/·\s*(.+?) radical$/)?.[1] === assigned);
  const trees = new Map<string, DecompositionNode[]>();
  await Promise.all([...new Set(candidates.map(parent => parent.hanzi))].map(async hanzi => {
    trees.set(hanzi, gSourceDecompositions(await load(hanzi)).flatMap(alternative => alternative.tree ? [withSourcedForms(alternative.tree)] : []));
  }));
  return glyphParentCharacters(entry, 'Radicals', candidates, includeTraditional, familyGlyph, hanzi => trees.get(hanzi) ?? []);
}

/** Existing text and explicit source relationships only; no inferred stroke shapes. */
export function glyphUsage(entry: LibraryEntry, kind: LibraryKind, items: Word[], characters: LibraryEntry[], includeTraditional = false): GlyphUsage[] {
  if (kind === 'Strokes') return [];
  const glyphs = new Set(kind === 'Characters' ? [entry.hanzi] : []);
  if (kind === 'Radicals' || kind === 'Components') {
    for (const parent of glyphParentCharacters(entry, kind, characters, includeTraditional)) glyphs.add(parent.hanzi);
  }
  const seen = new Set<string>();
  const results: GlyphUsage[] = [];
  for (const sentence of [true, false]) {
    for (const word of items) {
      if (!includeScript(word.script, includeTraditional)) continue;
      const text = sentence ? word.sentence : word.hanzi;
      const matchedGlyph = Array.from(text).find(glyph => glyphs.has(glyph));
      if (!text || !matchedGlyph || seen.has(text) || results.some(result => result.word.id === word.id)) continue;
      seen.add(text);
      results.push({ word, sentence, matchedGlyph });
      if (results.length === 2) return results;
    }
  }
  return results;
}
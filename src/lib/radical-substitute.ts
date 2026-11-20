import { catalog } from './catalog-store';
import { libraryEntries, radicalVariantEntry, radicalVariantFallback, type LibraryEntry } from './character-library';
import { sharesFamilyReading } from './component-families';
import { radicalFamily, type RadicalForm } from './radical-strokes';

/**
 * Radical-family "substitutes" (owner's term): forms recorded under a Kangxi family whose exact
 * glyph is an independent character with BOTH its own sound and its own meaning — 西 xī "west"
 * under #146 襾 yà "cover", 母 mǔ "mother" under #80 毋 wú "do not". They are associated glyphs,
 * not true variants, so they get their own Radicals card (same detail card), a "Substitute" label
 * in the form switch and their own brown identity ink.
 *
 * Inputs: the family id and exact form key (duplicate glyphs keep separate keys). A form is a
 * substitute only when every recorded check passes; anything uncertain stays an ordinary variant:
 *   1. it is a recorded `variant` form (never the canonical form or the Kangxi heading);
 *   2. it presents its own record — radicalVariantFallback finds nothing to inherit, so a reviewed
 *      contextual identity (#96's jade 王 reads yù) or an unnamed component form never qualifies;
 *   3. its own recorded reading differs from the family's (component-families sharesFamilyReading:
 *      氵 "shui" ↔ 水 shuǐ is the same sound, 灬 biāo is not);
 *   4. its own recorded meaning shares no sense with the family heading's — placeholders such as
 *      "Kangxi radical 146" or "variant of Kangxi radical 146" are not senses — so 灬 "fire",
 *      纟 "silk", 虎 "tiger" and 覀 (only a placeholder) stay variants.
 * Data only: nothing is inferred from shape, and the standalone records stay untouched.
 */

const PLACEHOLDER = /^(?:(?:the )?first form is |simplified |variant of (?:the )?)?(?:kang[xz]i )?(?:radical|rad\.)(?:\s*(?:number|no\.))?\s*#?\s*\d+$/i;
/** Comparable senses of a meaning: split at ; and , lower-cased, articles and "to" dropped,
 *  placeholders removed. */
function senses(meaning: string): string[] {
  return meaning.split(/[;,]/).map(part => part.trim().toLowerCase().replace(/^\((?:same as|variant of)[^)]*\)\s*/, '').replace(/^(?:to|a|an|the)\s+/, '').replace(/[.。]+$/, '').trim())
    .filter(part => part && !PLACEHOLDER.test(part) && !/^radical\s*\d+/.test(part));
}

const exactRecord = (glyph: string) => libraryEntries('Components').find(item => item.hanzi === glyph) ?? libraryEntries('Characters').find(item => item.hanzi === glyph);

let cacheVersion = -1;
let keys = new Set<string>();
let cards: LibraryEntry[] | null = null;

function build() {
  if (cacheVersion === catalog.version) return;
  cacheVersion = catalog.version;
  keys = new Set();
  cards = null;
  const headings = new Map(libraryEntries('Radicals').flatMap(entry => entry.kangxiIndex ? [[entry.kangxiIndex, entry] as const] : []));
  for (const family of catalog.radicalStrokes.families ?? []) {
    const heading = headings.get(family.id);
    if (!heading || heading.hanzi !== family.kangxiHeading) continue;
    const familyReadings = [...family.familyPinyin.split(/[,/;]+/), ...heading.pinyin.split(/[,/;]+/)].map(part => part.trim()).filter(Boolean);
    const familySenses = new Set(senses(heading.meaning));
    for (const form of family.forms) {
      if (form.formKind !== 'variant' || form.character === family.canonical || form.character === family.kangxiHeading) continue;
      const own = exactRecord(form.character);
      if (!own?.pinyin.trim() || !own.meaning.trim()) continue;
      if (radicalVariantFallback(form.character, own.pinyin, family.id, form.key)) continue;
      if (sharesFamilyReading(own.pinyin, familyReadings)) continue;
      const mine = senses(own.meaning);
      if (!mine.length || mine.some(sense => familySenses.has(sense))) continue;
      keys.add(form.key);
    }
  }
}

/** Whether this exact family form is a substitute (rules above). */
export function isRadicalSubstitute(familyId: number | undefined, formKey: string | undefined): boolean {
  if (!familyId || !formKey) return false;
  build();
  return keys.has(formKey) && Boolean(radicalFamily(familyId)?.forms.some(form => form.key === formKey));
}

/** Same check for a form object of the given family. */
export const radicalFormIsSubstitute = (familyId: number, form: Pick<RadicalForm, 'key'>) => isRadicalSubstitute(familyId, form.key);

/**
 * One Radicals-grid card per substitute: the family-qualified variant entry (radicalVariantEntry,
 * the same identity a saved variant bookmark uses), so the card opens its family's detail card
 * with that form selected, and its rank, Radical #N pill and Practice link follow the family.
 */
export function radicalSubstituteEntries(): LibraryEntry[] {
  build();
  // Cached per catalogue version so memoized grid cards keep a stable entry object.
  if (cards) return cards;
  cards = libraryEntries('Radicals').flatMap(heading => {
    const family = heading.kangxiIndex ? radicalFamily(heading.kangxiIndex) : undefined;
    if (!family || heading.hanzi !== family.kangxiHeading) return [];
    return family.forms.filter(form => keys.has(form.key)).map(form => radicalVariantEntry(heading, form));
  });
  return cards;
}

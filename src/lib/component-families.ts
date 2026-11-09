// Components library card groups: radical-family forms that share one card.
//
// Purpose: a Kangxi family such as #18 刀 has several Components records (刀, 刂, ⺈).
// Like radical cards, those forms present on one card headed by the family's main form,
// while every form keeps its own record, reading, meaning, rank, strokes and bookmark.
// Grouping is presentation only and never changes identities.
//
// A form joins its family's card only when every check passes, so look-alikes with their
// own word identity (王 wáng, 巳 sì, 母 mǔ, 民 mín …) keep their own cards:
//   1. it is recorded as a form of exactly one family (radical-strokes families), and is
//      not a sourced shared form such as 阝 (邑 right / 阜 left);
//   2. any sourced Kangxi identity for it names that same family and only it
//      (⺀ is listed under 冫 but its identity is #3 丶, so it stays separate);
//   3. its own recorded reading is empty (it presents the family reading), equals the
//      family reading, or is the same syllable recorded without a tone mark
//      (氵 "shui" ↔ 水 shuǐ). A different recorded sound (纟 sī vs 糸 mì) keeps it apart.
// The family's main form (family.canonical) must itself be a Components record.
//
// Simplified/Traditional script partners (Unihan, character-variants.ts) of a member join
// the same card when Traditional is included, so 钅/釒 both sit on 金's card.
import { catalog } from './catalog-store';
import { radicalIdentity } from './radical-identities';
import { orderedRadicalForms } from './radical-strokes';
import { scriptGroup, scriptHead } from './character-variants';
import { includeScript, type CharacterScript } from './learning-preferences';

export type ComponentFamilyGroup = { familyId: number; head: string; forms: string[] };

const stripTones = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const hasToneMark = (value: string) => /[\u0300-\u036f1-5]/.test(value.normalize('NFD'));
const readings = (value: string) => value.split(/[,/;]+/).map(part => part.trim()).filter(Boolean);

/** True when the form's own recorded reading counts as the family's sound (rule 3 above). */
export function sharesFamilyReading(own: string, family: string[]): boolean {
  const mine = readings(own);
  if (!mine.length) return true;
  return mine.some(reading => family.some(target => reading === target || (!hasToneMark(reading) && stripTones(reading) === stripTones(target))));
}

let cacheVersion = -1;
let groupByGlyph = new Map<string, ComponentFamilyGroup>();

function build() {
  if (cacheVersion === catalog.version) return;
  cacheVersion = catalog.version;
  groupByGlyph = new Map();
  const ownReading = new Map(catalog.components.map(row => [row[0], row[1] ?? '']));
  const families = catalog.radicalStrokes.families ?? [];
  // Rule 1: a glyph recorded in more than one family is ambiguous and never grouped.
  const familyCount = new Map<string, number>();
  for (const family of families) for (const glyph of new Set(family.forms.map(form => form.character))) familyCount.set(glyph, (familyCount.get(glyph) ?? 0) + 1);
  const shared = catalog.radicalIdentities.sharedForms ?? {};
  for (const family of families) {
    const head = family.canonical;
    if (!ownReading.has(head)) continue;
    const familyReadings = [...readings(family.familyPinyin ?? ''), ...readings(ownReading.get(head) ?? '')];
    const forms = [head];
    for (const form of orderedRadicalForms(family)) {
      const glyph = form.character;
      if (forms.includes(glyph) || !ownReading.has(glyph)) continue;
      if ((familyCount.get(glyph) ?? 0) !== 1 || shared[glyph]) continue;
      const identity = radicalIdentity(glyph).radicals;
      if (identity.length && !(identity.length === 1 && identity[0]?.number === family.id)) continue;
      if (!sharesFamilyReading(ownReading.get(glyph) ?? '', familyReadings)) continue;
      forms.push(glyph);
    }
    if (forms.length < 2) continue;
    const group = { familyId: family.id, head, forms };
    for (const glyph of forms) groupByGlyph.set(glyph, group);
  }
}

/** The family group whose card shows this component form, if any. */
export function componentFamilyGroup(glyph: string): ComponentFamilyGroup | undefined {
  build();
  return groupByGlyph.get(glyph) ?? groupByGlyph.get(scriptHead(glyph));
}

/** Glyph whose Components card shows this form: family head, else (with Traditional) its script head. */
export function componentCardHead(glyph: string, includeTraditional: boolean): string {
  const family = componentFamilyGroup(glyph);
  if (family) return family.head;
  return includeTraditional ? scriptHead(glyph) : glyph;
}

/** Every glyph shown on the card headed by `glyph`'s card head, head first, in family order,
 * each followed by its Traditional script partners when Traditional is included. */
export function componentCardGlyphs(glyph: string, includeTraditional: boolean): string[] {
  const family = componentFamilyGroup(glyph);
  const base = family ? family.forms : [scriptHead(glyph)];
  const scripts = new Map(catalog.components.map(row => [row[0], row[4] as CharacterScript | undefined]));
  const out: string[] = [];
  // Only Components records, and Traditional ones only when the preference includes them.
  for (const form of base) for (const partner of includeTraditional ? scriptGroup(form) : [form]) if (!out.includes(partner) && scripts.has(partner) && includeScript(scripts.get(partner), includeTraditional)) out.push(partner);
  return out;
}

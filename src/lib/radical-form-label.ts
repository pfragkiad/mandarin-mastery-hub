import type { RadicalForm, RadicalFamily } from './radical-strokes';
import type { CharacterScript } from './learning-preferences';

/**
 * Label for one form tile in a Kangxi radical family (reference card and Practice switch).
 * Inputs: the exact form, its family, and that form's own recorded script (glyphScript).
 * - the family's canonical form reads "Standard";
 * - a recorded historical Kangxi heading reads "Traditional": such a heading only exists
 *   as a separate form when the family also has a Standard (Mainland) canonical form
 *   (貝 beside 贝), and there it is the family's traditional form;
 * - other forms read "Simplified" / "Traditional" only when their own script metadata says so
 *   (讠 / 訁); positional variants such as 氵 or 亻 have no such record and stay "Variant",
 *   so a label never claims a script relationship the data does not hold.
 */
export function radicalFormLabel(form: Pick<RadicalForm, 'character' | 'formKind'>, family: Pick<RadicalFamily, 'canonical'>, script: CharacterScript | undefined): string {
  if (form.formKind === 'kangxi-heading') return form.character === family.canonical ? 'Kangxi heading' : 'Traditional';
  if (form.character === family.canonical) return 'Standard';
  if (script === 'Simplified') return 'Simplified';
  if (script === 'Traditional') return 'Traditional';
  return 'Variant';
}

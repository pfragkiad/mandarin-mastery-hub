// Simplified ↔ traditional script groups (public/data/character-variants-v1.4.0.json, v1.4.0, owner-curated from
// the original Unihan import, scripts/import-character-variants.py). Loaded lazily with
// the catalogue. Groups only decide presentation — which records share one library card;
// every glyph keeps its own record, reading, meaning, rank and strokes.
//
// v1.4.0 also records per-pair associationNotes. A pair classified
// `context_dependent_not_error` (了 ↔ 瞭, 后 ↔ 後, 发 ↔ 發/髮 …) is a possible correspondence
// for some meanings only, so the whole association set of that simplified key is kept OFF
// shared cards: each form gets its own card and the set is presented as "Related written
// forms" with the recorded explanation, example and caveat. Ordinary associations
// (no note, or orthographic / regional / traditional-column / attested alternate notes on
// a key with no context-dependent pair) keep sharing one card as before.

/** One recorded note for a simplified → traditional association (verbatim from v1.4.0). */
export type AssociationNote = {
  classification: string;
  explanation: string;
  example?: string;
  usageCaveat?: string;
  unchangedSense?: string;
  sourceUrl?: string;
  evidenceScope?: string;
  lexicalEvidence?: { examples?: { simplifiedInput: string; attestedTargets: { attestedForm: string }[] }[] };
};

export type CharacterVariantFile = {
  schemaVersion: number;
  source: string;
  groups: Record<string, string[]>;
  revision?: { version?: string };
  associationNotes?: Record<string, Record<string, AssociationNote>>;
};

/** Classifications whose correspondence depends on meaning/context and so never share a card. */
export const CONTEXT_DEPENDENT = 'context_dependent_not_error';

export const characterVariants = {
  source: '',
  version: '',
  /** Card groups: simplified head → traditional forms that share its card. */
  groups: {} as Record<string, string[]>,
  head: {} as Record<string, string>,
  /** Context-dependent association sets: simplified key → every recorded traditional form. */
  related: {} as Record<string, string[]>,
  relatedHead: {} as Record<string, string>,
  notes: {} as Record<string, Record<string, AssociationNote>>,
  /** Simplified keys documented as staying unchanged in traditional writing for some meaning. */
  alsoTraditional: new Set<string>(),
};

/** True when a note documents the simplified key itself remaining unchanged in traditional
 *  writing: a recorded `unchangedSense`, an example written "A → A" containing the key
 *  (皇后 → 皇后, 茶几 → 茶几), or lexical evidence attesting the unchanged input. Never inferred
 *  from the classification alone. */
export function documentsUnchangedUse(simplified: string, note: AssociationNote) {
  if (note.unchangedSense?.trim()) return true;
  for (const part of (note.example ?? '').split(';')) {
    const match = part.match(/^\s*(\S+)\s*→\s*(\S+)/);
    if (match && match[1] === match[2] && match[1].includes(simplified)) return true;
  }
  return (note.lexicalEvidence?.examples ?? []).some(example => example.simplifiedInput.includes(simplified) && example.attestedTargets.some(target => target.attestedForm === example.simplifiedInput));
}

export function hydrateCharacterVariants(file: CharacterVariantFile) {
  const notes = file.associationNotes ?? {};
  characterVariants.source = file.source;
  characterVariants.version = file.revision?.version ?? '';
  characterVariants.notes = notes;
  characterVariants.groups = {};
  characterVariants.head = {};
  characterVariants.related = {};
  characterVariants.relatedHead = {};
  characterVariants.alsoTraditional = new Set();
  for (const [simplified, forms] of Object.entries(file.groups)) {
    const keyNotes = notes[simplified] ?? {};
    const contextual = forms.some(form => keyNotes[form]?.classification === CONTEXT_DEPENDENT);
    if (contextual) {
      characterVariants.related[simplified] = forms;
      for (const form of forms) characterVariants.relatedHead[form] = simplified;
      if (forms.some(form => keyNotes[form] && documentsUnchangedUse(simplified, keyNotes[form]))) characterVariants.alsoTraditional.add(simplified);
    } else {
      characterVariants.groups[simplified] = forms;
      for (const form of forms) characterVariants.head[form] = simplified;
    }
  }
}

/** The simplified glyph that owns this glyph's card (itself when it heads or has no group). */
export const scriptHead = (glyph: string) => characterVariants.head[glyph] ?? glyph;
/** Simplified head first, then its recorded traditional forms; a lone glyph returns [glyph]. */
export const scriptGroup = (glyph: string) => { const head = scriptHead(glyph); return [head, ...(characterVariants.groups[head] ?? [])]; };

/** Context-dependent association set containing `glyph` (simplified key first), or [] when none. */
export const relatedGroup = (glyph: string) => {
  const head = characterVariants.relatedHead[glyph] ?? (characterVariants.related[glyph] ? glyph : undefined);
  return head ? [head, ...characterVariants.related[head]] : [];
};
/** Recorded note for the association between a simplified key and one traditional form. */
export const associationNote = (simplified: string, traditional: string) => characterVariants.notes[simplified]?.[traditional];

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

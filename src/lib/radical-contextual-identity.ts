import data from '@/data/radical-contextual-identities.json';

/**
 * Reviewed contextual identities for radical variant forms whose recorded glyph is also an
 * independent character (radical #96's 王-shaped jade component vs the character 王 wáng).
 *
 * Source: src/data/radical-contextual-identities.json, extracted verbatim from the supplied
 * public/data/radical_variant_etymology_audit.json by scripts/import-radical-contextual-identities.py.
 *
 * Input: the selected family id, its exact form key and the recorded glyph. All three must
 * match the reviewed record, so the identity applies only when that exact variant is selected
 * (reference variant card, family-qualified Practice, saved variant bookmarks). The standalone
 * character, Components record, stroke data and examples keep their own data untouched.
 */
export type ContextualVariantIdentity = {
  familyId: number;
  formKey: string;
  recordedFormGlyph: string;
  displayGlyph: string;
  aliases: string[];
  parentRadical: string;
  parentRadicalPinyin: string;
  meaning: string;
  preferredLabel: string;
  /** Plain learner wording for the card; the technical readingNote lives in its tooltip. */
  learnerNote: string | null;
  /** Conventional Chinese component name with its recorded English translation (when supplied). */
  componentName: { hanzi: string; pinyin: string; englishTranslation?: string; translationSourceUrl?: string } | null;
  readingNote: string | null;
  usageConstraint: string | null;
  lookAlike: { glyph: string; pinyin: string; meaning: string; note: string } | null;
  guidance: { doNotUseAsVariantDefinition?: string; doNotUseAsVariantPronunciation?: string; [field: string]: string | undefined };
};

const identities = (data as { identities: Record<string, ContextualVariantIdentity> }).identities;

/**
 * The one-line intro of a variant card's "Component identity", composed the same way for every
 * reviewed identity so all look-alike cases read alike:
 *   "{label} of {parent} ({parent reading}), visually similar to {look-alike} ({reading}, {first gloss})."
 * label = preferredLabel without its trailing "(variant of …)" (the sentence already names the parent);
 * gloss = the look-alike's first recorded meaning. Every part is a recorded field — nothing is invented.
 */
export function identitySummary(identity: ContextualVariantIdentity) {
  const label = identity.preferredLabel.replace(/\s*[（(][^（）()]*[）)]\s*$/, '').trim();
  const look = identity.lookAlike;
  const gloss = look?.meaning.split(/[;；,，]/)[0]?.trim() ?? '';
  return {
    label,
    parent: identity.parentRadical,
    parentPinyin: identity.parentRadicalPinyin,
    lookAlike: look ? { glyph: look.glyph, pinyin: look.pinyin, gloss } : null,
  };
}

/** Plain-text form of identitySummary (tests, labels). */
export function identitySummaryText(identity: ContextualVariantIdentity): string {
  const s = identitySummary(identity);
  const similar = s.lookAlike ? `, visually similar to ${s.lookAlike.glyph} (${s.lookAlike.pinyin}${s.lookAlike.gloss ? `, ${s.lookAlike.gloss}` : ''})` : '';
  return `${s.label} of ${s.parent} (${s.parentPinyin})${similar}.`;
}

/** Exact family + form key + recorded glyph, or null; never matched by shape or glyph alone. */
export function contextualVariantIdentity(familyId: number | undefined, formKey: string | undefined, glyph: string): ContextualVariantIdentity | null {
  if (familyId === undefined || !formKey) return null;
  const identity = identities[formKey];
  return identity && identity.familyId === familyId && identity.recordedFormGlyph === glyph ? identity : null;
}

import { expect, it } from 'vitest';
import { contextualVariantIdentity, identitySummaryText, type ContextualVariantIdentity } from './radical-contextual-identity';

it('composes the jade variant intro from its recorded fields', () => {
  const jade = contextualVariantIdentity(96, '96-1', '王');
  expect(jade).not.toBeNull();
  expect(identitySummaryText(jade!)).toBe('Jade component of 玉 (yù), visually similar to 王 (wáng, king).');
});

it('uses the same sentence pattern for any other reviewed look-alike identity', () => {
  const other = { preferredLabel: 'Cover component (variant of 襾)', parentRadical: '襾', parentRadicalPinyin: 'yà', lookAlike: { glyph: '西', pinyin: 'xī', meaning: 'west; western', note: '' } } as ContextualVariantIdentity;
  expect(identitySummaryText(other)).toBe('Cover component of 襾 (yà), visually similar to 西 (xī, west).');
});

it('omits the look-alike clause when none is recorded', () => {
  const plain = { preferredLabel: 'Jade component (variant of 玉)', parentRadical: '玉', parentRadicalPinyin: 'yù', lookAlike: null } as ContextualVariantIdentity;
  expect(identitySummaryText(plain)).toBe('Jade component of 玉 (yù).');
});

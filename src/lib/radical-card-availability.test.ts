import { describe, expect, it } from 'vitest';
import { libraryEntries, radicalVariantEntry } from './character-library';
import { radicalFamily } from './radical-strokes';
import { radicalCardAvailability } from './radical-card-availability';

describe('Radical card availability', () => {
  it('includes 見 family variant 见 examples and recorded stroke decomposition', () => {
    const heading = libraryEntries('Radicals').find(entry => entry.kangxiIndex === 147);
    if (!heading) throw new Error('Missing radical 147');
    expect(radicalCardAvailability(heading, libraryEntries('Characters'), false)).toEqual({ example: true, decomposition: true });
  });
  it('does not borrow other forms’ content for a separately saved variant', () => {
    const heading = libraryEntries('Radicals').find(entry => entry.kangxiIndex === 147);
    const form = radicalFamily(147)?.forms.find(form => form.character === '見');
    if (!heading || !form) throw new Error('Missing exact 見 form');
    const exact = { ...radicalVariantEntry(heading, form), radicalVariant: form.key };
    const parent = { id: 'Characters:现', hanzi: '现', pinyin: '', meaning: '', note: '8 strokes · 見 radical', decomposition: { root: { glyph: '见', position: '' }, source: 'recorded', status: 'recorded' } };
    expect(radicalCardAvailability(exact, [parent], false).example).toBe(false);
  });
});
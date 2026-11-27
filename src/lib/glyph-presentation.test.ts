import { describe, expect, it } from 'vitest';
import { displayMeaning, glyphPresentation, glyphRadicalLinks } from './glyph-presentation';

// Displayed translations never repeat the Kangxi index — the card already shows it
// as the "Radical #N" pill. The source data also carries the misspelling "Kangzi"
// (臼, radical 134), so both spellings are omitted.
describe('displayMeaning', () => {
  it('omits the misspelt "Kangzi radical 134" note (臼)', () => {
    expect(displayMeaning('mortar; bone joint socket; Kangzi radical 134')).toBe('mortar; bone joint socket');
  });

  it('omits a trailing "Kangxi radical N" note', () => {
    expect(displayMeaning('dot; Kangxi radical 3')).toBe('dot');
  });

  it('omits a leading "Kangxi radical N" note and keeps the senses', () => {
    expect(displayMeaning('Kangxi radical 35; go slowly')).toBe('go slowly');
  });

  it('omits abbreviated source notes like "rad. 90"', () => {
    expect(displayMeaning('half of tree trunk; rad. no. 90')).toBe('half of tree trunk');
  });

  it('keeps the original text when the note is all there is', () => {
    expect(displayMeaning('Kangxi radical 134')).toBe('Kangxi radical 134');
  });

  it('leaves ordinary translations untouched', () => {
    expect(displayMeaning('woman, girl; feminine')).toBe('woman, girl; feminine');
  });
});

describe('simplified radical forms on Characters cards', () => {
  it('drops "simplified form of Kangxi radical N" so 麦 and 麥 read alike', () => {
    expect(displayMeaning('wheat, barley, oats; simplified form of Kangxi radical 199')).toBe('wheat, barley, oats');
    expect(displayMeaning('teeth; gears, cogs; age; simplified form of the Kangxi radical 211')).toBe('teeth; gears, cogs; age');
  });

  it('keeps "variant of Kangxi radical N" when it is the only meaning (耂)', () => {
    expect(displayMeaning('variant of Kangxi radical 125')).toBe('variant of Kangxi radical 125');
  });

  it('reads the family translation for a lone "variant of Kangxi radical N" (耂, 覀)', () => {
    expect(glyphPresentation('耂', 'Characters', 'lǎo', 'variant of Kangxi radical 125').meaning).toMatch(/; component form of 老$/);
    expect(glyphPresentation('覀', 'Characters', 'xī', 'variant of Kangxi radical 146').meaning).toMatch(/; component form of 襾$/);
    // A mismatched family number keeps the recorded note.
    expect(glyphPresentation('耂', 'Characters', 'lǎo', 'variant of Kangxi radical 1').meaning).toBe('variant of Kangxi radical 1');
  });

  it('gives the simplified dual forms their Radical #N pill', () => {
    expect(glyphPresentation('麦', 'Characters').characterRadical?.number).toBe(199);
    expect(glyphPresentation('门', 'Characters').characterRadical?.number).toBe(169);
    expect(glyphPresentation('马', 'Characters').characterRadical?.number).toBe(187);
    expect(glyphPresentation('一', 'Characters').characterRadical?.number).toBe(1);
  });

  it('never turns them into canonical radicals, so 麦 keeps 麥 as its dictionary radical box', () => {
    expect(glyphPresentation('麦', 'Characters').canonicalRadical).toBeUndefined();
  });

  it('leaves ordinary characters without a pill', () => {
    expect(glyphPresentation('好', 'Characters').characterRadical).toBeUndefined();
  });

  it('gives 訁 its Radical #149 identity and family translation instead of "Kangxi radical 149"', () => {
    const info = glyphPresentation('訁', 'Characters', 'yán', 'Kangxi radical 149');
    expect(info.characterRadical).toEqual({ id: 'kangxi-149', number: 149, glyph: '言' });
    expect(info.meaning).toMatch(/words, speech.*component form of 言$/);
    expect(info.meaning).not.toContain('Kangxi radical 149');
  });
});

// Owner rule: a recorded radical form is a radical everywhere it appears (sound chart,
// breakdowns, etymology links), not only on its own card.
describe('glyphRadicalLinks', () => {
  it('names Kangxi radical #149 for the recorded form 訁', () => {
    expect(glyphRadicalLinks('訁').map(radical => radical.number)).toEqual([149]);
  });
  it('names nothing for the plain character 们', () => {
    expect(glyphRadicalLinks('们')).toEqual([]);
  });
});

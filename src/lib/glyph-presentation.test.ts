import { describe, expect, it } from 'vitest';
import { displayMeaning } from './glyph-presentation';

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

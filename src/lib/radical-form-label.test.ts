import { describe, expect, test } from 'vitest';
import { radicalFormLabel } from './radical-form-label';
import { radicalFamily } from './radical-strokes';
import { glyphScript } from './character-library';

const label = (familyId: number, character: string) => {
  const family = radicalFamily(familyId)!;
  const form = family.forms.find(f => f.character === character)!;
  return radicalFormLabel(form, family, glyphScript(character));
};

describe('radical family form labels', () => {
  test('canonical form reads Standard', () => expect(label(149, '言')).toBe('Standard'));
  test('recorded Simplified variant reads Simplified', () => expect(label(149, '讠')).toBe('Simplified'));
  test('recorded Traditional variant reads Traditional', () => expect(label(149, '訁')).toBe('Traditional'));
  test('positional variant without script record stays Variant', () => expect(label(85, '氵')).toBe('Variant'));
  test('historical Kangxi heading keeps its label', () => expect(label(169, '門')).toBe('Kangxi heading'));
});

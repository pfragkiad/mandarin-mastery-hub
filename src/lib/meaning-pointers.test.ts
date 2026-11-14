import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { catalog, hydrateCatalog, type CatalogFile } from './catalog-store';
import { hydrateCharacterVariants, type CharacterVariantFile } from './character-variants';
import { meaningPointers } from './meaning-pointers';

const read = (name: string) => JSON.parse(readFileSync(`public/data/${name}`, 'utf8'));
beforeAll(() => { hydrateCharacterVariants(read('character-variants-v1.4.0.json') as CharacterVariantFile); hydrateCatalog(read('catalog.json') as CatalogFile); });

describe('干 meaning and readings', () => {
  it('keeps the recorded meaning and points "dried" to 乾', () => {
    expect(meaningPointers('干', 'oppose, offend; invade; dried')).toEqual([{ text: 'oppose, offend' }, { text: 'invade' }, { text: 'dried', related: '乾' }]);
  });
  it('drops the pointer when the recorded meaning changes', () => {
    expect(meaningPointers('干', 'oppose, offend; invade; dry')).toBeNull();
  });
  it('records both gān and gàn, each bound to its own recording', () => {
    expect(catalog.characters.find(row => row[0] === '干')?.[1]).toBe('gān / gàn');
    expect(catalog.readingAudio['干']).toEqual({ 'gān': 'cmn-syl-gan1', 'gàn': 'cmn-syl-gan4' });
  });
});

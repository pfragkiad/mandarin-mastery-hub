import { readCatalog } from '@/test/catalog-fixture';
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { catalog, hydrateCatalog, readingMeanings } from './catalog-store';
import { hydrateCharacterVariants, type CharacterVariantFile } from './character-variants';
import { cardMeaningPointers, meaningPointers } from './meaning-pointers';
import { cardMeaning } from './glyph-presentation';

const read = (name: string) => JSON.parse(readFileSync(`public/data/${name}`, 'utf8'));
beforeAll(() => { hydrateCharacterVariants(read('character-variants-v1.4.0.json') as CharacterVariantFile); hydrateCatalog(readCatalog()); });

describe('干 meaning and readings', () => {
  it('keeps the recorded meaning and points "dried" to 乾', () => {
    expect(meaningPointers('干', 'oppose, offend; invade; dried')).toEqual([{ text: 'oppose, offend' }, { text: 'invade' }, { text: 'dried', related: '乾' }]);
  });
  it('drops the pointer when the recorded meaning changes', () => {
    expect(meaningPointers('干', 'oppose, offend; invade; dry')).toBeNull();
  });
  it('splits like 了: gān keeps the recorded senses, gàn reads the recorded translation of 幹', () => {
    expect(readingMeanings('干')).toEqual([{ reading: 'gān', meaning: 'oppose, offend; invade; dried' }, { reading: 'gàn', meaning: 'trunk of tree or of human body' }]);
  });
  it('points the gàn line to 幹 only on the gàn line', () => {
    expect(meaningPointers('干', 'oppose, offend; invade; dried', 'trunk of tree or of human body', 'gàn')).toEqual([{ text: 'trunk of tree or of human body', related: '幹' }]);
    expect(meaningPointers('干', 'oppose, offend; invade; dried', 'oppose, offend; invade; dried', 'gān')?.find(part => part.related)?.related).toBe('乾');
  });
  it('records both gān and gàn, each bound to its own recording', () => {
    expect(catalog.characters.find(row => row[0] === '干')?.[1]).toBe('gān / gàn');
    expect(catalog.readingAudio['干']).toEqual({ 'gān': 'cmn-syl-gan1', 'gàn': 'cmn-syl-gan4' });
  });
  it('shows the gàn translation on the grid card beside gān', () => {
    expect(cardMeaning('干', 'gān / gàn', 'oppose, offend; invade; dried')).toBe('oppose, offend; invade; dried / trunk of tree or of human body');
  });
  it('keeps the recorded card text when the record has only one of the readings', () => {
    expect(cardMeaning('了', 'le', 'to finish; particle of completed action')).toBe('to finish; particle of completed action');
  });
  it('marks dried → 乾 and the gàn line → 幹 on the grid card', () => {
    expect(cardMeaningPointers('干', 'gān / gàn', 'oppose, offend; invade; dried')).toEqual([
      [{ text: 'oppose, offend' }, { text: 'invade' }, { text: 'dried', related: '乾' }],
      [{ text: 'trunk of tree or of human body', related: '幹' }],
    ]);
  });
});

describe('发 meaning and readings', () => {
  it('records both fā and fà, each bound to its own recording', () => {
    expect(catalog.characters.find(row => row[0] === '发')?.[1]).toBe('fā / fà');
    expect(catalog.readingAudio['发']).toEqual({ 'fā': 'cmn-syl-fa1', 'fà': 'cmn-syl-fa4' });
  });
  it('pairs hair with fà and the other senses with fā', () => {
    expect(readingMeanings('发')).toEqual([{ reading: 'fā', meaning: 'issue, dispatch, send out' }, { reading: 'fà', meaning: 'hair' }]);
  });
  it('points the hair line to 髮 and the fā line to 發', () => {
    expect(meaningPointers('发', 'issue, dispatch, send out; hair', 'hair', 'fà')).toEqual([{ text: 'hair', related: '髮' }]);
    expect(meaningPointers('发', 'issue, dispatch, send out; hair', 'issue, dispatch, send out', 'fā')).toEqual([{ text: 'issue, dispatch, send out', related: '發' }]);
  });
});

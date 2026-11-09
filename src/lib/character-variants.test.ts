import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { characterVariants, hydrateCharacterVariants, relatedGroup, scriptGroup, scriptHead, type CharacterVariantFile } from './character-variants';
import { splitReadings, isMultiReading } from '@/components/tutor/reading-speakers';

beforeAll(() => hydrateCharacterVariants(JSON.parse(readFileSync('public/data/character-variants-v1.4.0.json', 'utf8')) as CharacterVariantFile));

describe('context-dependent associations keep separate cards', () => {
  it('了 and 瞭 never share a card but stay linked as related forms', () => {
    expect(scriptGroup('了')).toEqual(['了']);
    expect(scriptHead('瞭')).toBe('瞭');
    expect(relatedGroup('瞭')).toEqual(['了', '瞭']);
  });
  it('a key with any context-dependent pair splits its whole set (发 → 發, 髮; 苏 → 囌, 蘇)', () => {
    expect(scriptGroup('发')).toEqual(['发']);
    expect(relatedGroup('髮')).toEqual(['发', '發', '髮']);
    expect(scriptGroup('苏')).toEqual(['苏']);
  });
  it('ordinary script equivalents still share one card', () => {
    expect(scriptGroup('书')).toEqual(['书', '書']);
    expect(relatedGroup('书')).toEqual([]);
  });
});

describe('"also traditional" needs a documented unchanged use', () => {
  it('了 (吃了 → 吃了) and 后 (皇后 → 皇后) are documented as unchanged', () => {
    expect(characterVariants.alsoTraditional.has('了')).toBe(true);
    expect(characterVariants.alsoTraditional.has('后')).toBe(true);
  });
  it('发 has no documented unchanged use, so it stays plain Simplified', () => {
    expect(characterVariants.alsoTraditional.has('发')).toBe(false);
  });
});

describe('one speaker per recorded reading', () => {
  it('splits "liào / liǎo" into two readings and leaves a single reading alone', () => {
    expect(splitReadings('liào / liǎo')).toEqual(['liào', 'liǎo']);
    expect(isMultiReading('liào / liǎo')).toBe(true);
    expect(isMultiReading('le')).toBe(false);
  });
  it('了 records le and liǎo, with liǎo bound to its own recording', () => {
    const catalog = JSON.parse(readFileSync('public/data/catalog.json', 'utf8'));
    expect(catalog.characters.find((row: string[]) => row[0] === '了')[1]).toBe('le / liǎo');
    expect(catalog.readingAudio['了']['liǎo']).toBe('cmn-syl-liao3');
  });
});

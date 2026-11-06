import { expect, it } from 'vitest';
import fs from 'fs';
import { hydrateCatalog } from './catalog-store';
import { radicalVariantFallback, radicalVariantMeaning } from './character-library';

it('component variants without a name borrow their Kangxi radical reading (扌 → 手, 亻 → 人)', () => {
  const read = (f: string) => JSON.parse(fs.readFileSync(`public/data/${f}`, 'utf8'));
  hydrateCatalog(read('catalog.json'), read('radical-identities.json'), read('radical-strokes.json'));
  expect(radicalVariantFallback('扌', '')).toMatchObject({ headingGlyph: '手', pinyin: 'shǒu', spoken: '手' });
  expect(radicalVariantFallback('亻', '')).toMatchObject({ headingGlyph: '人', pinyin: 'rén' });
  expect(radicalVariantFallback('土', 'tǔ')).toBeNull();
});

it('traditional variant 訁 inherits the family 149 meaning for its practice translation', () => {
  const read = (f: string) => JSON.parse(fs.readFileSync(`public/data/${f}`, 'utf8'));
  hydrateCatalog(read('catalog.json'), read('radical-identities.json'), read('radical-strokes.json'));
  const fallback = radicalVariantFallback('訁', '', 149);
  expect(fallback).toMatchObject({ headingGlyph: '言', pinyin: 'yán' });
  expect(fallback?.meaning).toBe('words, speech; speak, say');
});

it('variant with a recorded reading but only a Kangxi placeholder meaning inherits the family translation', () => {
  const read = (f: string) => JSON.parse(fs.readFileSync(`public/data/${f}`, 'utf8'));
  hydrateCatalog(read('catalog.json'), read('radical-identities.json'), read('radical-strokes.json'));
  // 訁 has its own reading yán, so radicalVariantFallback stays null; the meaning still follows the family.
  expect(radicalVariantFallback('訁', 'yán', 149)).toBeNull();
  expect(radicalVariantMeaning('訁', 'Kangxi radical 149', 149)).toBe('words, speech; speak, say; component form of 言');
  // A variant with its own real meaning keeps it.
  expect(radicalVariantMeaning('讠', 'words, speech; speak, say; component form of 言', 149)).toBeNull();
});

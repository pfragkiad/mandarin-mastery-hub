import { expect, it } from 'vitest';
import fs from 'fs';
import { hydrateCatalog } from './catalog-store';
import { radicalVariantFallback } from './character-library';

it('component variants without a name borrow their Kangxi radical reading (扌 → 手, 亻 → 人)', () => {
  const read = (f: string) => JSON.parse(fs.readFileSync(`public/data/${f}`, 'utf8'));
  hydrateCatalog(read('catalog.json'), read('radical-identities.json'), read('radical-strokes.json'));
  expect(radicalVariantFallback('扌', '')).toMatchObject({ headingGlyph: '手', pinyin: 'shǒu', spoken: '手' });
  expect(radicalVariantFallback('亻', '')).toMatchObject({ headingGlyph: '人', pinyin: 'rén' });
  expect(radicalVariantFallback('土', 'tǔ')).toBeNull();
});

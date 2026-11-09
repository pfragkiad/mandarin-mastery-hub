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

// Radical #96: the 王-shaped jade component (form 96-1) follows the reviewed contextual identity
// from the supplied etymology audit, while the independent character 王 keeps wáng / king.
it('selected #96 variant 王 presents the jade identity, never wáng or king', async () => {
  const read = (f: string) => JSON.parse(fs.readFileSync(`public/data/${f}`, 'utf8'));
  hydrateCatalog(read('catalog.json'), read('radical-identities.json'), read('radical-strokes.json'));
  const { libraryEntries, radicalVariantEntry } = await import('./character-library');
  const { radicalForm } = await import('./radical-strokes');
  const fallback = radicalVariantFallback('王', 'wáng', 96, '96-1');
  expect(fallback).toEqual({ headingGlyph: '玉', pinyin: 'yù', spoken: '玉', reading: 'yù', meaning: 'jade; precious stone' });
  const heading = libraryEntries('Radicals').find(entry => entry.kangxiIndex === 96)!;
  const form = radicalForm(96, '96-1')!;
  const saved = radicalVariantEntry(heading, form);
  expect(saved.pinyin).toBe('yù');
  expect(saved.meaning).toBe('jade; precious stone; component form of 玉');
  expect(saved.meaning).not.toMatch(/king/);
});

it('王 outside the exact #96 variant selection keeps its own character identity', async () => {
  const read = (f: string) => JSON.parse(fs.readFileSync(`public/data/${f}`, 'utf8'));
  hydrateCatalog(read('catalog.json'), read('radical-identities.json'), read('radical-strokes.json'));
  const { libraryEntries } = await import('./character-library');
  // No form key (plain Practice of 王, breakdown parts, Components card) → no contextual identity.
  expect(radicalVariantFallback('王', 'wáng', 96)).toBeNull();
  expect(radicalVariantFallback('王', 'wáng')).toBeNull();
  expect(libraryEntries('Characters').find(entry => entry.hanzi === '王')).toMatchObject({ pinyin: 'wáng', meaning: 'king, ruler; royal; surname' });
  expect(libraryEntries('Radicals').find(entry => entry.kangxiIndex === 96)).toMatchObject({ hanzi: '玉', pinyin: 'yù', meaning: 'jade, precious stone, gem' });
});

it('extracted contextual identities match the supplied audit verbatim', () => {
  const audit = JSON.parse(fs.readFileSync('public/data/radical_variant_etymology_audit.json', 'utf8'));
  const extracted = JSON.parse(fs.readFileSync('src/data/radical-contextual-identities.json', 'utf8'));
  const row = audit.variants.find((v: { formKey: string }) => v.formKey === '96-1');
  const identity = extracted.identities['96-1'];
  expect(identity.meaning).toBe(row.contextualIdentity.radicalComponent.meaning);
  expect(identity.parentRadicalPinyin).toBe(row.contextualIdentity.radicalComponent.parentRadicalPinyin);
  expect(identity.lookAlike).toEqual(row.contextualIdentity.lookAlikeIndependentCharacter);
  expect(identity.guidance).toEqual(row.uiPresentationGuidance);
  expect(Object.keys(extracted.identities)).toEqual(audit.variants.filter((v: { contextualIdentity?: unknown }) => v.contextualIdentity).map((v: { formKey: string }) => v.formKey));
});

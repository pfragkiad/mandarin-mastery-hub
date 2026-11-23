import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import { etymologyTarget, etymologyView, hasOwnEtymologyText, inheritableCounterpart, howellSegments, validateEtymologyTranslations, type EtymologyIndex, type EtymologyRequest, type EtymologyCharacter, type EtymologyEntry } from './etymology';

// Real generated data, read from disk like the browser would fetch it.
const dir = 'public/data/etymology/';
const index = JSON.parse(readFileSync(`${dir}index.json`, 'utf8')) as EtymologyIndex;
function view(request: EtymologyRequest) {
  const target = etymologyTarget(index, request);
  if (!target) return null;
  const shard = JSON.parse(readFileSync(`${dir}${target.file}`, 'utf8')) as { characters: Record<string, EtymologyCharacter> };
  const character = shard.characters[request.glyph];
  return character ? etymologyView(index, request, character) : null;
}

describe('etymology adapter', () => {
  it('shows both separately attributed sources for Characters:古', () => {
    const result = view({ recordId: 'Characters:古', glyph: '古' });
    expect(result?.status).toBe('exact-headword');
    expect(result?.entries.map(entry => entry.id)).toEqual(['howell:53e4', 'shuowen:1457']);
  });
  it('keeps Shuowen 舌 entries 941 and 1437 separate', () => {
    const ids = view({ recordId: 'Characters:舌', glyph: '舌' })?.entries.map(entry => entry.id) ?? [];
    expect(ids).toContain('shuowen:941');
    expect(ids).toContain('shuowen:1437');
  });
  it('never shows the standalone text on Components:古, only a pointer to Characters:古', () => {
    const result = view({ recordId: 'Components:古', glyph: '古' });
    expect(result?.status).toBe('context-review-required');
    expect(result?.entries).toEqual([]);
    expect(result?.standalone).toBe('Characters:古');
  });
  it('gives 发 no text of its own, only links to 發 and 髮', () => {
    const result = view({ recordId: 'Characters:发', glyph: '发' });
    expect(result?.status).toBe('no-exact-headword');
    expect(result?.entries).toEqual([]);
    expect(result?.related.map(item => item.glyph).sort()).toEqual(['發', '髮'].sort());
  });
  it('lets 师 show the notes of its one traditional form 師', () => {
    const result = view({ recordId: 'Characters:师', glyph: '师' });
    expect(inheritableCounterpart(result, glyph => glyph === '師')?.recordId).toBe('Characters:師');
  });
  it('never lets 发 or 后 show a traditional form\'s notes (context-dependent pairs keep links only)', () => {
    const traditional = () => true;
    expect(inheritableCounterpart(view({ recordId: 'Characters:发', glyph: '发' }), traditional)).toBeNull();
    expect(inheritableCounterpart(view({ recordId: 'Characters:后', glyph: '后' }), traditional)).toBeNull();
  });
  it('shows no inherited notes when the single related form is not Traditional', () => {
    expect(inheritableCounterpart(view({ recordId: 'Characters:师', glyph: '师' }), () => false)).toBeNull();
  });
  it('blocks the standalone 王 notes on the #96 jade form, while Characters:王 keeps them', () => {
    const jade = view({ recordId: 'Radicals:玉:variant:96-1', glyph: '王', familyId: 96, formKey: '96-1' });
    expect(jade?.status).toBe('blocked-contextual-identity');
    expect(jade?.entries).toEqual([]);
    expect(jade?.standalone).toBeNull();
    expect(view({ recordId: 'Characters:王', glyph: '王' })?.entries.length).toBeGreaterThan(0);
  });
  it('fails closed on a mismatched glyph or a variant without a recorded form', () => {
    expect(view({ recordId: 'Characters:古', glyph: '吉' })).toBeNull();
    expect(etymologyTarget(index, { recordId: 'Radicals:玉:variant:96-9', glyph: '王', familyId: 96, formKey: '96-9' })).toBeNull();
  });
  it('family-qualified lookup wins for a radical heading form', () => {
    expect(etymologyTarget(index, { recordId: 'Radicals:一', glyph: '一', familyId: 1, formKey: '1-0' })?.radical).toBe(true);
  });
  it('index pins each shard by its exact bytes', () => {
    const file = index.records['Characters:古']!.file;
    const bytes = readFileSync(`${dir}${file}`);
    expect(bytes.byteLength).toBe(index.shards[file]!.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(index.shards[file]!.sha256);
  });
});

describe('howellSegments', () => {
  it('emphasises *glossed* senses without changing the words', () => {
    expect(howellSegments('food → *dry up*; *stale*')).toEqual([{ text: 'food → ', emphasis: false }, { text: 'dry up', emphasis: true }, { text: '; ', emphasis: false }, { text: 'stale', emphasis: true }]);
  });
  it('keeps an unpaired asterisk and # markers literal', () => {
    expect(howellSegments('十# ten * odd')).toEqual([{ text: '十# ten * odd', emphasis: false }]);
  });
});

describe('grid scroll marker', () => {
  it('marks a character with its own notes (古) but not its component card or a character without notes', () => {
    expect(hasOwnEtymologyText(index, 'Characters:古', '古')).toBe(true);
    expect(hasOwnEtymologyText(index, 'Components:古', '古')).toBe(false);
    const without = Object.entries(index.records).find(([id, record]) => id.startsWith('Characters:') && record.status === 'no-exact-headword');
    expect(without).toBeDefined();
    if (without) expect(hasOwnEtymologyText(index, without[0], without[1].glyph)).toBe(false);
  });
  it('never marks a record whose glyph disagrees with the index', () => {
    expect(hasOwnEtymologyText(index, 'Characters:古', '口')).toBe(false);
  });
});

describe('source-bound Shuowen English', () => {
  afterEach(() => vi.unstubAllGlobals());
  function record(): EtymologyCharacter {
    const entry: EtymologyEntry = { id: 'shuowen:941', sourceId: 'shuowen', headword: '舌',
      contentKind: 'historical-dictionary', language: 'lzh', text: '在口所以言也。',
      reviewStatus: 'unreviewed-source-material', sourceUrl: 'https://example.test/source/941',
      translation: { language: 'en', text: 'That within the mouth by which one speaks.',
        method: 'ai-generated', reviewStatus: 'unreviewed-ai-draft', uncertain: false,
        sourceTextSha256: createHash('sha256').update('在口所以言也。').digest('hex') } };
    return { glyph: '舌', entries: [entry], associations: [], radicalForms: [], relatedFormSuggestions: [],
      comparison: { coverage: 'shuowen-only', interpretationStatus: 'not-compared' } };
  }
  it('keeps a draft bound to the exact original Chinese bytes', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const input = record();
    const checked = await validateEtymologyTranslations(input);
    expect(checked.entries[0]?.translation).toEqual(input.entries[0]?.translation);
    expect(checked.entries[0]?.text).toBe('在口所以言也。');
  });
  it('drops only a stale draft while keeping the source and a second independent entry', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const input = record();
    const second = { ...input.entries[0]!, id: 'shuowen:1437' };
    input.entries[0]!.text += '變';
    input.entries.push(second);
    const checked = await validateEtymologyTranslations(input);
    expect(checked.entries[0]?.translation).toBeUndefined();
    expect(checked.entries[0]?.id).toBe('shuowen:941');
    expect(checked.entries[0]?.text).toBe('在口所以言也。變');
    expect(checked.entries[1]?.translation).toEqual(second.translation);
    expect(input.entries[0]?.translation).toBeDefined();
  });
  it('never attaches Shuowen English to a Howell entry', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const input = record();
    input.entries[0]!.sourceId = 'howell';
    expect((await validateEtymologyTranslations(input)).entries[0]?.translation).toBeUndefined();
  });
  it('checks the editorial reading independently while preserving the imported original', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const input = record();
    const reading = { headword: '舌', text: '別條原文。',
      textSha256: createHash('sha256').update('別條原文。').digest('hex'),
      classification: 'documented_duan_emendation', note: 'Review supplied an alternative reading.', evidenceUrls: [] };
    input.entries[0]!.translation!.editorialReview = { reviewId: 'test-review', status: 'partial-editorial-review',
      changes: ['source-reading'], sourceReading: reading };
    expect((await validateEtymologyTranslations(input)).entries[0]?.translation).toBeDefined();
    reading.text += '變';
    const checked = await validateEtymologyTranslations(input);
    expect(checked.entries[0]?.translation).toBeUndefined();
    expect(checked.entries[0]?.text).toBe('在口所以言也。');
  });
});


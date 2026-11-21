import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { etymologyTarget, etymologyView, howellSegments, type EtymologyIndex, type EtymologyRequest, type EtymologyCharacter } from './etymology';

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

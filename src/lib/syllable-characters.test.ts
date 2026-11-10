import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'fs';
import { hydrateCatalog } from './catalog-store';
import { hydrateUsageOrder } from './usage-frequency';
import { libraryEntries } from './character-library';
import { characterDestinations, groupScriptForms, radicalDestinations, radicalsFirst, syllableCharacters } from './syllable-characters';
import { hydrateCharacterVariants } from './character-variants';
import { usageRank } from './usage-frequency';

const read = (f: string) => JSON.parse(fs.readFileSync(`public/data/${f}`, 'utf8'));
beforeAll(() => {
  hydrateUsageOrder(read('usage-order.json'));
  hydrateCatalog(read('catalog.json'), read('radical-identities.json'), read('radical-strokes.json'));
});

describe('Sound chart "In a character"', () => {
  it('lists only characters with the exact syllable and tone', () => {
    const glyphs = syllableCharacters(libraryEntries('Characters'), 'nai', 3).map(e => e.hanzi);
    expect(glyphs).toContain('奶');
    expect(glyphs).not.toContain('耐'); // nài, 4th tone
  });

  it('neutral tone lists characters recorded without a tone mark (吗 ma, 了 le)', () => {
    expect(syllableCharacters(libraryEntries('Characters'), 'ma', 5).map(e => e.hanzi)).toContain('吗');
    expect(syllableCharacters(libraryEntries('Characters'), 'ma', 1).map(e => e.hanzi)).not.toContain('吗');
  });

  it('orders the most used character first', () => {
    expect(syllableCharacters(libraryEntries('Characters'), 'shi', 4)[0]?.hanzi).toBe('是');
  });

  it('links each character to its exact Characters record', () => {
    const entries = libraryEntries('Characters');
    const [first] = syllableCharacters(entries, 'shi', 4);
    expect(characterDestinations(entries).get(first!.id)).toMatchObject({ tab: 'Characters', id: 'Characters:是' });
  });

  it('ranks a radical character by its radical family and lists radicals first', () => {
    const radicalCard = radicalDestinations(libraryEntries('Radicals'));
    const card = radicalCard('丿');
    expect(card?.search).toMatchObject({ tab: 'Radicals', id: 'Radicals:丿' });
    expect(card && usageRank(card.entry, 'Radicals', false)).toEqual(expect.any(Number));
    expect(radicalCard('马')?.search).toMatchObject({ tab: 'Radicals', id: 'Radicals:馬', variant: '187-0' });
    expect(radicalCard('玛')).toBeUndefined();
    const rows = syllableCharacters(libraryEntries('Characters'), 'pie', 3);
    const ordered = radicalsFirst(rows, entry => { const r = radicalCard(entry.hanzi); return r ? usageRank(r.entry, 'Radicals', false) : undefined; });
    expect(ordered[0]?.hanzi).toBe('丿');
  });
});

describe('Sound chart groups script forms only for the same meaning', () => {
  const rows = [
    { id: 'a', hanzi: '贝', meaning: 'sea shell' },
    { id: 'b', hanzi: '被', meaning: 'by' },
    { id: 'c', hanzi: '貝', meaning: 'sea shell' },
    { id: 'd', hanzi: '郁', meaning: 'dense' },
    { id: 'e', hanzi: '鬱', meaning: 'depressed' },
  ];
  const head = (g: string) => ({ 貝: '贝', 鬱: '郁' } as Record<string, string>)[g] ?? g;
  const order = (g: string) => (head(g) === '贝' ? ['贝', '貝'] : head(g) === '郁' ? ['郁', '鬱'] : [g]);
  const grouped = groupScriptForms(rows, r => r.meaning, head, order).map(row => row.forms.map(f => f.hanzi).join(''));
  it('puts 贝 and 貝 in one row at the best-listed position', () => {
    expect(grouped).toEqual(['贝貝', '被', '郁', '鬱']);
  });
  it('keeps forms with different recorded meanings (郁 / 鬱) in separate rows', () => {
    expect(grouped).toContain('郁');
    expect(grouped).toContain('鬱');
  });
  it('never groups a context-dependent pair (了 / 瞭) using the real script groups', () => {
    hydrateCharacterVariants(read('character-variants-v1.4.0.json'));
    const real = groupScriptForms([{ id: '1', hanzi: '了', meaning: 'x' }, { id: '2', hanzi: '瞭', meaning: 'x' }, { id: '3', hanzi: '书', meaning: 'book' }, { id: '4', hanzi: '書', meaning: 'book' }], r => r.meaning);
    expect(real.map(row => row.forms.length)).toEqual([1, 1, 2]);
  });
});

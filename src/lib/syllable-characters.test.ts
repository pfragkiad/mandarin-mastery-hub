import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'fs';
import { hydrateCatalog } from './catalog-store';
import { hydrateUsageOrder } from './usage-frequency';
import { libraryEntries } from './character-library';
import { characterDestinations, syllableCharacters } from './syllable-characters';

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
});

import { describe, expect, it } from 'vitest';
import { defaultPreferences } from './learning-preferences';
import { filterLibrary, libraryEntries, libraryPage } from './character-library';
describe('Catalogue requirements', () => {
  it('imports all 38 stroke types', () => expect(libraryEntries('Strokes')).toHaveLength(38));
  it('imports all 214 radicals', () => expect(libraryEntries('Radicals')).toHaveLength(214));
  it('imports all 1843 components', () => expect(libraryEntries('Components')).toHaveLength(1843));
  it('imports all 9575 characters', () => expect(libraryEntries('Characters')).toHaveLength(9575));
  it('excludes traditional characters by default', () => {
    expect(defaultPreferences.includeTraditional).toBe(false);
    const entries = [{ id: 'traditional', hanzi: '學', pinyin: 'xué', meaning: 'learn', note: '', script: 'Traditional' as const }, { id: 'shared', hanzi: '我', pinyin: 'wǒ', meaning: 'I', note: '', script: 'Common' as const }];
    expect(filterLibrary(entries, '').map(e => e.hanzi)).toEqual(['我']);
  });
  it('includes traditional characters when enabled', () => {
    const entries = [{ id: 'traditional', hanzi: '學', pinyin: 'xué', meaning: 'learn', note: '', script: 'Traditional' as const }];
    expect(filterLibrary(entries, '', '', false, true).map(e => e.hanzi)).toEqual(['學']);
  });
  it('marks about 2,100 traditional characters from variant data', () => {
    const n = libraryEntries('Characters').filter(e => e.script === 'Traditional').length;
    expect(n).toBe(2113);
    expect(libraryEntries('Characters').find(e => e.hanzi === '學')?.script).toBe('Traditional');
    expect(libraryEntries('Characters').find(e => e.hanzi === '学')?.script).toBe('Simplified');
  });
  it('searches tone-free pinyin and translations', () => {
    expect(filterLibrary(libraryEntries('Characters'), 'wo').map(e => e.hanzi)).toContain('我');
    expect(filterLibrary(libraryEntries('Radicals'), 'water').map(e => e.hanzi)).toContain('水');
  });
  it('keeps large catalogues bounded to one page', () => {
    const entries = Array.from({ length: 9564 }, (_, i) => ({ id: String(i), hanzi: String(i), pinyin: '', meaning: '', note: '' }));
    expect(libraryPage(entries, 2).entries[0]?.id).toBe('24');
    expect(libraryPage(entries, 2).entries).toHaveLength(24);
    expect(libraryPage(entries, 500).current).toBe(399);
  });
  it('attaches decompositions only from the imported trees', () => {
    expect(libraryEntries('Characters').find(e => e.hanzi === '我')?.decomposition?.root.glyph).toBe('⿰');
    expect(libraryEntries('Characters').filter(e => e.decomposition).length).toBe(9504);
  });
  it('lists records with and without a sourced decomposition together', () => {
    const entries = [
      { id: 'a', hanzi: '我', pinyin: 'wǒ', meaning: 'I', note: '', decomposition: { root: { glyph: '⿰', position: 'root', children: [] }, source: 'Make Me a Hanzi IDS', status: 'Imported graphical structure' } },
      { id: 'b', hanzi: '一', pinyin: 'yī', meaning: 'one', note: '' },
    ];
    expect(filterLibrary(entries, '').map(e => e.hanzi)).toEqual(['我', '一']);
  });
});
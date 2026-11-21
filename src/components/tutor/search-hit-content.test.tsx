import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { words } from '@/lib/mandarin';
import { SearchHitContent } from './search-hit-content';

const dian = (level: number) => words.find(w => w.hanzi === '点' && w.entry?.hskLevel === level)!;

describe('SearchHitContent', () => {
  it('shows HSK level and part of speech so 点 HSK 1 and HSK 2 differ', () => {
    const one = render(<SearchHitContent hit={{ kind: 'Word', word: dian(1) }}/>).container;
    const two = render(<SearchHitContent hit={{ kind: 'Word', word: dian(2) }}/>).container;
    expect(one.querySelector('.hsk-level-pill')?.textContent).toBe('HSK 1');
    expect(two.querySelector('.hsk-level-pill')?.textContent).toBe('HSK 2');
    expect(two.querySelector('.hit-pos')?.textContent).toBe('(Verb) ');
    expect(one.querySelector('.hit-pos')?.textContent).not.toBe('(Verb) ');
  });
  it('glyph hits get no HSK pill', () => {
    const c = render(<SearchHitContent hit={{ kind: 'Characters', hanzi: '点', pinyin: 'diǎn', meaning: 'dot', note: '' } as never}/>).container;
    expect(c.querySelector('.hsk-level-pill')).toBeNull();
  });
});

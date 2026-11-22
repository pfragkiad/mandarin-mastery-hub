import { describe, expect, it } from 'vitest';
import { words } from '@/lib/mandarin';
import { wordHskPill } from './word-identity-pills';

// The detail card and grid card share this pill, so 爸爸 (HSK 3.0 level 1, official ID 3) reads the same in both.
describe('wordHskPill', () => {
  it('merges the recorded level and official ID into one HSK pill', () => {
    const baba = words.find(w => w.hanzi === '爸爸' && w.entry?.hskLevel === 1);
    expect(baba).toBeDefined();
    expect(wordHskPill(baba!)?.label).toBe(`HSK L1/#${baba!.hskId}`);
  });
});

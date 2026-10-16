import { describe, it, expect } from 'vitest';
import { words, filterWords, collections } from './mandarin';
describe('Vocabulary filtering', () => {
 it('loads all 505 imported words', () => { expect(words).toHaveLength(505); });
 it('finds pinyin without requiring tone marks', () => { expect(filterWords(words,'ni hao').map(w => w.hanzi)).toContain('你好'); });
 it('restricts results to saved words', () => { const id = words[0]!.id; expect(filterWords(words,'','All collections','All levels','Saved words',[id]).map(w => w.id)).toEqual([id]); });
 it('shows category names without the sort prefix', () => { expect(collections).toContain('Numbers & quantities'); });
});

import { describe, it, expect } from 'vitest';
import { words, filterWords } from './mandarin';
describe('Vocabulary filtering', () => {
 it('finds pinyin without requiring tone marks', () => { expect(filterWords(words,'ni hao').map(w => w.hanzi)).toEqual(['你好']); });
 it('restricts results to saved words', () => { expect(filterWords(words,'','All collections','All levels','Saved words',['wo']).map(w => w.id)).toEqual(['wo']); });
 it('combines collection and level filters', () => { expect(filterWords(words,'','Numbers & time','HSK 1').map(w => w.hanzi)).toEqual(['八','明天','今天']); });
});

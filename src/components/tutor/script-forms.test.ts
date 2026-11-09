import { describe, expect, it } from 'vitest';
import { parseSpellingExamples } from './script-forms';

describe('spelling examples keep recorded text verbatim', () => {
  it('splits 了 ↔ 瞭 rows with their notes', () => {
    expect(parseSpellingExamples('了解 → 了解 / 瞭解 (both accepted in Taiwan); 吃了 → 吃了 (Taiwan writing; OpenCC base s2t records 喫了)')).toBeNull();
    expect(parseSpellingExamples('皇后 → 皇后; 以后 → 以後')).toEqual([{ simplified: '皇后', traditional: '皇后' }, { simplified: '以后', traditional: '以後' }]);
    expect(parseSpellingExamples('面条 → 麵條 (Taiwan, base OpenCC: 麪條)')).toEqual([{ simplified: '面条', traditional: '麵條', note: 'Taiwan, base OpenCC: 麪條' }]);
  });
  it('falls back when a part has no arrow', () => {
    expect(parseSpellingExamples('只要 → 只要 (ordinary modern spelling); 衹要 (attested literary alternative)')).toBeNull();
  });
});

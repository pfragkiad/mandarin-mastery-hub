import { describe, expect, it } from 'vitest';
import { splitPinyinLines, strokeNames } from './stroke-names';

describe('stroke names from cnchar-order', () => {
  it('names every stroke of 门, including the compound 横折钩', async () => {
    const names = await strokeNames('门');
    expect(names?.map(stroke => stroke.name)).toEqual(['点', '竖', '横折钩']);
    expect(names?.[2]?.pinyin).toBe('héng zhé gōu');
  });

  it('reports 九’s second stroke as 横折弯钩, correcting cnchar-order’s conflation', async () => {
    const names = await strokeNames('九');
    expect(names?.map(stroke => stroke.name)).toEqual(['撇', '横折弯钩']);
    expect(names?.[1]?.pinyin).toBe('héng zhé wān gōu');
  });

  it('keeps the true 横斜钩 for characters like 飞', async () => {
    const names = await strokeNames('飞');
    expect(names?.[0]?.name).toBe('横斜钩');
    expect(names?.[0]?.pinyin).toBe('héng xié gōu');
  });

  it('keeps one syllable per character in the pinyin', async () => {
    const names = await strokeNames('我');
    expect(names?.length).toBe(7);
    for (const stroke of names ?? []) {
      expect(stroke.name).toBeTruthy();
      expect(stroke.pinyin.split(' ').length).toBe([...stroke.name].length);
    }
  });

  it('splits compound names into two balanced lines for the stroke chips', () => {
    expect(splitPinyinLines('héng zhé wān gōu')).toEqual(['héng zhé', 'wān gōu']);
    expect(splitPinyinLines('héng zhé zhé zhé gōu')).toEqual(['héng zhé zhé', 'zhé gōu']);
    expect(splitPinyinLines('piě')).toEqual(['piě']);
  });
});

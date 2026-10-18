import { describe, expect, it } from 'vitest';
import { strokeNames } from './stroke-names';

describe('stroke names from cnchar-order', () => {
  it('names every stroke of 门, including the compound 横折钩', async () => {
    const names = await strokeNames('门');
    expect(names?.map(stroke => stroke.name)).toEqual(['点', '竖', '横折钩']);
    expect(names?.[2]?.pinyin).toBe('héng zhé gōu');
  });

  it('keeps one syllable per character in the pinyin', async () => {
    const names = await strokeNames('我');
    expect(names?.length).toBe(7);
    for (const stroke of names ?? []) {
      expect(stroke.name).toBeTruthy();
      expect(stroke.pinyin.split(' ').length).toBe([...stroke.name].length);
    }
  });
});

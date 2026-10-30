import { describe, expect, it } from 'vitest';
import usage from '../../public/data/usage-order.json';
import { hydrateUsageOrder, usageGroupFor, usageRank, sortByUsage, type UsageOrderFile } from './usage-frequency';

hydrateUsageOrder(usage as UsageOrderFile);
describe('frequency ranks', () => {
  it('uses the supplied ranks: 的 first character, 人 (#9) first radical, 一 first component', () => {
    expect(usageRank({ id: 'Characters:的', hanzi: '的' }, 'Characters', false)).toBe(1);
    expect(usageRank({ id: 'Radicals:人', hanzi: '人', kangxiIndex: 9 }, 'Radicals', false)).toBe(1);
    expect(usageRank({ id: 'Components:一', hanzi: '一' }, 'Components', true)).toBe(1);
  });
  it('groups radicals 1–20 and components 601+', () => {
    expect(usageGroupFor('Radicals', 20)?.value).toBe('1-20');
    expect(usageGroupFor('Radicals', 21)?.value).toBe('21-50');
    expect(usageGroupFor('Components', 700)?.value).toBe('601-plus');
    expect(usageGroupFor('Characters', null)?.value).toBe('unranked');
  });
  it('sorts most frequent first with unranked last', () => {
    const rows = ['龘', '人', '的'].map(hanzi => ({ id: `Characters:${hanzi}`, hanzi }));
    expect(sortByUsage(rows, 'Characters', true).map(r => r.hanzi)).toEqual(['的', '人', '龘']);
  });
});

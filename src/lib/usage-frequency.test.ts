import { describe, expect, it } from 'vitest';
import usage from '../../public/data/usage-order.json';
import { hydrateUsageOrder, usageGroups, usageGroupLabel, usageCumulative, usageGroupFor, usageRank, sortByUsage, type UsageOrderFile } from './usage-frequency';

hydrateUsageOrder(usage as UsageOrderFile);
describe('frequency ranks', () => {
  it('uses the supplied ranks: 的 first character, 人 (#9) first radical, 一 first component', () => {
    expect(usageRank({ id: 'Characters:的', hanzi: '的' }, 'Characters', false)).toBe(1);
    expect(usageRank({ id: 'Radicals:人', hanzi: '人', kangxiIndex: 9 }, 'Radicals', false)).toBe(1);
    expect(usageRank({ id: 'Components:一', hanzi: '一' }, 'Components', true)).toBe(1);
  });
  it('keeps radical groups and uses the supplied new component classes', () => {
    expect(usageGroupFor('Radicals', 20)?.value).toBe('1-20');
    expect(usageGroupFor('Radicals', 21)?.value).toBe('21-50');
    expect(usageGroups('Components').map(g => g.value)).toEqual(['1-25', '26-50', '51-100', '101-200', '201-300', '301-500', '501-1000', '1001-plus', 'unranked']);
    expect(usageGroupFor('Components', 25)?.value).toBe('1-25');
    expect(usageGroupFor('Components', 26)?.value).toBe('26-50');
    expect(usageGroupFor('Components', 700)?.value).toBe('501-1000');
    expect(usageGroupFor('Characters', null)?.value).toBe('unranked');
  });
  it('preserves all eight all-form component cumulative percentages from the supplied table', () => {
    expect(Object.values(usage.scopes.all.groupCumulative.components).map(n => n.toFixed(2))).toEqual(['40.09', '57.16', '73.67', '87.66', '93.40', '97.90', '99.93', '100.00']);
  });
  it('preserves all eight character corpus coverage percentages from the supplied table', () => {
    expect(Object.values(usage.scopes.all.groupCumulative.characters).map(n => n.toFixed(2))).toEqual(['41.77', '64.64', '75.81', '89.14', '97.13', '99.54', '99.92', '100.00']);
  });
  it('uses per-record cumulative values and leaves unrecorded percentages absent', () => {
    expect(usageCumulative('的', 'Characters', true)).toBeCloseTo(4.094325317834);
    expect(usageCumulative('一', 'Components', true)).toBeCloseTo(4.656843105767273);
    expect(usageCumulative('missing', 'Components', true)).toBeNull();
    expect(usageCumulative('人', 'Radicals', true)).toBeNull();
  });
  it('uses the scope-specific component share rather than character corpus coverage', () => {
    const group = usageGroups('Components')[0];
    if (!group) throw new Error('Missing component class');
    expect(usageGroupLabel(group, 'Components', true)).toContain('40.09%');
    expect(usageGroupLabel(group, 'Components', false)).toContain('40.10%');
  });
  it('sorts most frequent first with unranked last', () => {
    const rows = ['龘', '人', '的'].map(hanzi => ({ id: `Characters:${hanzi}`, hanzi }));
    expect(sortByUsage(rows, 'Characters', true).map(r => r.hanzi)).toEqual(['的', '人', '龘']);
  });
});

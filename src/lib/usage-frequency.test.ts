import { describe, expect, it } from 'vitest';
import usage from '../../public/data/usage-order.json';
import { hydrateUsageOrder, usageGroups, usageGroupLabel, usageCumulative, usagePercentage, formatUsagePercentage, usageGroupFor, usageRank, sortByUsage, type UsageOrderFile } from './usage-frequency';

hydrateUsageOrder(usage as UsageOrderFile);
describe('frequency ranks', () => {
  it('keeps two significant digits below one percent without scientific notation', () => {
    expect(formatUsagePercentage(0.0374)).toBe('0.037%');
    expect(formatUsagePercentage(0.456)).toBe('0.46%');
    expect(formatUsagePercentage(0.4)).toBe('0.40%');
    expect(formatUsagePercentage(0.000001234)).toBe('0.0000012%');
    expect(formatUsagePercentage(0.999)).toBe('1.0%');
  });
  it('keeps one decimal place at one percent and above, and for zero', () => {
    expect(formatUsagePercentage(1)).toBe('1.0%');
    expect(formatUsagePercentage(1.576)).toBe('1.6%');
    expect(formatUsagePercentage(40.09)).toBe('40.1%');
    expect(formatUsagePercentage(0)).toBe('0.0%');
  });
  it('uses individual entry percentages, not cumulative totals, for details', () => {
    expect(usagePercentage('一', 'Characters', true)).toBeCloseTo(1.5765677795899825);
    expect(usagePercentage('口', 'Components', true)).toBeCloseTo(3.8704786491988545);
    expect(usagePercentage('口', 'Components', true)).not.toBe(usageCumulative('口', 'Components', true));
    expect(usagePercentage('missing', 'Characters', true)).toBeNull();
    expect(usagePercentage('人', 'Radicals', true)).toBeNull();
  });
  it('uses the supplied ranks: 的 first character, 人 (#9) first radical, 一 first component', () => {
    expect(usageRank({ id: 'Characters:的', hanzi: '的' }, 'Characters', false)).toBe(1);
    expect(usageRank({ id: 'Radicals:人', hanzi: '人', kangxiIndex: 9 }, 'Radicals', false)).toBe(1);
    expect(usageRank({ id: 'Components:一', hanzi: '一' }, 'Components', true)).toBe(1);
  });
  it('keeps radical groups and uses the supplied new component classes', () => {
    expect(usageGroupFor('Radicals', 20)?.value).toBe('11-25');
    expect(usageGroupFor('Radicals', 26)?.value).toBe('26-50');
    expect(usageGroups('Components').map(g => g.value)).toEqual(['1-25', '26-50', '51-100', '101-200', '201-300', '301-500', '501-1000', '1001-plus', 'unranked']);
    expect(usageGroupFor('Components', 25)?.value).toBe('1-25');
    expect(usageGroupFor('Components', 26)?.value).toBe('26-50');
    expect(usageGroupFor('Components', 700)?.value).toBe('501-1000');
    expect(usageGroupFor('Characters', null)?.value).toBe('unranked');
  });
  it('preserves all eight all-form component cumulative percentages from the supplied table', () => {
    expect(Object.values((usage as UsageOrderFile).scopes.all.groupCumulative?.components ?? {}).map(n => n.toFixed(2))).toEqual(['40.09', '57.16', '73.67', '87.66', '93.40', '97.90', '99.93', '100.00']);
  });
  it('matches all seven supplied radical cumulative classes without changing rank identities', () => {
    expect(usageGroups('Radicals').map(g => g.value)).toEqual(['1-10', '11-25', '26-50', '51-100', '101-150', '151-200', '201-plus', 'unranked']);
    expect(Object.values((usage as UsageOrderFile).scopes.all.groupCumulative?.radicals ?? {}).map(n => n.toFixed(2))).toEqual(['36.46', '58.32', '76.33', '92.82', '98.79', '99.99', '100.00']);
    expect((usage as UsageOrderFile).scopes.all.groupCumulative?.radicals?.['151-200']).toBeCloseTo(99.9886, 4);
  });
  it('uses the selected Kangxi identity for individual radical assignment share', () => {
    expect(usagePercentage('人', 'Radicals', true, 9)).toBeCloseTo(14237989 / 193491251 * 100);
    expect(usagePercentage('亻', 'Radicals', true, 9)).toBe(usagePercentage('人', 'Radicals', true, 9));
    expect(usagePercentage('人', 'Radicals', true)).toBeNull();
  });
  it('preserves all eight character corpus coverage percentages from the supplied table', () => {
    expect(Object.values((usage as UsageOrderFile).scopes.all.groupCumulative?.characters ?? {}).map(n => n.toFixed(2))).toEqual(['41.77', '64.64', '75.81', '89.14', '97.13', '99.54', '99.92', '100.00']);
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
    expect(usageGroupLabel(group, 'Components', true)).toContain('40.1%');
    expect(usageGroupLabel(group, 'Components', false)).toContain('40.1%');
  });
  it('sorts most frequent first with unranked last', () => {
    const rows = ['龘', '人', '的'].map(hanzi => ({ id: `Characters:${hanzi}`, hanzi }));
    expect(sortByUsage(rows, 'Characters', true).map(r => r.hanzi)).toEqual(['的', '人', '龘']);
  });
});

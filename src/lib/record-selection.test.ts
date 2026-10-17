import { describe, expect, it } from 'vitest';
import { includeSelectedRecord } from './record-selection';

describe('explicit record selection', () => {
  const all = [{ id: 'first' }, { id: 'selected' }, { id: 'last' }];
  it('includes the selected record excluded by browsing filters in catalogue order', () => {
    expect(includeSelectedRecord(all, [all[0], all[2]].filter((entry): entry is { id: string } => Boolean(entry)), 'selected')).toEqual(all);
  });
  it('reveals a selection even when no records match the filters', () => {
    expect(includeSelectedRecord(all, [], 'selected')).toEqual([{ id: 'selected' }]);
  });
  it('does not add unselected or nonexistent records', () => {
    expect(includeSelectedRecord(all, [], 'missing')).toEqual([]);
    expect(includeSelectedRecord(all, [], '')).toEqual([]);
  });
});
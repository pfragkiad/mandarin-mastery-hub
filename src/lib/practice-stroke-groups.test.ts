import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CharacterEnrichment } from './character-enrichment';
import { practiceStrokeGroups, strokeGroupRuns } from './practice-stroke-groups';

const record = JSON.parse(readFileSync('public/data/character-enrichment/5b66.json', 'utf8')).record as CharacterEnrichment;
describe('component stroke grouping', () => {
  it('keeps 学’s recorded three components and exact occurrences', () => {
    expect(practiceStrokeGroups('学', 8, record).map(g => [g.glyph, g.strokeIndices])).toEqual([
      ['⺍', [0, 1, 2]], ['冖', [3, 4]], ['子', [5, 6, 7]],
    ]);
  });
  it('uses one group for radicals even with a component mapping', () => {
    expect(practiceStrokeGroups('学', 8, record, true).map(g => g.strokeIndices)).toEqual([[0, 1, 2, 3, 4, 5, 6, 7]]);
  });
  it('uses one whole-form group without a mapping', () => {
    expect(practiceStrokeGroups('非', 8, null).map(g => g.glyph)).toEqual(['非']);
  });
  it('never transfers the current mapping to BabelStone', () => {
    expect(practiceStrokeGroups('学', 8, record, false, 'babelstone-0')).toEqual([
      { id: 'whole', glyph: '学', strokeIndices: [0, 1, 2, 3, 4, 5, 6, 7], palette: 0 },
    ]);
  });
  it('puts partial unknown strokes into a single unnamed group', () => {
    const partial: CharacterEnrichment = { ...record, mapping: { status: 'partial', groups: record.mapping.groups.slice(0, 1), unknownStrokeIndices: [3, 4, 5, 6, 7] } };
    expect(practiceStrokeGroups('学', 8, partial).map(g => [g.glyph, g.strokeIndices])).toEqual([['⺍', [0, 1, 2]], [null, [3, 4, 5, 6, 7]]]);
  });
  it('rejects overlapping assignments rather than painting a misleading group', () => {
    const bad = structuredClone(record); const group = bad.mapping.groups[1];
    if (!group) throw new Error('Expected 冖'); group.strokeIndices = [2, 4];
    expect(practiceStrokeGroups('学', 8, bad)[0]?.id).toBe('whole');
  });
  it('preserves writing order for noncontiguous components', () => {
    const runs = strokeGroupRuns([{ id: 'a', glyph: '衣', strokeIndices: [0, 2], palette: 0 }, { id: 'b', glyph: '果', strokeIndices: [1], palette: 1 }], 3);
    expect(runs.map(run => [run.group.id, run.indices])).toEqual([['a', [0]], ['b', [1]], ['a', [2]]]);
  });
});
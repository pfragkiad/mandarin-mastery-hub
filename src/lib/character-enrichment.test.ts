import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { catalog } from './catalog-store';
import { treeChecksum, validateEnrichment, type CharacterEnrichment, type BoundGeometry } from './character-enrichment';

beforeAll(() => { vi.stubGlobal('crypto', webcrypto); });
function record(glyph: string): CharacterEnrichment {
  const point = glyph.codePointAt(0);
  if (point === undefined) throw new Error('Missing glyph');
  return JSON.parse(readFileSync(`public/data/character-enrichment/${point.toString(16)}.json`, 'utf8')).record;
}
function geometry(r: CharacterEnrichment): BoundGeometry {
  return { checksum: r.bindings.geometryChecksum, data: {
    strokes: Array.from({ length: r.bindings.strokeCount }, () => 'source path'),
    medians: Array.from({ length: r.bindings.strokeCount }, () => [[0, 0], [1, 1]]),
  } };
}
describe('bound character enrichment', () => {
  it('fingerprints 河 using compact literal Unicode JSON and a trailing LF', async () => {
    expect(await treeChecksum(catalog.trees['河'])).toBe('553901647f9706a5a1c8662d647a422f15fcbda53a62ed524396d45feccc7167');
  });
  it('retains explicit unknowns in 非 as null tree leaves', async () => {
    const r = record('非');
    expect(await treeChecksum(catalog.trees['非'])).toBe(r.bindings.treeChecksum);
    expect(r.mapping.groups).toEqual([]);
    expect(r.mapping.unknownStrokeIndices).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
  it('accepts matching current tree and geometry', async () => {
    const r = record('河');
    expect(await validateEnrichment(r, catalog.trees['河'], geometry(r))).toBe(true);
    expect(r.mapping.groups[0]?.strokeIndices).toEqual([0, 1, 2]);
  });
  it('rejects changed trees including their comparison status', async () => {
    const r = record('河');
    expect(await validateEnrichment(r, catalog.trees['林'], geometry(r))).toBe(false);
  });
  it('rejects changed raw geometry checksums', async () => {
    const r = record('河');
    expect(await validateEnrichment(r, catalog.trees['河'], { ...geometry(r), checksum: '0'.repeat(64) })).toBe(false);
  });
  it('never overrides manual corrections or intentional unknown decisions', async () => {
    const r = record('河');
    expect(await validateEnrichment(r, catalog.trees['河'], geometry(r), true)).toBe(false);
  });
  it('rejects the missing-tree mapping for 丁', async () => {
    const r = record('丁');
    expect(await validateEnrichment(r, catalog.trees['丁'], geometry(r))).toBe(false);
  });
  it('preserves separated 衣 indices in 裹 without permitting standalone substitution', async () => {
    const r = record('裹');
    expect(await validateEnrichment(r, catalog.trees['裹'], geometry(r))).toBe(true);
    expect(r.mapping.groups[0]?.strokeIndices).toEqual([0, 1, 10, 11, 12, 13]);
    expect(r.mapping.groups[0]?.standaloneReuseAllowed).toBe(false);
  });
  it('retains two independently addressed 木 occurrences in 林', () => {
    const r = record('林');
    expect(r.mapping.groups.map(g => [g.path, g.standaloneReuseAllowed])).toEqual([[[0], false], [[1], true]]);
  });
  it('rejects overlapping component stroke indices', async () => {
    const r = record('河');
    const first = r.mapping.groups[0];
    if (!first) throw new Error('Expected 氵');
    first.strokeIndices = [0, 1, 3]; first.noncontiguous = true;
    expect(await validateEnrichment(r, catalog.trees['河'], geometry(r))).toBe(false);
  });
});
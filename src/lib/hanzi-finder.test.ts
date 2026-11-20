import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { comparableCounts, decodeFinderIndex, findMatches, FINDER_MIN_SCORE, referenceDrawing, type FinderIndexFile, type FinderStroke } from './hanzi-finder';
import { finderCoversGlyph, finderDestination, finderRecord } from './hanzi-finder-records';
import finderMissing from '@/data/finder-missing.json';

const file = JSON.parse(readFileSync('public/data/finder-medians.json', 'utf8')) as FinderIndexFile;
const index = decodeFinderIndex(file);

/** A learner-like drawing of `glyph`: its recorded strokes, shrunk, shifted and wobbled. */
function drawingOf(glyph: string, { swapFirstTwo = false, reverseFirst = false } = {}): FinderStroke[] {
  const packed = file.glyphs[glyph]!;
  const per = file.points * 2;
  let seed = 11;
  const jitter = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647 - 0.5) * 0.04; };
  const strokes: [number, number][][] = [];
  for (let s = 0; s < packed.length; s += per) {
    const stroke: [number, number][] = [];
    for (let p = 0; p < per; p += 2) stroke.push([0.15 + file.alphabet.indexOf(packed[s + p]!) / 63 * 0.7 + jitter(), 0.1 + file.alphabet.indexOf(packed[s + p + 1]!) / 63 * 0.75 + jitter()]);
    strokes.push(stroke);
  }
  if (reverseFirst) strokes[0]!.reverse();
  if (swapFirstTwo && strokes.length > 1) [strokes[0], strokes[1]] = [strokes[1]!, strokes[0]!];
  return strokes;
}

describe('Hanzi finder matching', () => {
  it('ranks the drawn character first with a high similarity', () => {
    for (const glyph of ['永', '我', '国', '木', '氵', '门']) {
      const [best] = findMatches(drawingOf(glyph), index);
      expect(best?.glyph).toBe(glyph);
      expect(best!.score).toBeGreaterThanOrEqual(80);
    }
  });

  it('still finds a character drawn in a slightly wrong order or direction', () => {
    expect(findMatches(drawingOf('字', { swapFirstTwo: true }), index)[0]?.glyph).toBe('字');
    expect(findMatches(drawingOf('大', { reverseFirst: true }), index)[0]?.glyph).toBe('大');
  });

  it('lists only matches at the minimum score or more, best first', () => {
    const results = findMatches(drawingOf('林'), index);
    expect(results.every(r => r.score >= FINDER_MIN_SCORE && r.score <= 100)).toBe(true);
    expect(results.map(r => r.score)).toEqual([...results.map(r => r.score)].sort((a, b) => b - a));
  });

  it('only compares glyphs with a nearby stroke count', () => {
    expect(comparableCounts(1)).toEqual([1, 2, 3]);
    expect(comparableCounts(12)).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16]);
  });

  it('returns nothing for an empty board', () => {
    expect(findMatches([], index)).toEqual([]);
  });

  it('holds recorded geometry for one entry per exact glyph only', () => {
    expect(Object.keys(file.glyphs).length).toBe(new Set(Object.keys(file.glyphs)).size);
    expect(file.source.name).toBe('hanzi-writer-data');
  });
});

describe('Hanzi finder records', () => {
  it('opens a glyph recorded in several libraries once, on its radical card', () => {
    expect(finderRecord('木', 'all', false)?.kind).toBe('Radicals');
    expect(finderRecord('木', 'Characters', false)?.kind).toBe('Characters');
  });

  it('keeps a single-library scope to that library\'s own records', () => {
    expect(finderRecord('你', 'Radicals', false)).toBeNull();
    expect(finderRecord('你', 'all', false)?.kind).toBe('Characters');
  });

  it('labels a gold radical form by its library and as a radical (阝 Component · Radical)', () => {
    expect(finderRecord('阝', 'all', false)?.kindLabel).toBe('Component · Radical');
    expect(finderRecord('口', 'Characters', false)?.kindLabel).toBe('Character · Radical');
    expect(finderRecord('木', 'all', false)?.kindLabel).toBe('Radical');
    expect(finderRecord('你', 'all', false)?.kindLabel).toBe('Character');
  });

  it('the Radicals filter shows every gold match: radical cards, component-radicals and character-radicals', () => {
    expect(finderRecord('木', 'Radicals', false)?.kindLabel).toBe('Radical');
    expect(finderRecord('阝', 'Radicals', false)?.kindLabel).toBe('Component · Radical');
    expect(finderRecord('⺊', 'Radicals', false)?.kindLabel).toBe('Component · Radical');
    expect(finderRecord('门', 'Radicals', false)?.kindLabel).toBe('Character · Radical');
    expect(finderRecord('你', 'Radicals', false)).toBeNull();
  });

  it('leaves Traditional records out unless the preference includes them', () => {
    expect(finderRecord('國', 'Characters', false)).toBeNull();
    expect(finderRecord('國', 'Characters', true)?.kind).toBe('Characters');
  });
});

describe('Find similar', () => {
  it('compares a glyph\'s own recorded strokes with the same metric, the glyph scoring itself highest', () => {
    const drawing = referenceDrawing(index, '木')!;
    expect(drawing).toHaveLength(4);
    expect(drawing.flat().every(([x, y]) => x >= 0.099 && x <= 0.901 && y >= 0.099 && y <= 0.901)).toBe(true);
    const [best] = findMatches(drawing, index);
    expect(best?.glyph).toBe('木');
    expect(best!.score).toBeGreaterThanOrEqual(95);
    // Excluding the source glyph leaves its look-alikes, best first.
    const similar = findMatches(drawing, index, glyph => glyph !== '木').map(r => r.glyph);
    expect(similar).not.toContain('木');
    expect(similar.slice(0, 5)).toContain('术');
  });

  it('never substitutes strokes for a glyph without recorded geometry', () => {
    expect(referenceDrawing(index, '鸛')).toBeNull();
    expect(finderCoversGlyph('鸛')).toBe(false);
  });

  it('offers Find similar exactly for glyphs the index holds', () => {
    expect(finderMissing.missing).toEqual((file as FinderIndexFile & { missing: string[] }).missing);
    expect(finderCoversGlyph('木')).toBe(true);
    expect(finderCoversGlyph('肀')).toBe(Boolean(file.glyphs['肀']));
  });
});

describe('Radical variant forms in the finder', () => {
  it('⻏ (family #163 right-side form) has its own recorded strokes, so Find similar is offered', () => {
    expect(referenceDrawing(index, '⻏')).toHaveLength(2);
    expect(finderCoversGlyph('⻏')).toBe(true);
  });

  it('a ⻏ match opens the #163 card with exactly that form selected', () => {
    const hit = finderRecord('⻏', 'all', false);
    expect(hit?.kind).toBe('Radicals');
    expect(hit?.entry.radicalVariant).toBe('163-1');
    expect(finderDestination(hit!.kind, hit!.entry)).toEqual({ tab: 'Radicals', id: 'Radicals:邑', variant: '163-1' });
    expect(finderRecord('⻏', 'Characters', false)).toBeNull();
  });

  it('a form outlined only through a look-alike (⺿ via 艹) offers no Find similar', () => {
    expect(referenceDrawing(index, '⺿')).toBeNull();
    expect(finderCoversGlyph('⺿')).toBe(false);
  });
});

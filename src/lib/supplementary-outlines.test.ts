// The four-stroke grass form ⺿ uses the owner-approved AnimCJK Taiwan-style 艹 outline,
// while the ordinary 3-stroke 艹 keeps loading from Hanzi Writer Data.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadStrokeGeometry } from './character-enrichment';

afterEach(() => vi.unstubAllGlobals());

function stubFetch() {
  const urls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    urls.push(url);
    if (url.startsWith('/data/')) return new Response(readFileSync(`public${url}`));
    return new Response(JSON.stringify({ strokes: ['a', 'b', 'c'], medians: [[[0, 0]], [[0, 0]], [[0, 0]]] }));
  }));
  return urls;
}

describe('supplementary handwriting outlines', () => {
  it('loads ⺿ as four AnimCJK Taiwan-style 艹 strokes without asking Hanzi Writer Data', async () => {
    const urls = stubFetch();
    const geometry = await loadStrokeGeometry('⺿');
    expect(geometry.data.strokes).toHaveLength(4);
    expect(geometry.data.medians).toHaveLength(4);
    expect(geometry.source).toMatchObject({ name: 'AnimCJK', recordedAs: '艹', style: 'Taiwan (ZhHant)' });
    expect(urls).toEqual(['/data/supplementary-outlines/2ebf.json']);
  });

  it('keeps the three-stroke 艹 on Hanzi Writer Data', async () => {
    const urls = stubFetch();
    const geometry = await loadStrokeGeometry('艹');
    expect(geometry.source).toBeUndefined();
    expect(urls[0]).toContain('hanzi-writer-data');
  });

  // Exact-code-point outlines from the full radical-family scan: AnimCJK records the same glyph,
  // so the source is marked exact and the stroke count equals the radical file's.
  it.each([['⺆', 2], ['牜', 4], ['⺶', 6], ['⻏', 2], ['⻗', 8]] as const)('loads %s as its own %i-stroke AnimCJK outline', async (glyph, count) => {
    stubFetch();
    const geometry = await loadStrokeGeometry(glyph);
    expect(geometry.data.strokes).toHaveLength(count);
    expect(geometry.source).toMatchObject({ name: 'AnimCJK', recordedAs: glyph, style: 'Mainland (ZhHans)', exact: true });
  });

  it('marks the reviewed ⺿ → 艹 link as not exact', async () => {
    stubFetch();
    expect((await loadStrokeGeometry('⺿')).source?.exact).toBe(false);
  });

  // No source records these exact forms; they must keep failing closed, never borrowing a look-alike.
  it.each(['⺴', '⺁', '⺧', '⺪', '⺷', '⻊', '𧢲'])('keeps %s off the supplementary list', glyph => {
    const manifest = JSON.parse(readFileSync('src/data/supplementary-outlines.json', 'utf8'));
    expect(manifest[glyph]).toBeUndefined();
  });
});

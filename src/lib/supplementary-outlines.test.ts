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
});

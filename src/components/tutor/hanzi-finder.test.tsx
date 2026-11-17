import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FinderHitTile, finderHalfFor, finderLayoutFor, finderRowsFor } from './hanzi-finder';
import { WorkspaceProvider } from './workspace';
import type { LibraryEntry } from '@/lib/character-library';

// The glyph's own outline would be fetched from the enrichment sidecar; that is
// not what these tests are about, so it is stubbed to a fixed answer. The real
// catalogue module stays in place (its data is lazy, so nothing is fetched here).
vi.mock('@/lib/character-enrichment', () => ({
  loadStrokeGeometry: async () => ({ data: { strokes: ['M0 0h10'], medians: [[[0, 0], [10, 10]]] }, source: null }),
}));

const hit = {
  glyph: '大',
  score: 82,
  kind: 'Characters' as const,
  kindLabel: 'Character',
  entry: { id: 'characters:大', hanzi: '大', pinyin: 'dà', meaning: 'big; large', note: '' } as LibraryEntry,
};

/** Render one tile and let the stubbed outline load settle inside act, so the
 *  tile's own state update never leaks out of the test. */
async function renderTile(onOpen = vi.fn(), onSimilar = vi.fn()) {
  render(<WorkspaceProvider><FinderHitTile hit={hit} onOpen={onOpen} onSimilar={onSimilar}/></WorkspaceProvider>);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  return { onOpen, onSimilar };
}

describe('finder match tile', () => {
  it('offers opening the card and making the match the reference as two separate controls', async () => {
    await renderTile();
    const open = screen.getByTitle('Open 大 in Characters');
    const similar = screen.getByRole('button', { name: 'Find similar to 大' });
    // Siblings, never nested: a button inside a button is invalid and would make
    // the reference action unclickable.
    expect(open.contains(similar)).toBe(false);
    expect(similar.contains(open)).toBe(false);
  });

  it('the top button switches the reference to this match without opening its card', async () => {
    const { onOpen, onSimilar } = await renderTile();
    fireEvent.click(screen.getByRole('button', { name: 'Find similar to 大' }));
    expect(onSimilar).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('the tile body still opens the glyph card and never switches the reference', async () => {
    const { onOpen, onSimilar } = await renderTile();
    fireEvent.click(screen.getByTitle('Open 大 in Characters'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onSimilar).not.toHaveBeenCalled();
  });
});

// The board and the first matches share the row in two equal halves; the rules below are the
// container-driven decisions behind that (no screen width is ever read), so they are tested as
// plain functions on the measured container width.
describe('finder layout rules', () => {
  it('gives each half the container width minus the 24px gap, halved', () => {
    expect(finderHalfFor(620)).toBe(298);
    expect(finderHalfFor(1009)).toBeCloseTo(492.5, 1);
  });

  it('splits the row only when a half is still wide enough to draw on', () => {
    expect(finderLayoutFor(620)).toBe('split');
    expect(finderLayoutFor(619)).toBe('stack');
    expect(finderLayoutFor(1009)).toBe('split');
  });

  it('shows four match rows in a wide half and three in a narrower one', () => {
    expect(finderRowsFor(744)).toBe(4); // half exactly 360px
    expect(finderRowsFor(1009)).toBe(4); // half ~493px
    expect(finderRowsFor(743)).toBe(3); // half 359.5px
    expect(finderRowsFor(640)).toBe(3); // half 308px
  });
});

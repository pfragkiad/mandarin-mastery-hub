import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FinderHitTile, finderBesideCount, finderBoardFor, finderSideColumnsFor } from './hanzi-finder';
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
    // Both open targets (character box, reading/meaning block) and the pen must be
    // siblings: a button inside a button is invalid and would make the reference
    // action unclickable.
    const opens = screen.getAllByTitle('Open 大 in Characters');
    const similar = screen.getByRole('button', { name: 'Find similar to 大' });
    expect(opens).toHaveLength(2);
    for (const open of opens) {
      expect(open.contains(similar)).toBe(false);
      expect(similar.contains(open)).toBe(false);
    }
  });

  it('the top button switches the reference to this match without opening its card', async () => {
    const { onOpen, onSimilar } = await renderTile();
    fireEvent.click(screen.getByRole('button', { name: 'Find similar to 大' }));
    expect(onSimilar).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('the tile body still opens the glyph card and never switches the reference', async () => {
    const { onOpen, onSimilar } = await renderTile();
    // The reading/meaning block is the second open target (the character box is the first).
    fireEvent.click(screen.getAllByTitle('Open 大 in Characters')[1]);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onSimilar).not.toHaveBeenCalled();
  });
});

// The board and the first matches always share the row so results stay visible while drawing;
// these are the container-driven rules behind that (no screen width is ever read).
describe('finder layout rules', () => {
  it('gives the board half the row on wide containers', () => {
    expect(finderBoardFor(1009)).toBe(496); // (1009 - 16) / 2
    expect(finderBoardFor(700)).toBe(342);
  });

  it('keeps a 300px board on narrower containers while one tile column fits beside it', () => {
    expect(finderBoardFor(500)).toBe(300);
    expect(finderBoardFor(360)).toBe(220); // 360 - 124px tile - 16px gap
  });

  it('never makes the board jump as the container narrows past the half/300px switch', () => {
    expect(finderBoardFor(616)).toBe(300);
    expect(finderBoardFor(615)).toBe(300);
    expect(finderBoardFor(617)).toBe(300);
  });

  it('fits as many 124px tile columns beside the board as the space allows, at least one', () => {
    expect(finderSideColumnsFor(124)).toBe(1);
    expect(finderSideColumnsFor(100)).toBe(1);
    expect(finderSideColumnsFor(258)).toBe(2);
    expect(finderSideColumnsFor(497)).toBe(3);
  });

  it('places full rows of tiles that fit next to the board column, at least one row', () => {
    expect(finderBesideCount(1, 280, 196)).toBe(1);
    expect(finderBesideCount(3, 550, 196)).toBe(6);
    expect(finderBesideCount(2, 100, 196)).toBe(2);
  });
});

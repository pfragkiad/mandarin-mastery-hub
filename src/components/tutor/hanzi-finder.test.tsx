import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FinderHitTile } from './hanzi-finder';
import { WorkspaceProvider } from './workspace';
import type { LibraryEntry } from '@/lib/character-library';

// The tile only needs the catalogue's audio lookup and the glyph's own outline;
// neither is what these tests are about, so both are stubbed to fixed answers.
vi.mock('@/lib/catalog-store', () => ({
  loadCatalog: async () => {},
  catalog: { version: 1 },
  characterRecording: () => null,
  playCharacter: async () => {},
}));
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

function renderTile(onOpen = vi.fn(), onSimilar = vi.fn()) {
  render(<WorkspaceProvider><FinderHitTile hit={hit} onOpen={onOpen} onSimilar={onSimilar}/></WorkspaceProvider>);
  return { onOpen, onSimilar };
}

describe('finder match tile', () => {
  it('offers opening the card and making the match the reference as two separate controls', () => {
    renderTile();
    const open = screen.getByTitle('Open 大 in Characters');
    const similar = screen.getByRole('button', { name: 'Find similar to 大' });
    // Siblings, never nested: a button inside a button is invalid and would make
    // the reference action unclickable.
    expect(open.contains(similar)).toBe(false);
    expect(similar.contains(open)).toBe(false);
  });

  it('the top button switches the reference to this match without opening its card', () => {
    const { onOpen, onSimilar } = renderTile();
    fireEvent.click(screen.getByRole('button', { name: 'Find similar to 大' }));
    expect(onSimilar).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('the tile body still opens the glyph card and never switches the reference', () => {
    const { onOpen, onSimilar } = renderTile();
    fireEvent.click(screen.getByTitle('Open 大 in Characters'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onSimilar).not.toHaveBeenCalled();
  });
});

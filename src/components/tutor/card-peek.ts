import { useCallback, useRef, useState } from 'react';
import type { CardReveal } from '@/lib/learning-preferences';

/**
 * Per-card "peek" state for the Hide modes on library grids.
 *
 * In a Hide mode clicking a card reveals only its hidden face in place
 * (self-check). Clicks never open the detail panel — the panel is reachable
 * only through the card's details button, which shows every answer at once.
 *
 * Inputs: the active reveal mode and a `resetKey` (tab, page, filters). Reveals
 * are temporary: whenever the mode or the key changes, all cards hide again so
 * paging never leaves stale revealed cards behind.
 */
export function useCardPeek(mode: CardReveal, resetKey: string) {
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set());
  const key = `${mode}|${resetKey}`;
  const [prevKey, setPrevKey] = useState(key);
  // Reset during render (React's derived-state pattern) so the hidden state is
  // correct on the very first paint after a page or mode change.
  if (prevKey !== key) { setPrevKey(key); setRevealed(new Set()); }
  const hiding = mode !== 'all';
  // A ref lets click handlers read the latest set without changing identity.
  const ref = useRef(revealed); ref.current = revealed;
  /** Click on a card: in a Hide mode reveal its hidden face; in Show all do nothing. */
  const reveal = useCallback((id: string) => {
    if (!hiding || ref.current.has(id)) return;
    setRevealed(prev => new Set(prev).add(id));
  }, [hiding]);
  return { hiding, revealed, reveal };
}

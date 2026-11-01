import { useCallback, useRef, useState } from 'react';
import type { CardReveal } from '@/lib/learning-preferences';

/**
 * Per-card "peek" state for the Hide modes on library grids.
 *
 * In a Hide mode the first click on a card reveals its hidden face in place
 * (self-check) instead of opening the detail panel, which would give away
 * every answer at once; a second click on a revealed card opens the panel.
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
  /** Returns true when the click should open details, false when it only revealed the card. */
  const peekOrOpen = useCallback((id: string) => {
    if (!hiding || ref.current.has(id)) return true;
    setRevealed(prev => new Set(prev).add(id));
    return false;
  }, [hiding]);
  return { hiding, revealed, peekOrOpen };
}

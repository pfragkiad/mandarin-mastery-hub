import { useCallback, useEffect, useState } from 'react';
import type { CardReveal } from '@/lib/learning-preferences';
import { useSessionCardReveals } from './workspace';

/**
 * Per-card "peek" state for the Hide modes on library grids.
 *
 * In a Hide mode clicking a card reveals only its hidden face in place
 * (self-check) and never opens the detail panel. In Show all nothing is hidden,
 * so a plain click on the card opens its details (`activate`), like the details
 * button. Cards keep the arrow cursor so their text stays selectable: a click that
 * ends a text selection (drag or double-click select) does not open anything.
 *
 * Inputs: mode, browsing reset key and optional session remembering. Local peeks
 * reset with browsing; remembered exact IDs survive routes until explicitly hidden.
 * Return-to-card events ensure visibility without accidentally toggling it off.
 */
export function useCardPeek(mode: CardReveal, resetKey: string, remember = false) {
  const session = useSessionCardReveals();
  const [local, setLocal] = useState<ReadonlySet<string>>(() => new Set());
  const revealed = remember && session ? session.revealed : local;
  const setRevealed = remember && session ? session.setRevealed : setLocal;
  const key = `${mode}|${resetKey}`;
  const [prevKey, setPrevKey] = useState(key);
  // Reset during render (React's derived-state pattern) so the hidden state is
  // correct on the very first paint after a page or mode change.
  if (prevKey !== key) { setPrevKey(key); if (!remember) setLocal(new Set()); }
  const hiding = mode !== 'all';
  const ensureRevealed = useCallback((id: string) => {
    if (!hiding || !id) return;
    setRevealed(prev => prev.has(id) ? prev : new Set([...prev, id]));
  }, [hiding, setRevealed]);
  useEffect(() => {
    const onReturn = (event: Event) => ensureRevealed((event as CustomEvent<string>).detail);
    window.addEventListener('tutor:reveal-card', onReturn);
    return () => window.removeEventListener('tutor:reveal-card', onReturn);
  }, [ensureRevealed]);
  /** Click on a card: in a Hide mode toggle its hidden face; in Show all do nothing. */
  const reveal = useCallback((id: string) => {
    if (!hiding) return;
    setRevealed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, [hiding, setRevealed]);
  /** Card click: peek in a Hide mode; in Show all open the details unless the click selected text. */
  const activate = useCallback((id: string, openDetails?: (id: string) => void) => {
    if (hiding) { reveal(id); return; }
    if (openDetails && !hasTextSelection()) openDetails(id);
  }, [hiding, reveal]);
  return { hiding, revealed, reveal, ensureRevealed, activate };
}

/** True when the learner has just selected text (the click ended a drag/double-click selection). */
function hasTextSelection() {
  if (typeof window === 'undefined') return false;
  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString().trim());
}

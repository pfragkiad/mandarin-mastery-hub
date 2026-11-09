import { useCallback, useEffect, useState } from 'react';
import type { CardReveal } from '@/lib/learning-preferences';
import { useSessionCardReveals } from './workspace';

/**
 * Per-card "peek" state for the Hide modes on library grids.
 *
 * In a Hide mode clicking a card reveals only its hidden face in place
 * (self-check). Clicks never open the detail panel — the panel is reachable
 * only through the card's details button, which shows every answer at once.
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
  return { hiding, revealed, reveal, ensureRevealed };
}

/**
 * Double-click on a library card's plain area (padding, gaps, background) opens
 * its details — only in Show all mode, where a single click does nothing.
 * Double-clicks on text (hanzi, pinyin, translation, labels) keep native word
 * selection, and controls (speaker, Save, Details, Practice, links) are ignored.
 * The card's own transparent wrapper button counts as plain area.
 */
const CARD_CONTENT = 'a, input, select, textarea, button:not(.word-open), [role="button"]:not(.word-open), .pinyin, .word-hanzi-tile, .tile-hanzi-row, .tile-form, .word-meaning, .tile-absent, .word-card-top span, .record-card-footer span, svg';
export function isPlainCardDoubleClick(mode: CardReveal, target: EventTarget | null): boolean {
  if (mode !== 'all' || !(target instanceof Element)) return false;
  return !target.closest(CARD_CONTENT);
}

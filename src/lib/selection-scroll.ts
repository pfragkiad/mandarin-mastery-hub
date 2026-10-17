import { useEffect, useRef } from 'react';

/** Brings the card for the URL-selected record into view whenever the selection
 *  changes (arriving from a word/phrase link, a decomposition glyph, a tab switch,
 *  or a deep link). Uses block:'nearest', so a card that is already on screen —
 *  same-page clicks, restored back/forward scroll — never moves the page. */
export function useRecordScroll(id: string, ready = true) {
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    if (last.current === id) return;
    last.current = id;
    if (!id) return;
    const frame = requestAnimationFrame(() => {
      document.querySelector(`[data-entry-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(frame);
  }, [id, ready]);
}

import { useEffect } from 'react';

/** Recheck after committed updates, including same-record selection and history.
 * Already-visible cards never move the page. */
export function useRecordScroll(id: string, ready = true) {
  useEffect(() => {
    if (!ready || !id) return;
    const reveal = () => {
      const card = document.querySelector<HTMLElement>(`[data-entry-id="${CSS.escape(id)}"]`);
      if (!card) return;
      const rect = card.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight || rect.left < 0 || rect.right > window.innerWidth) {
        card.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      }
    };
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(reveal);
    });
    // Router history restoration runs after rendering; verify again once it settles.
    const settled = window.setTimeout(reveal, 200);
    return () => { cancelAnimationFrame(frame); window.clearTimeout(settled); };
  });
}

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

/** After the floating detail sheet closes, bring the record's own card back into
 * view and focus it — however the sheet was opened (grid details button, global
 * search, start page). Runs on animation frames so it lands after the dialog's
 * own focus restoration and the closing navigation commit. */
export function focusRecordCard(id: string) {
  if (!id || typeof window === 'undefined') return;
  let tries = 0;
  const attempt = () => {
    const card = document.querySelector<HTMLElement>(`[data-entry-id="${CSS.escape(id)}"]`);
    if (card) {
      card.scrollIntoView({ block: 'center', behavior: 'instant' });
      if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '-1');
      card.focus({ preventScroll: true });
    } else if (++tries < 40) requestAnimationFrame(attempt);
  };
  requestAnimationFrame(attempt);
}

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

/**
 * Scroll so `card` sits where the grid's first row sits when the page is at its top
 * (just below the page numbers): its row takes the top row's place, however far the
 * details window's Previous/Next moved from the scroll position it was opened at.
 * Cards in the first row scroll the page to the top; the browser clamps the scroll, so
 * a card near the page end simply ends up visible lower down. A card too tall for that
 * spot (small screens) rises just enough to fit, staying below the 40px sticky bar.
 */
export function alignCardToTopRow(card: HTMLElement) {
  const first = document.querySelector<HTMLElement>('main [data-entry-id]') ?? document.querySelector<HTMLElement>('[data-entry-id]');
  const rect = card.getBoundingClientRect();
  const rowTop = (first ?? card).getBoundingClientRect().top + window.scrollY;
  const spot = Math.max(48, Math.min(rowTop, window.innerHeight - rect.height - 12));
  window.scrollTo({ top: Math.max(0, rect.top + window.scrollY - spot), behavior: 'instant' });
}

/** After the floating detail sheet closes, bring the record's own card back into
 * view (aligned with the grid's top row, alignCardToTopRow) and focus it — however
 * the sheet was opened (grid details button, global search, start page). Runs on
 * animation frames so it lands after the dialog's own focus restoration and the
 * closing navigation commit. */
export function focusRecordCard(id: string) {
  if (!id || typeof window === 'undefined') return;
  let tries = 0;
  const attempt = () => {
    // The closing modal keeps its focus trap during its exit animation. Wait
    // for teardown before focusing the card so it cannot steal focus back.
    if (document.querySelector('.detail-sheet')) {
      if (++tries < 120) requestAnimationFrame(attempt);
      return;
    }
    const card = document.querySelector<HTMLElement>(`[data-entry-id="${CSS.escape(id)}"]`);
    if (card) {
      window.dispatchEvent(new CustomEvent('tutor:reveal-card', { detail: id }));
      alignCardToTopRow(card);
      if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '-1');
      card.focus({ preventScroll: true });
      // Radix restores its opener in a deferred teardown callback. Reassert the
      // exact card after that callback, provided no new detail has opened.
      window.setTimeout(() => {
        if (card.isConnected && !document.querySelector('.detail-sheet')) card.focus({ preventScroll: true });
      }, 50);
    } else if (++tries < 40) requestAnimationFrame(attempt);
  };
  requestAnimationFrame(attempt);
}

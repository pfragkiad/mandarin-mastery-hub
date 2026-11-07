/**
 * Remembers the last non-Practice page (card grid, game, vocabulary…) so Practice's Back
 * returns there in one step, however many variants/characters were visited inside Practice.
 * Also remembers which record was opened first, so Back can scroll to and focus that card.
 * Session-only; updated from the shell on every location change.
 */
let lastOrigin: string | null = null;
let entryCharacter: string | null = null;
let entryStroke: string | null = null;
let entryRecordId: string | null = null;
let previousPath: string | null = null;

export function rememberOrigin(pathname: string, href: string) {
  if (pathname !== '/strokes') lastOrigin = href;
  else if (previousPath !== '/strokes') {
    const practice = new URL(href, 'http://x').searchParams;
    const origin = lastOrigin ? new URL(lastOrigin, 'http://x').searchParams : null;
    entryCharacter = practice.get('character');
    entryStroke = practice.get('stroke');
    entryRecordId = origin?.get('word') ?? origin?.get('id') ?? null;
  }
  previousPath = pathname;
}
export function practiceOrigin() { return lastOrigin; }

/** After Back: wait for the grid to render, then scroll the card holding the entry record's Practice link into view and focus it. */
export function focusEntryCard() {
  const target = entryCharacter;
  if ((!target && !entryStroke && !entryRecordId) || typeof window === 'undefined') return;
  let tries = 0;
  const attempt = () => {
    // Prefer the exact originating record (not another word sharing a character).
    const exact = entryRecordId ? [...document.querySelectorAll<HTMLElement>('[data-entry-id]')].find(card => card.dataset['entryId'] === entryRecordId) : undefined;
    const link = [...document.querySelectorAll<HTMLAnchorElement>('a[href^="/strokes"]')]
      .find(a => { const params = new URL(a.href).searchParams; return target ? params.get('character') === target : params.get('stroke') === entryStroke; });
    const card = exact ?? link?.closest<HTMLElement>('.word-card, article, li') ?? link;
    if (card) {
      const id = card.dataset['entryId'];
      if (id) window.dispatchEvent(new CustomEvent('tutor:reveal-card', { detail: id }));
      card.scrollIntoView({ block: 'center', behavior: 'instant' });
      if (!card.hasAttribute('tabindex') && !card.matches('a,button')) card.setAttribute('tabindex', '-1');
      card.focus({ preventScroll: true });
    } else if (++tries < 40) requestAnimationFrame(attempt);
  };
  requestAnimationFrame(attempt);
}

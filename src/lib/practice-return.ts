/**
 * Remembers the last non-Practice page (card grid, game, vocabulary…) so Practice's Back
 * returns there in one step, however many variants/characters were visited inside Practice.
 * Also remembers which record was opened first, so Back can scroll to and focus that card.
 * Session-only; updated from the shell on every location change.
 */
let lastOrigin: string | null = null;
let entryCharacter: string | null = null;
let previousPath: string | null = null;

export function rememberOrigin(pathname: string, href: string) {
  if (pathname !== '/strokes') lastOrigin = href;
  else if (previousPath !== '/strokes') entryCharacter = new URL(href, 'http://x').searchParams.get('character');
  previousPath = pathname;
}
export function practiceOrigin() { return lastOrigin; }

/** After Back: wait for the grid to render, then scroll the card holding the entry record's Practice link into view and focus it. */
export function focusEntryCard() {
  const target = entryCharacter;
  if (!target || typeof window === 'undefined') return;
  let tries = 0;
  const attempt = () => {
    const link = [...document.querySelectorAll<HTMLAnchorElement>('a[href^="/strokes"]')]
      .find(a => new URL(a.href).searchParams.get('character') === target);
    const card = link?.closest<HTMLElement>('.word-card, article, li') ?? link;
    if (card) {
      card.scrollIntoView({ block: 'center', behavior: 'instant' });
      if (!card.hasAttribute('tabindex') && !card.matches('a,button')) card.setAttribute('tabindex', '-1');
      card.focus({ preventScroll: true });
    } else if (++tries < 40) requestAnimationFrame(attempt);
  };
  requestAnimationFrame(attempt);
}

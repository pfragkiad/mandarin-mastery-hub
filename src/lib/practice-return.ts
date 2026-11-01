/**
 * Remembers the last non-Practice page (card grid, game, vocabulary…) so Practice's Back
 * returns there in one step, however many variants/characters were visited inside Practice.
 * Session-only; updated from the shell on every location change.
 */
let lastOrigin: string | null = null;
export function rememberOrigin(pathname: string, href: string) { if (pathname !== '/strokes') lastOrigin = href; }
export function practiceOrigin() { return lastOrigin; }

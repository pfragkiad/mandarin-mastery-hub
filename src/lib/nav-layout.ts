/**
 * Side-menu behaviour per window size (browser-safe, no React).
 *
 * - wide  (> 850px): the menu is always beside the page, either full (names and
 *   sub-items) or as the slim icon strip. One toggle at the bottom of the menu
 *   switches between them and the choice is remembered. There is no hamburger on
 *   wide windows, so the control never sits far from the menu it controls.
 * - phone (<= 850px): a bottom tab bar holds Start plus the four main
 *   destinations plus "More", which opens the full menu as a drawer over the
 *   page; the drawer's own close button sits in its top-right corner, on the
 *   logo row.
 *
 * The CSS breakpoint for the phone layout must match NAV_PHONE_MAX (styles.css
 * uses max-width: 850px / min-width: 851px), so the first paint before hydration
 * already shows the right layout.
 */
export type NavSize = 'phone' | 'wide';
export type NavMode = 'full' | 'rail' | 'drawer';

export const NAV_PHONE_MAX = 850;
/** Kept from the earlier pin/hide menu: a saved "false" (hidden) now means the icon strip. */
export const NAV_EXPANDED_KEY = 'tutor-nav-pinned';

export function navSizeFor(width: number): NavSize {
  return width <= NAV_PHONE_MAX ? 'phone' : 'wide';
}

/** Phones always use the drawer; wide windows show the full menu or the icon strip. */
export function navModeFor(size: NavSize, expanded: boolean): NavMode {
  return size === 'phone' ? 'drawer' : expanded ? 'full' : 'rail';
}

/** Stored preference; the menu starts full until the learner shrinks it. */
export function readNavExpanded(storage: Pick<Storage, 'getItem'> | undefined) {
  try { return storage?.getItem(NAV_EXPANDED_KEY) !== 'false'; } catch { return true; }
}

export type PhoneTab = 'start' | 'glyphs' | 'vocabulary' | 'games' | 'pinyin' | 'more';

/**
 * Which phone tab is lit for a page. Both Hanzi games count as Games; Settings
 * lives under More. Practice has no tab of its own (it is opened from Glyphs,
 * Vocabulary or a game), so no tab claims it.
 */
export function phoneTabFor(path: string): PhoneTab | null {
  if (path === '/') return 'start';
  if (path === '/characters') return 'glyphs';
  if (path === '/vocabulary') return 'vocabulary';
  if (path === '/flashcards' || path === '/drawing') return 'games';
  if (path === '/pinyin') return 'pinyin';
  if (path === '/settings') return 'more';
  return null;
}

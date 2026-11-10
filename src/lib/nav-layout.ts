/**
 * Side-menu behaviour per window size (browser-safe, no React).
 *
 * - large  (> 1150px): the menu starts beside the page. A collapse button inside the
 *   menu hides it; while hidden, the top-bar hamburger opens it over the page, and
 *   the pin inside that drawer puts it back beside the page. No hamburger while the
 *   menu is shown beside the page, so wide screens keep a clean top bar.
 * - medium (851–1150px): same pin/hide choice, but the hamburger is shown in both
 *   states (while pinned it hides the menu).
 * - small  (≤ 850px): never pinned; the menu only opens over the page from the
 *   hamburger button.
 *
 * One remembered choice (NAV_PINNED_KEY) covers medium and large windows, so hiding
 * the menu stays hidden when the window is resized across the 1150px boundary.
 */
export type NavSize = 'small' | 'medium' | 'large';

export const NAV_SMALL_MAX = 850;
export const NAV_MEDIUM_MAX = 1150;
export const NAV_PINNED_KEY = 'tutor-nav-pinned';

export function navSizeFor(width: number): NavSize {
  return width <= NAV_SMALL_MAX ? 'small' : width <= NAV_MEDIUM_MAX ? 'medium' : 'large';
}

/** True when the menu sits beside the page; false when it only opens as a drawer. */
export function navIsDocked(size: NavSize, pinned: boolean) {
  return size !== 'small' && pinned;
}

/** Hamburger: always on small/medium; on large only while the menu is hidden. */
export function navHasMenuButton(size: NavSize, pinned: boolean) {
  return size !== 'large' || !pinned;
}

/** Medium and large windows can hide/pin the menu; small never pins. */
export function navCanPin(size: NavSize) {
  return size !== 'small';
}

/** Stored preference; menus start pinned until the learner hides them. */
export function readNavPinned(storage: Pick<Storage, 'getItem'> | undefined) {
  try { return storage?.getItem(NAV_PINNED_KEY) !== 'false'; } catch { return true; }
}

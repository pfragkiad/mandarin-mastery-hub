/**
 * Side-menu behaviour per window size (browser-safe, no React).
 *
 * - large  (> 1150px): the menu is always shown; there is no way to hide it and no
 *   hamburger button.
 * - medium (851–1150px): the menu can be pinned (always shown beside the page) or
 *   hidden (opens over the page from the hamburger button). The hamburger button is
 *   shown in both cases; the choice is remembered in this browser.
 * - small  (≤ 850px): never pinned; the menu only opens over the page from the
 *   hamburger button.
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
  return size === 'large' || (size === 'medium' && pinned);
}

/** The hamburger button exists on medium and small windows only. */
export function navHasMenuButton(size: NavSize) {
  return size !== 'large';
}

/** Only medium windows offer the pin; large is always shown, small never pins. */
export function navCanPin(size: NavSize) {
  return size === 'medium';
}

/** Stored preference; medium windows start pinned until the learner hides the menu. */
export function readNavPinned(storage: Pick<Storage, 'getItem'> | undefined) {
  try { return storage?.getItem(NAV_PINNED_KEY) !== 'false'; } catch { return true; }
}

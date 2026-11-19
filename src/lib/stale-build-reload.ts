/**
 * Stale-build recovery.
 *
 * Purpose: every publish gives the page files new hashed names (characters-<hash>.js) and removes
 * the old ones. A tab opened before the publish still holds the old names, so the next lazily
 * loaded page fails with "Failed to fetch dynamically imported module" and a blank screen.
 * Reloading once fetches the new page shell with the current file names.
 *
 * State: one sessionStorage timestamp. A second failure within RELOAD_WINDOW_MS does not reload
 * again, so a file that is genuinely missing shows the normal error page instead of looping.
 * Tricky bit: the listener must exist before hydration (the first route chunk loads then), so
 * __root.tsx inlines STALE_BUILD_RELOAD_SCRIPT in <head>; the error boundary uses the same guard
 * for failures that still reach it.
 */
export const STALE_BUILD_RELOAD_KEY = 'tutor-stale-build-reload';
export const RELOAD_WINDOW_MS = 10_000;

const STALE_PATTERNS = [
  /Failed to fetch dynamically imported module/i, // Chromium
  /error loading dynamically imported module/i, // Firefox
  /Importing a module script failed/i, // Safari
  /Unable to preload CSS/i, // Vite CSS preload
];

/** True only for the "old hashed file is gone" failures, never ordinary runtime errors. */
export function isStaleBuildError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return STALE_PATTERNS.some(pattern => pattern.test(message));
}

/** Pure guard: reload unless the previous reload attempt happened within the window. */
export function shouldReload(lastAttempt: number | null, now: number): boolean {
  return lastAttempt === null || !Number.isFinite(lastAttempt) || now - lastAttempt > RELOAD_WINDOW_MS;
}

/** Reloads once per window; returns whether a reload was started. */
export function reloadForStaleBuild(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.sessionStorage.getItem(STALE_BUILD_RELOAD_KEY);
    const now = Date.now();
    if (!shouldReload(raw === null ? null : Number(raw), now)) return false;
    window.sessionStorage.setItem(STALE_BUILD_RELOAD_KEY, String(now));
  } catch { /* storage unavailable: still reload once for this event */ }
  window.location.reload();
  return true;
}

/** Inline <head> script: same guard, registered before any module script runs. */
export const STALE_BUILD_RELOAD_SCRIPT = `window.addEventListener('vite:preloadError',function(e){try{var k='${STALE_BUILD_RELOAD_KEY}',n=Date.now(),l=Number(sessionStorage.getItem(k));if(l&&n-l<=${RELOAD_WINDOW_MS})return;sessionStorage.setItem(k,String(n))}catch(_){}e.preventDefault();location.reload()});`;

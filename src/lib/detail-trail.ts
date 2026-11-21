/**
 * Session-only "Back" trail for the floating details window.
 *
 * When a link inside an open details window (e.g. a Decomposition part) opens
 * another record's details, the record being left is pushed here with the URL
 * it was shown at. Leaving the Practice page for a details window records the
 * practice location the same way (as the only step), so the window's Back
 * button returns one step through browser history; Previous/Next (neighbour
 * cards in the grid) and Close reset the trail, so Back never mixes with grid
 * navigation.
 */
/** `lang` tags the Back label when it is not pinyin (a hanzi such as 了 when a glyph card opened the Sound chart).
 *  `sameCard` marks a step left through the card's own form switch (襾 → 西): the next entry
 *  is still this card, so Close steps over it. `index`/`key` are the history entry the step
 *  was recorded at (filled in by push/replace), so Close can return to exactly that entry. */
export type TrailStep = { label: string; href: string; lang?: string; sameCard?: boolean; index?: number; key?: string };

/** The router's position for the current history entry (TanStack stores both in history.state). */
export function historyPosition(): { index?: number; key?: string } {
  const state = (typeof window === 'undefined' ? null : window.history.state) as { __TSR_index?: unknown; __TSR_key?: unknown } | null;
  return {
    ...(typeof state?.__TSR_index === 'number' ? { index: state.__TSR_index } : {}),
    ...(typeof state?.__TSR_key === 'string' ? { key: state.__TSR_key } : {}),
  };
}
const positioned = (step: TrailStep): TrailStep => ({ ...historyPosition(), ...step });

/**
 * Pages seen in this tab by history index (recorded by the root on every resolved
 * navigation). A push overwrites its index, so entries at or before the current one
 * always describe the live history; the details window reads the entry just before it
 * opened to tell "opened from the grid" from "opened from another page" (Start, a game).
 */
const visits = new Map<number, { key?: string; pathname: string }>();
export function recordVisit() {
  const { index, key } = historyPosition();
  if (index !== undefined) visits.set(index, { ...(key !== undefined ? { key } : {}), pathname: window.location.pathname });
}
export const visitAt = (index: number) => visits.get(index);

/** One independent session trail; each window that offers Back owns its own instance. */
export function createTrail() {
  let trail: TrailStep[] = [];
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(listener => listener());
  return {
    get: () => trail,
    push(step: TrailStep) { trail = [...trail, positioned(step)]; emit(); },
    /** Replace the trail with a single return step (leaving Practice for a detail window). */
    replace(step: TrailStep) { trail = [positioned(step)]; emit(); },
    clear() { if (trail.length) { trail = []; emit(); } },
    /** Drop the top step once the browser is back at its URL (Back button or browser Back). */
    sync(href: string) {
      const index = trail.map(step => step.href).lastIndexOf(href);
      if (index >= 0) { trail = trail.slice(0, index); emit(); }
    },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}

export const detailTrail = createTrail();

/**
 * Back trail for the Pinyin Sound chart's Selected sound card. Links inside the card
 * (Sounds alike) push a step; a glyph card's or details window's Sound chart link
 * (SoundChartLink) replaces it with one step back to that glyph; clicking a grid card
 * clears it, exactly as Previous/Next do for the details window.
 */
export const soundTrail = createTrail();

/**
 * Identity of the current history entry for soundTrail steps: the URL plus the router's
 * entry key, so reaching the same URL again as a new entry (lai → lei → lai) is never
 * mistaken for a return to the earlier one.
 */
export const historyEntry = () => `${window.location.href}#${(window.history.state as { __TSR_key?: string } | null)?.__TSR_key ?? ''}`;

/**
 * One-shot request from a glyph card's or details window's Sound chart link: when the chart
 * mounts it lines the selected syllable's grid card up with the top of the Selected sound
 * card (wide screens), instead of the usual "scroll only if hidden" reveal. Taken once.
 */
let alignOnArrival = false;
export const soundChartArrival = {
  request() { alignOnArrival = true; },
  take() { const value = alignOnArrival; alignOnArrival = false; return value; },
};

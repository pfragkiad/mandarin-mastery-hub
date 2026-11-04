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
export type TrailStep = { label: string; href: string };

let trail: TrailStep[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

export const detailTrail = {
  get: () => trail,
  push(step: TrailStep) { trail = [...trail, step]; emit(); },
  /** Replace the trail with a single return step (leaving Practice for a detail window). */
  replace(step: TrailStep) { trail = [step]; emit(); },
  clear() { if (trail.length) { trail = []; emit(); } },
  /** Drop the top step once the browser is back at its URL (Back button or browser Back). */
  sync(href: string) {
    const index = trail.map(step => step.href).lastIndexOf(href);
    if (index >= 0) { trail = trail.slice(0, index); emit(); }
  },
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
};

/**
 * Session memory for the glyph detail card's Decomposition | Etymology tabs (detail-tabs.tsx).
 * - entryTabs: the tab chosen on each history entry's card (`${historyKey}|${cardKey}`), so
 *   Back/Close to a card returns to the tab it was left on. In memory only, never saved.
 * - requestDetailTab: a one-shot request for the next card opened — Etymology links set it on
 *   a plain left click, so the linked card opens on its Etymology tab (when it has one).
 */
export type DetailTab = 'decomposition' | 'etymology';
export const entryTabs = new Map<string, DetailTab>();
/** The request remembers the history entry it was made on: navigation can update the card and
 *  the history key in separate renders, so it is taken only once both have moved on. */
let requested: { tab: DetailTab; historyKey: string; cardKey: string } | null = null;
let current = { historyKey: '', cardKey: '' };
export function requestDetailTab(tab: DetailTab) { requested = { tab, ...current }; }
/** Records the entry the visible card is on (called by the tabs while rendering). */
export function noteDetailEntry(historyKey: string, cardKey: string) { current = { historyKey, cardKey }; }
/** Returns and clears the pending request once both the history entry and card differ from its origin. */
export function takeRequestedTab(historyKey: string, cardKey: string): DetailTab | null {
  if (!requested || requested.historyKey === historyKey || requested.cardKey === cardKey) return null;
  const tab = requested.tab; requested = null; return tab;
}

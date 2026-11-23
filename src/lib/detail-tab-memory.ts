/**
 * Session memory for the glyph detail card's Decomposition | Etymology tabs (detail-tabs.tsx).
 * - entryTabs: the tab chosen on each history entry's card (`${historyKey}|${cardKey}`), so
 *   Back/Close to a card returns to the tab it was left on. In memory only, never saved.
 * - requestDetailTab: a one-shot request for the next card opened — Etymology links set it on
 *   a plain left click, so the linked card opens on its Etymology tab (when it has one).
 */
export type DetailTab = 'decomposition' | 'etymology';
export const entryTabs = new Map<string, DetailTab>();
/** The card last seen at each history position, so a form-switch navigation (a `replace`
 *  that keeps the same entry — 襾 → 西, simplified → traditional) can be told apart from
 *  opening another card. Keyed by the router's history INDEX, not its key: a replace
 *  navigation keeps the index but gets a fresh key. */
const lastAtIndex = new Map<number, { key: string; card: string }>();
/** Entries whose tab was carried over by a form switch. Such an entry already "has a tab", but
 *  it is the same card seen in another form, not a Back/Close return, so the tabs must not
 *  scroll themselves into view (the reader stays where they were on the card). */
export const carriedEntries = new Set<string>();
/** A form switch replaces the current entry (same history index) with a new card: carry the
 *  chosen tab to the new card's entry so Etymology stays selected. The replace also mints a
 *  fresh history key, so the previous entry's key is tracked alongside its card. Opening a
 *  different card pushes a new entry (index + 1), so it is never affected; without an index
 *  (tests/SSR) this opts out. */
export function carryTabOnCardSwitch(historyIndex: number | undefined, historyKey: string, cardKey: string) {
  if (historyIndex === undefined) return;
  const previous = lastAtIndex.get(historyIndex);
  lastAtIndex.set(historyIndex, { key: historyKey, card: cardKey });
  if (!previous || previous.card === cardKey) return;
  const from = entryTabs.get(`${previous.key}|${previous.card}`);
  const to = `${historyKey}|${cardKey}`;
  if (from && !entryTabs.has(to)) { entryTabs.set(to, from); carriedEntries.add(to); }
}
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

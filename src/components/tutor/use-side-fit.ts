import { useLayoutEffect, type DependencyList, type RefObject } from 'react';

/**
 * Side-by-side library card bodies: every Glyphs and Vocabulary card, Compact and Comfortable.
 *
 * Purpose: CSS lays the card body out with the hanzi box (or the row of form boxes, one row of
 * up to six) on the left and the pinyin+audio line over the translation on its right, which
 * saves two text lines. That only works when everything fits there uncut, so this hook measures
 * the side layout and, when it doesn't fit, marks the body `data-stacked`; CSS then stacks
 * box(es) / pinyin+audio / translation (styles.css "Library card body").
 *
 * Inputs: `ref` — the card's `.word-open` body; `enabled` — false to keep the side layout
 * unmeasured; `deps` — whatever changes the text or box size (record, visible lines, font
 * style, view, number of forms).
 * State: only DOM attributes and one inline font size on the translation, set directly (re-measured
 * on every resize and after web fonts settle), so measuring never rerenders the results grid.
 *
 * Fit means: the boxes aren't squeezed or pushed past the card edge, the pinyin stays on one
 * line with its speaker beside it, and the translation needs at most two lines (so the text
 * column is no taller than the box). The check always starts from the side layout, so the
 * result is stable.
 *
 * Translation font steps: a translation whose last line carries only one or two words costs the
 * card a whole line for almost nothing, so before that line is accepted the hook tries the
 * translation one pixel smaller at a time (MEANING_FONT_STEPS, never below MEANING_FONT_FLOOR)
 * until the short line joins the line above. It is tried first while deciding whether the side
 * layout can be kept at all — one line fewer is often exactly what the side layout needed — and
 * then again in whichever layout won. If no step removes the line, the translation keeps the
 * view's own size. The same steps run before an ellipsis is accepted: a translation still clipped
 * in the chosen layout (clamped lines, or one word wider than its column) is tried smaller first.
 *
 * Options (every library grid card — Glyphs, Words/Phrases and the Start random cards): `shrinkText`
 * adds a last attempt before stacking with pinyin and translation together up to
 * SIDE_TEXT_MAX_SHRINK smaller; `rowSync` stacks a whole grid row once any of its cards stacks
 * (see "Row sync" below).
 *
 * Tricky logic: the CSS base size has to be read with the inline override removed, so every step
 * starts by clearing it; the last line's word count is inferred from its measured width against
 * clones of the last one and two words, because the translation is rendered through MeaningText
 * and its text is split across nested spans.
 */
/** Opt-in extras used by the library grid cards (glyph and word/phrase cards alike). */
export type SideFitOptions = {
  /** Before stacking, also try the pinyin and translation together a few pixels smaller. */
  shrinkText?: boolean;
  /** Stack every card of a grid row once any card in that row needs to stack. */
  rowSync?: boolean;
  /** Custom natural-layout measurement for small example bodies; true means stacked. */
  fit?: (el: HTMLElement) => boolean;
};

export function useSideFit(ref: RefObject<HTMLElement | null>, enabled: boolean, deps: DependencyList, options: SideFitOptions = {}) {
  const { shrinkText = false, rowSync = false } = options;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!enabled) { delete el.dataset['stacked']; resetTextFonts(el); return; }
    const card: FitCard = { el, shrinkText, ...(options.fit ? { fit: options.fit } : {}) };
    let alive = true;
    // Row-synced cards are laid out together per grid (see flushRows); others measure alone.
    const measure = () => { if (!alive) return; if (rowSync) scheduleRow(card); else { fitSelf(card); finishFit(el); } };
    if (rowSync) { rowCards.add(card); sharedObserver()?.observe(el); }
    measure();
    void document.fonts?.ready.then(measure);
    // The card's handwritten web font can load lazily AFTER fonts.ready resolved; without
    // this, a card that failed the fit check in the wider fallback font stayed stacked forever.
    document.fonts?.addEventListener('loadingdone', measure);
    const observer = !rowSync && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    return () => {
      alive = false;
      document.fonts?.removeEventListener('loadingdone', measure);
      observer?.disconnect();
      if (rowSync) { rowCards.delete(card); sharedObserver()?.unobserve(el); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, shrinkText, rowSync, ...deps]);
}

type FitCard = { el: HTMLElement; shrinkText: boolean; fit?: (el: HTMLElement) => boolean };

/**
 * One card's own best layout, starting from the side layout: keep it as is, else a smaller
 * translation, else (shrinkText) pinyin and translation together a few pixels smaller, else stack.
 * Returns true when the card had to stack. Leaves the winning font sizes applied.
 */
function fitSelf({ el, shrinkText, fit }: FitCard): boolean {
  if (fit) return fit(el);
  delete el.dataset['stacked'];
  resetTextFonts(el);
  if (sideLayoutFits(el)) return false;
  // The side layout is lost because something is cut or too tall: a smaller translation may
  // need one line fewer and keep it, so try those steps before stacking.
  for (const step of MEANING_FONT_STEPS) {
    // Each step is measured from the view's own size, so clear the previous step first.
    resetTextFonts(el);
    if (!applyMeaningFont(el, step)) continue;
    if (sideLayoutFits(el)) return false;
  }
  if (shrinkText) {
    // Usually the pinyin line is what's too wide beside the box ("wǒ shòu gòu le" + speaker):
    // shrink pinyin and translation by the same few pixels, never more than SIDE_TEXT_MAX_SHRINK.
    resetTextFonts(el);
    const max = sideTextMaxStep(fontPx(pinyinElement(el)));
    for (let step = 1; step <= max; step += 1) {
      resetTextFonts(el);
      applyPinyinFont(el, step);
      applyMeaningFont(el, Math.min(step, Math.max(0, fontPx(meaningElement(el)) - MEANING_FONT_FLOOR)));
      if (sideLayoutFits(el)) return false;
    }
  }
  el.dataset['stacked'] = '';
  resetTextFonts(el);
  return true;
}

/**
 * Second pass in the chosen layout: stacked (or side) translations still clamp in grid cards, so a
 * clipped one tries the smaller steps before the ellipsis is accepted, and a 1-2 word last line
 * tries to join the line above. A size that just saved the side layout is final.
 */
function finishFit(el: HTMLElement) {
  if (meaningElement(el)?.style.fontSize || pinyinElement(el)?.style.fontSize) return;
  if (meaningClipped(el)) shrinkUntilUnclipped(el);
  else shrinkTrailingLine(el);
}

/* ---- Row sync -------------------------------------------------------------------------------
 * Tricky logic: whether a card stacks depends on its own text, so neighbours in one row could
 * mix side and stacked bodies. Row-synced cards are therefore laid out per grid in one
 * microtask (before paint, so no flicker): every card first finds its own layout (fitSelf), then
 * cards are grouped into rows by their top edge and, if any card of a row stacked, the others are
 * stacked too with their font steps cleared, and finally each card runs its stacked/side
 * finishing pass. One shared ResizeObserver feeds all of them, so a window resize lays a grid out
 * once rather than once per card. The end state is deterministic, so the observer settles. */
const rowCards = new Set<FitCard>();
const pendingGrids = new Set<Element>();
let flushQueued = false;
let observer: ResizeObserver | null | undefined;

function sharedObserver(): ResizeObserver | null {
  if (observer !== undefined) return observer;
  observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(entries => {
    for (const entry of entries) {
      const card = Array.from(rowCards).find(c => c.el === entry.target);
      if (card) scheduleRow(card);
    }
  });
  return observer;
}

/**
 * The grid a card lays out with: the parent of its `.word-card`. Start random cards each sit in
 * their own one-card wrapper, so there the real grid is the Start row (.overview-discovery-row)
 * holding glyph and word cards side by side, and they sync across it like library cards.
 */
function gridOf(el: HTMLElement): Element {
  return el.closest('.overview-discovery-row') ?? el.closest('.expandable-character-grid') ?? el.closest('.word-card')?.parentElement ?? el;
}

function scheduleRow(card: FitCard) {
  pendingGrids.add(gridOf(card.el));
  if (flushQueued) return;
  flushQueued = true;
  queueMicrotask(flushRows);
}

function flushRows() {
  flushQueued = false;
  const grids = Array.from(pendingGrids);
  pendingGrids.clear();
  for (const grid of grids) {
    const cards = Array.from(rowCards).filter(c => c.el.isConnected && gridOf(c.el) === grid);
    const own = new Map(cards.map(c => [c, fitSelf(c)] as const));
    const stacked = synchronizedRowStacks(cards.map(c => ({ top: rowKey(c), stacked: own.get(c) ?? false })));
    for (const [index, c] of cards.entries()) {
      if (!own.get(c) && stacked[index]) { c.el.dataset['stacked'] = ''; resetTextFonts(c.el); }
    }
    for (const c of cards) if (!c.fit) finishFit(c.el);
  }
}

/** Shared library/example row decision: only visual companions inherit a stacked layout. */
export function synchronizedRowStacks(cards: readonly { top: number; stacked: boolean }[]): boolean[] {
  const rows = new Set(cards.filter(card => card.stacked).map(card => Math.round(card.top)));
  return cards.map(card => rows.has(Math.round(card.top)));
}

/** Cards of one visual row share their top edge (rounded against sub-pixel layout). */
function rowKey(card: FitCard): number {
  return Math.round((card.el.closest('.word-card, .glyph-usage-example') ?? card.el).getBoundingClientRect().top);
}

/** At most this share of the view's own size is taken off pinyin + translation to keep the side layout. */
export const SIDE_TEXT_MAX_SHRINK = 0.25;

/** Largest whole-pixel step for the pinyin (18px Comfortable → 4, 11px Compact → 1), never below the floor. */
export function sideTextMaxStep(basePx: number): number {
  return Math.max(0, Math.min(Math.floor(basePx * SIDE_TEXT_MAX_SHRINK), Math.floor(basePx) - MEANING_FONT_FLOOR));
}

function pinyinElement(open: HTMLElement): HTMLElement | null {
  return open.querySelector<HTMLElement>('.pinyin-text');
}

/** Every reading's pinyin (glyph cards with several readings show one .pinyin-text per reading). */
function pinyinElements(open: HTMLElement): HTMLElement[] {
  return Array.from(open.querySelectorAll<HTMLElement>('.pinyin-text, .glyph-usage-facts .pinyin'));
}

function fontPx(el: HTMLElement | null): number {
  return el ? parseFloat(getComputedStyle(el).fontSize) || 0 : 0;
}

function applyPinyinFont(open: HTMLElement, step: number) {
  if (step <= 0) return;
  // Read every size first, then write, so all readings shrink by the same step from their own size.
  const sizes = pinyinElements(open).map(pinyin => [pinyin, fontPx(pinyin)] as const);
  for (const [pinyin, size] of sizes) pinyin.style.fontSize = `${size - step}px`;
}

/** Hand pinyin and translation back to the view's own sizes. */
function resetTextFonts(open: HTMLElement) {
  resetMeaningFont(open);
  for (const pinyin of pinyinElements(open)) pinyin.style.removeProperty('font-size');
}

/** True when the body (already in its side layout) shows the box, pinyin and translation uncut. */
function sideLayoutFits(open: HTMLElement): boolean {
  // Only judge when the side layout actually applies (CSS grid); otherwise leave it alone.
  if (getComputedStyle(open).display !== 'grid') return true;
  const tile = open.querySelector<HTMLElement>('.word-hanzi-tile');
  if (tile && tile.scrollWidth > tile.clientWidth + 1) return false;
  // Form boxes stay in one unwrapped, unshrinking row in the side layout, so a row too wide
  // for the card pushes the text column past the body's edge. (The row itself is not compared:
  // the 部/繁 stamps deliberately poke out past its last box.)
  if (open.scrollWidth > open.clientWidth + 1) return false;
  const text = open.querySelector<HTMLElement>('.pinyin-text');
  if (text) {
    if (lineCount(text) > 1) return false;
    // The speaker wrapped under the reading.
    const speaker = open.querySelector<HTMLElement>('.pinyin .tile-speaker');
    if (speaker && speaker.getBoundingClientRect().top >= text.getBoundingClientRect().bottom - 1) return false;
  }
  const meaning = meaningElement(open);
  // Single-tile glyph cards (one form box) may keep a three-line translation beside the box;
  // every other card stacks once the translation would need a third line there.
  const maxLines = open.closest('.catalog-card.few-forms') ? 3 : 2;
  if (meaning && (meaningClipped(open) || lineCount(meaning) > maxLines)) return false;
  return true;
}

/**
 * True when the translation shows an ellipsis: lines hidden by the line clamp (taller than its
 * box), or a single word wider than the column (e.g. "insignificant" beside three form boxes),
 * which the clamp cuts horizontally with an ellipsis instead of wrapping.
 */
function meaningClipped(open: HTMLElement): boolean {
  const meaning = meaningElement(open);
  if (!meaning) return false;
  return meaning.scrollHeight > meaning.clientHeight + 1 || meaning.scrollWidth > meaning.clientWidth + 1;
}

/** Try the smaller translation sizes until nothing is clipped; keep the view's size if none helps. */
function shrinkUntilUnclipped(open: HTMLElement) {
  for (const step of MEANING_FONT_STEPS) {
    resetMeaningFont(open);
    if (!applyMeaningFont(open, step)) continue;
    if (!meaningClipped(open)) return;
  }
  resetMeaningFont(open);
}

/** How many pixels smaller the translation may go, and no smaller than this. */
export const MEANING_FONT_STEPS = [1, 2] as const;
export const MEANING_FONT_FLOOR = 10;
/** A last line of at most this many words is worth shrinking the translation for. */
export const MAX_TRAILING_WORDS = 2;

/** The translation's size at one step below the view's own, or null once the floor is reached. */
export function meaningFontSize(basePx: number, step: number): number | null {
  const size = basePx - step;
  return size >= MEANING_FONT_FLOOR ? size : null;
}

/**
 * How many words sit on the translation's last line, from its measured width: the first of the
 * supplied widths (the last word, then the last two words) that the line fits inside wins, and a
 * line wider than all of them holds more words than measured.
 */
export function trailingWordCount(lastLineWidth: number, lastWordWidths: number[], tolerance = 1): number {
  for (let index = 0; index < lastWordWidths.length; index += 1) {
    if (lastLineWidth <= (lastWordWidths[index] ?? 0) + tolerance) return index + 1;
  }
  return lastWordWidths.length + 1;
}

function meaningElement(open: HTMLElement): HTMLElement | null {
  return open.querySelector<HTMLElement>('.word-meaning, .catalog-entry-meaning, .glyph-usage-meaning');
}

/** Put the translation one step below the view's size; false when that would cross the floor. */
function applyMeaningFont(open: HTMLElement, step: number): boolean {
  const meaning = meaningElement(open);
  if (!meaning) return false;
  if (step <= 0) return true;
  const size = meaningFontSize(parseFloat(getComputedStyle(meaning).fontSize) || 0, step);
  if (size === null) return false;
  meaning.style.fontSize = `${size}px`;
  return true;
}

/** Hand the translation back to the size the view's own CSS gives it. */
function resetMeaningFont(open: HTMLElement) {
  meaningElement(open)?.style.removeProperty('font-size');
}

/**
 * Shrink the translation until a last line of one or two words joins the line above, keeping the
 * first size that removes it. The trigger is measured once, at the view's size, so the search
 * only ever aims at the line the user is asking about.
 */
function shrinkTrailingLine(open: HTMLElement) {
  const meaning = meaningElement(open);
  if (!meaning) return;
  resetMeaningFont(open);
  const lines = lineCount(meaning);
  if (lines < 2) return;
  const trailing = trailingWordsOnLastLine(meaning);
  if (trailing === null || trailing > MAX_TRAILING_WORDS) return;
  for (const step of MEANING_FONT_STEPS) {
    resetMeaningFont(open);
    if (!applyMeaningFont(open, step)) continue;
    if (lineCount(meaning) < lines) return;
  }
  resetMeaningFont(open);
}

/** Words on the translation's last line, or null when either measurement is unavailable. */
function trailingWordsOnLastLine(el: HTMLElement): number | null {
  const words = (el.textContent ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  const lastWidth = lastLineWidth(el);
  if (lastWidth === null) return null;
  const widths: number[] = [];
  for (let count = 1; count <= MAX_TRAILING_WORDS && count <= words.length; count += 1) {
    const width = inlineWidth(el, words.slice(-count).join(' '));
    if (width === null) return null;
    widths.push(width);
  }
  return trailingWordCount(lastWidth, widths);
}

/** Width of the translation's lowest line box, or null when nothing is laid out. */
function lastLineWidth(el: HTMLElement): number | null {
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = Array.from(range.getClientRects()).filter(rect => rect.width > 0);
    if (!rects.length) return null;
    const step = (parseFloat(getComputedStyle(el).fontSize) || 12) * 0.6;
    const bottom = Math.max(...rects.map(rect => rect.top));
    const onLast = rects.filter(rect => rect.top >= bottom - step);
    return Math.max(...onLast.map(rect => rect.right)) - Math.min(...onLast.map(rect => rect.left));
  } catch {
    return null; // measurement unavailable (tests)
  }
}

/** Width the same text would need on one line, in the translation's own font. */
function inlineWidth(el: HTMLElement, text: string): number | null {
  try {
    const style = getComputedStyle(el);
    const probe = document.createElement('span');
    probe.style.fontFamily = style.fontFamily;
    probe.style.fontSize = style.fontSize;
    probe.style.fontWeight = style.fontWeight;
    probe.style.fontStyle = style.fontStyle;
    probe.style.fontVariant = style.fontVariant;
    probe.style.letterSpacing = style.letterSpacing;
    probe.style.textTransform = style.textTransform;
    probe.style.whiteSpace = 'pre';
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.left = '-9999px';
    probe.textContent = text;
    document.body.appendChild(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  } catch {
    return null;
  }
}

/** Rendered line count of an element's inline content (clusters line-box tops). */
export function lineCount(el: HTMLElement): number {
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    const tops = Array.from(range.getClientRects()).filter(rect => rect.width > 0).map(rect => rect.top).sort((a, b) => a - b);
    if (!tops.length) return 1;
    // Rects on one line differ by a few px (nested spans); a new line starts ≥ ~1 line height lower.
    const step = (parseFloat(getComputedStyle(el).fontSize) || 12) * 0.6;
    let lines = 0;
    let last = -Infinity;
    for (const top of tops) if (top - last > step) { lines += 1; last = top; }
    return lines;
  } catch {
    return 1; // measurement unavailable (tests): keep the side layout
  }
}

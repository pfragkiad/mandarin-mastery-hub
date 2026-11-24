import type { Face, FaceView } from './face-view';

/**
 * Lesson click-to-reveal (owner's choice, replacing hover-to-peek): which recorded pieces blur
 * for each hidden face. lesson-page.tsx uses these selectors both for the blur styling's
 * counterpart (styles.css .lesson-hide-*) and to find the blurred piece a click landed in.
 * Keep the selectors in step with those style rules.
 */
export const FACE_SELECTORS: Record<Face, string> = {
  hanzi: '.lesson-hanzi, .sentence-hanzi',
  pinyin: '.pinyin:not(.sentence-pinyin), .sentence-pinyin > span:first-child',
  translations: '.sentence-meaning, .lesson-term-meaning, .lesson-translation',
};

/** The attribute a revealed piece carries (styles.css clears its blur). */
export const REVEALED_ATTR = 'data-lesson-revealed';

/** The blurred piece around `target` for a face the view hides, or null. */
export function blurredPieceAt(target: Element, view: FaceView): Element | null {
  for (const face of ['hanzi', 'pinyin', 'translations'] as const) {
    if (view[face]) continue;
    const piece = target.closest(FACE_SELECTORS[face]);
    if (piece) return piece;
  }
  return null;
}

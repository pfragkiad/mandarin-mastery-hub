import type { CardReveal } from './learning-preferences';

/**
 * Which study faces are shown — hanzi, pinyin (with its speaker) and translation — as three
 * independent switches. One shape for lessons and the Glyphs/Vocabulary grids, so both use the
 * same Hanzi · Pinyin · EN button row (face-toggles.tsx).
 *
 * The grids' saved `cardReveal` value keeps its six existing names; these helpers translate
 * between them and the three switches. Every combination with at least one face shown has
 * exactly one CardReveal value; "all three hidden" has none, so the last shown face can never
 * be switched off (nextFaceView refuses it).
 */
export type FaceView = { hanzi: boolean; pinyin: boolean; translations: boolean };
export type Face = keyof FaceView;

const REVEAL_VIEWS: Record<CardReveal, FaceView> = {
  all: { hanzi: true, pinyin: true, translations: true },
  meaning: { hanzi: true, pinyin: true, translations: false },
  hanzi: { hanzi: false, pinyin: true, translations: true },
  pinyin: { hanzi: true, pinyin: false, translations: true },
  'pinyin-meaning': { hanzi: true, pinyin: false, translations: false },
  'hanzi-pinyin': { hanzi: false, pinyin: false, translations: true },
  'hanzi-meaning': { hanzi: false, pinyin: true, translations: false },
};

export const ALL_FACES: FaceView = { hanzi: true, pinyin: true, translations: true };

/** A saved lesson choice, or every face shown when absent, malformed or all hidden. */
export function restoredFaceView(stored: unknown): FaceView {
  if (!stored || typeof stored !== 'object') return { ...ALL_FACES };
  const v = stored as Record<string, unknown>;
  const view = { hanzi: v['hanzi'] !== false, pinyin: v['pinyin'] !== false, translations: v['translations'] !== false };
  return view.hanzi || view.pinyin || view.translations ? view : { ...ALL_FACES };
}

/** The three switches for a saved grid reveal mode (an unknown saved value shows all). */
export function revealToFaceView(reveal: CardReveal): FaceView {
  return { ...(REVEAL_VIEWS[reveal] ?? ALL_FACES) };
}

/** The grid reveal mode for three switches, or null when nothing would be shown. */
export function faceViewToReveal(view: FaceView): CardReveal | null {
  const match = (Object.keys(REVEAL_VIEWS) as CardReveal[]).find(key => {
    const v = REVEAL_VIEWS[key];
    return v.hanzi === view.hanzi && v.pinyin === view.pinyin && v.translations === view.translations;
  });
  return match ?? null;
}

/** Whether `face` is the only face still shown (its switch then cannot turn off). */
export function isLastShownFace(view: FaceView, face: Face): boolean {
  return view[face] && (['hanzi', 'pinyin', 'translations'] as const).every(f => f === face || !view[f]);
}

/** `view` with `face` flipped, or the same view when that would hide every face. */
export function nextFaceView(view: FaceView, face: Face): FaceView {
  if (isLastShownFace(view, face)) return view;
  return { ...view, [face]: !view[face] };
}

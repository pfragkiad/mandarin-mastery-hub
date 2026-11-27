export type CharacterScript = 'Simplified' | 'Traditional' | 'Common';
/** Grid hidden faces: 'all' shows everything, single names hide that face, joined names hide both ('hanzi-meaning' = pinyin only). */
export type CardReveal = 'all' | 'meaning' | 'hanzi' | 'pinyin' | 'pinyin-meaning' | 'hanzi-pinyin' | 'hanzi-meaning';
export type LibraryPerPage = 10 | 20 | 50;
export type LibraryView = 'grid' | 'list';
/** What the closed phone row of a Start random card shows next to the hanzi; absent (older saves) means the translation. */
export type DiscoveryRowLine = 'meaning' | 'pinyin';
export type Preferences = { pinyin: boolean; meaning: boolean; slow: boolean; font: string; includeTraditional: boolean; cardReveal: CardReveal; rememberCardReveals?: boolean; libraryView?: LibraryView; libraryPerPage?: LibraryPerPage; animationSpeed: number; confetti: boolean; traceLeniency?: number; recallLeniency?: number; practiceCanvasSize?: number; /** Practice progress tiles' preview box, dragged from the grip under the row; absent keeps each display size's own default. */ practiceProgressPicture?: number; /** Sound chart / Tone pairs links on glyph and word grid cards, including Start; absent (older saves) means shown. Details windows always keep them. */ soundChartLinks?: boolean; /** External Purple Culture search links on character/word cards (↗) and in details windows ("Search on the internet"); false or absent means hidden — the default is off, only an explicit stored `true` shows them. */ cardExamplesLinks?: boolean; /** Lesson glyph quick cards (hover ring + click quick card) from the lesson page's side switch; absent means on. */ lessonHints?: boolean; /** Lesson Hanzi · Pinyin · EN buttons (on = shown), remembered apart from the grids' cardReveal; absent shows all. */ lessonFaces?: { hanzi: boolean; pinyin: boolean; translations: boolean }; /** Glyph quick cards on Glyphs/Vocabulary grid cards (hover ring + click quick card), the grids' own switch; absent means off. */ gridHints?: boolean; discoveryRowLine?: DiscoveryRowLine };
/** Practice writing square: default and drag limits in CSS px (phones keep their own 250px cap). */
export const PRACTICE_CANVAS_DEFAULT = 380;
export const PRACTICE_CANVAS_MIN = 240;
export function practiceCanvasSize(stored: unknown): number {
  return typeof stored === 'number' && Number.isFinite(stored) ? Math.max(PRACTICE_CANVAS_MIN, Math.round(stored)) : PRACTICE_CANVAS_DEFAULT;
}
/** Practice progress tiles: the small preview box dragged from the grip under the row.
 * Limits in CSS px. Unset stays unset (null) so Compact, Comfortable and phones each keep
 * their own smaller default instead of inheriting one size. */
export const PRACTICE_PROGRESS_PICTURE_MIN = 44;
export const PRACTICE_PROGRESS_PICTURE_MAX = 120;
export function practiceProgressPicture(stored: unknown): number | null {
  return typeof stored === 'number' && Number.isFinite(stored)
    ? Math.min(PRACTICE_PROGRESS_PICTURE_MAX, Math.max(PRACTICE_PROGRESS_PICTURE_MIN, Math.round(stored)))
    : null;
}
export const defaultPreferences: Preferences = { pinyin: true, meaning: true, slow: false, font: 'Handwritten', includeTraditional: true, cardReveal: 'all', libraryView: 'grid', animationSpeed: 0.5, confetti: true, soundChartLinks: true, cardExamplesLinks: false, discoveryRowLine: 'meaning' };
export const defaultTheme = 'dark' as const;
/** A saved layout wins over device defaults, including older preferences that
 * lack this field. Called after hydration so SSR never reads viewport state. */
export function restoredLibraryView(stored: unknown, smallScreen: boolean): LibraryView {
  return stored === 'grid' || stored === 'list' ? stored : smallScreen ? 'list' : 'grid';
}
export function restoredTheme(stored: string | null): 'light' | 'dark' {
  return stored === 'light' || stored === 'dark' ? stored : defaultTheme;
}
export function includeScript(script: CharacterScript | undefined, includeTraditional = false) {
  return includeTraditional || script !== 'Traditional';
}
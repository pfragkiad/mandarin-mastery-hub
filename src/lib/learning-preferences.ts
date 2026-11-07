export type CharacterScript = 'Simplified' | 'Traditional' | 'Common';
export type CardReveal = 'all' | 'meaning' | 'hanzi' | 'pinyin';
export type LibraryPerPage = 10 | 20 | 50;
export type LibraryView = 'grid' | 'list';
export type Preferences = { pinyin: boolean; meaning: boolean; slow: boolean; font: string; includeTraditional: boolean; cardReveal: CardReveal; libraryView?: LibraryView; libraryPerPage?: LibraryPerPage; animationSpeed: number; confetti: boolean };
export const defaultPreferences: Preferences = { pinyin: true, meaning: true, slow: false, font: 'Handwritten', includeTraditional: false, cardReveal: 'all', libraryView: 'grid', animationSpeed: 0.5, confetti: true };
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
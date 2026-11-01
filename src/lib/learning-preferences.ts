export type CharacterScript = 'Simplified' | 'Traditional' | 'Common';
export type CardReveal = 'all' | 'meaning' | 'hanzi' | 'pinyin';
export type LibraryPerPage = 10 | 20 | 50;
export type Preferences = { pinyin: boolean; meaning: boolean; slow: boolean; font: string; includeTraditional: boolean; cardReveal: CardReveal; libraryPerPage?: LibraryPerPage };
export const defaultPreferences: Preferences = { pinyin: true, meaning: true, slow: false, font: 'Handwritten', includeTraditional: false, cardReveal: 'all' };
export const defaultTheme = 'dark' as const;
export function restoredTheme(stored: string | null): 'light' | 'dark' {
  return stored === 'light' || stored === 'dark' ? stored : defaultTheme;
}
export function includeScript(script: CharacterScript | undefined, includeTraditional = false) {
  return includeTraditional || script !== 'Traditional';
}
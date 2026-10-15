export type CharacterScript = 'Simplified' | 'Traditional' | 'Common';
export type Preferences = { pinyin: boolean; meaning: boolean; slow: boolean; font: string; includeTraditional: boolean };
export const defaultPreferences: Preferences = { pinyin: true, meaning: true, slow: false, font: 'Sans', includeTraditional: false };
export function includeScript(script: CharacterScript | undefined, includeTraditional = false) {
  return includeTraditional || script !== 'Traditional';
}
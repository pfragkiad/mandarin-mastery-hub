export type PracticeMode = 'watch' | 'trace' | 'recall';

export function practiceMode(value: unknown): PracticeMode {
  return value === 'trace' || value === 'recall' ? value : 'watch';
}

export function practiceModeOptions(mode: PracticeMode) {
  return { showOutline: mode !== 'recall', showHintAfterMisses: mode === 'recall' ? false as const : 2, highlightOnComplete: mode !== 'recall' };
}
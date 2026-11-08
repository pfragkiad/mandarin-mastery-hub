// 'watch' stays in the type only so old branches compile; Watch was merged into
// Trace (Play + Reset under the drawing square), so old ?mode=watch links open Trace.
export type PracticeMode = 'watch' | 'trace' | 'recall';

export function practiceMode(value: unknown): PracticeMode {
  return value === 'recall' ? 'recall' : 'trace';
}

export function practiceModeOptions(mode: PracticeMode) {
  return { showOutline: mode !== 'recall', showHintAfterMisses: mode === 'recall' ? false as const : 2, highlightOnComplete: mode !== 'recall' };
}
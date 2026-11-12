// Accuracy for handwriting practice: each stroke starts at 100% and loses 25% per mistake (floor 0%).
export const MISTAKE_PENALTY = 25;
export function strokeScore(mistakes: number): number {
  return Math.max(0, 100 - MISTAKE_PENALTY * Math.max(0, mistakes));
}
// Whole-character score is the rounded average of the scored strokes.
export function characterScore(scores: (number | null)[]): number | null {
  const done = scores.filter((s): s is number => s !== null);
  if (!done.length) return null;
  return Math.round(done.reduce((a, b) => a + b, 0) / done.length);
}
// A finished character's result: its total accuracy and the mistakes made on the hand-drawn
// strokes when at least one was drawn, otherwise "shown" (every stroke was played or clicked).
// `mistakes` runs beside `scores`, one entry per stroke (null for strokes that were not drawn).
export type CharacterResult = { kind: 'score'; percent: number; mistakes: number } | { kind: 'shown' };
export function finishedResult(scores: (number | null)[], mistakes: (number | null)[] = []): CharacterResult {
  const percent = characterScore(scores);
  if (percent === null) return { kind: 'shown' };
  const count = scores.reduce<number>((sum, score, i) => score === null ? sum : sum + (mistakes[i] ?? 0), 0);
  return { kind: 'score', percent, mistakes: count };
}
// The bracketed mistake count after "NN% accuracy": " (1 mistake)", " (3 mistakes)", or nothing
// for a mistake-free round.
export function mistakeNote(mistakes: number): string {
  return mistakes > 0 ? ` (${mistakes} ${mistakes === 1 ? 'mistake' : 'mistakes'})` : '';
}
// The one word before "Draw again to start over." once a character is finished.
export function completionWord(percent: number | null): string {
  return percent === 100 ? 'Perfect!' : 'Complete.';
}
// Distinct stroke colours chosen for strong contrast against each theme's background.
const DARK = ['#7dd3fc', '#fca5a5', '#fde047', '#86efac', '#f0abfc', '#fdba74', '#a5b4fc', '#5eead4'];
const LIGHT = ['#0b5394', '#b42318', '#7a4d00', '#1b6b2f', '#86198f', '#9a3412', '#3730a3', '#115e59'];
export function strokeColor(index: number, theme: 'light' | 'dark'): string {
  const palette = theme === 'dark' ? DARK : LIGHT;
  return palette[index % palette.length] ?? palette[0]!;
}

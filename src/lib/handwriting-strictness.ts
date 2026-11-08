// Handwriting strictness = Hanzi Writer's quiz `leniency` (1.0 is the library
// default; lower values demand strokes closer to the recorded medians).
// Trace and Recall are set independently in Settings; any unknown saved value
// falls back to the default so old preferences keep today's behaviour.
export const STRICTNESS_LEVELS = [
  { value: 1, label: 'Relaxed (default)' },
  { value: 0.9, label: 'Strict' },
  { value: 0.8, label: 'Stricter' },
  { value: 0.7, label: 'Calligrapher' },
] as const;
export const DEFAULT_LENIENCY = 1;

export function leniency(saved: unknown): number {
  return STRICTNESS_LEVELS.some(level => level.value === saved) ? (saved as number) : DEFAULT_LENIENCY;
}

/** Step-by-step stroke playback: which stroke the next Step press draws.
 * After the last stroke the sequence wraps back to the first, so Step
 * always draws exactly one stroke and never runs past the end. */
export function nextStepIndex(current: number, total: number): number {
  if (total <= 0) return 0;
  return current >= total ? 0 : current;
}

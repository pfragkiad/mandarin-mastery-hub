// Fixed-length rounds for the three Pinyin listening games (Tone quiz, Sound-alikes,
// Type what you hear). A round deals a fixed number of distinct random sounds from the
// current pool; a review round replays every missed sound once, whatever the round size.
// Nothing is remembered after the round ends.
import type { PinyinSound } from './pinyin-guide';

export const ROUND_SIZES = [10, 20, 50] as const;
export type RoundSize = (typeof ROUND_SIZES)[number];

export function shuffle<T>(list: readonly T[], random = Math.random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j]!, out[i]!]; }
  return out;
}

/** A new round: `size` distinct random sounds, or the whole pool when it is smaller. */
export function dealRound<T extends PinyinSound>(pool: readonly T[], size: RoundSize, random = Math.random): T[] {
  return shuffle(pool, random).slice(0, size);
}

/** A review round: every missed sound exactly once, in a fresh random order. */
export function reviewRound<T extends PinyinSound>(missed: readonly T[], random = Math.random): T[] {
  return shuffle([...new Map(missed.map(s => [s.id, s])).values()], random);
}

/**
 * "New round + missed": every kept missed sound once, topped up with distinct random
 * sounds from the pool (never repeating a missed one) up to the round size, then shuffled.
 * When more sounds are kept than the round holds, all of them are dealt, like a review round.
 */
export function mixedRound<T extends PinyinSound>(pool: readonly T[], size: RoundSize, missed: readonly T[], random = Math.random): T[] {
  const kept = [...new Map(missed.map(s => [s.id, s])).values()];
  const ids = new Set(kept.map(s => s.id));
  const fill = shuffle(pool.filter(s => !ids.has(s.id)), random).slice(0, Math.max(0, size - kept.length));
  return shuffle([...kept, ...fill], random);
}

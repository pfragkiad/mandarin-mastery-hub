/** Custom game ranges have an explicit namespace so source-defined class IDs stay intact.
 * Bounds are inclusive; unranked is opt-in and never treated as a numeric rank. */
export type RankRange = { min: number; max: number; unranked: boolean };

export function parseRankRange(value: unknown): RankRange | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^range:(\d+)-(\d+)(\+unranked)?$/.exec(value);
  if (!match) return undefined;
  const min = Number(match[1]);
  const max = Number(match[2]);
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min < 1 || max < min) return undefined;
  return { min, max, unranked: Boolean(match[3]) };
}

export function formatRankRange(min: number, max: number, unranked = false): string {
  return `range:${min}-${max}${unranked ? '+unranked' : ''}`;
}

export function rankRangeMatches(rank: number | null | undefined, range: RankRange): boolean {
  return rank == null ? range.unranked : rank >= range.min && rank <= range.max;
}

export function rankRangeLabel(range: RankRange): string {
  return `${range.min.toLocaleString('en-US')}–${range.max.toLocaleString('en-US')}${range.unranked ? ' + Unranked' : ''}`;
}

/** Display-scale mapping only: each recorded class endpoint gets equal slider space.
 * Interpolation changes the thumb position, never a record's rank or percentage. */
export function rankSliderPosition(rank: number, stops: readonly number[]): number {
  if (stops.length < 2) return 0;
  for (let i = 1; i < stops.length; i++) {
    const start = stops[i - 1];
    const end = stops[i];
    if (start === undefined || end === undefined) continue;
    if (rank <= end) return (i - 1 + Math.max(0, (rank - start) / (end - start))) * 1000;
  }
  return (stops.length - 1) * 1000;
}

export function sliderPositionRank(position: number, stops: readonly number[]): number {
  const index = Math.max(0, Math.min(stops.length - 2, Math.floor(position / 1000)));
  const start = stops[index];
  const end = stops[index + 1];
  if (start === undefined || end === undefined) return stops[0] ?? 1;
  const fraction = Math.max(0, Math.min(1, position / 1000 - index));
  return Math.round(start + (end - start) * fraction);
}
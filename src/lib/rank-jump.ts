/** Resolve only recorded ranks in result order; ties prefer the lower rank.
 * Null records never become candidates or borrow a neighbouring rank. */
export function nearestRecordedRank(ranks: readonly (number | null)[], target: number) {
  let nearest: { rank: number; index: number } | undefined;
  ranks.forEach((rank, index) => {
    if (rank === null) return;
    if (!nearest || Math.abs(rank - target) < Math.abs(nearest.rank - target)
      || (Math.abs(rank - target) === Math.abs(nearest.rank - target) && rank < nearest.rank)) {
      nearest = { rank, index };
    }
  });
  return nearest;
}
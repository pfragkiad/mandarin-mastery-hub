// Coloured frequency-rank label shared by glyph cards, glyph details and the Sound
// chart's "In a character" rows. Inputs: the exact supplied rank (null = unranked),
// the library kind (for the group name) and `compact` ("Rank #12" instead of
// "#12 · group"). Colour tiers come from the exact rank only, never estimated.
import { usageGroupFor } from '@/lib/usage-frequency';
import type { LibraryKind } from '@/lib/character-library';

/** Exact rank colour tier shared by glyph and idiom frequency labels: ≤300 top, 301–500 inter, 501–1000 mid, >1000 low. */
export function usageRankTier(rank: number | null): 'none' | 'top' | 'inter' | 'mid' | 'low' {
  return rank === null ? 'none' : rank <= 300 ? 'top' : rank <= 500 ? 'inter' : rank <= 1000 ? 'mid' : 'low';
}

export function UsageLabel({ rank, kind, compact = false, prefix, groupLabel, title }: { rank: number | null; kind?: LibraryKind; compact?: boolean; prefix?: string; groupLabel?: string | undefined; title?: string }) {
  const group = groupLabel ?? (kind ? usageGroupFor(kind, rank)?.label : undefined);
  const tier = usageRankTier(rank);
  const formatted = rank === null ? 'Unranked' : prefix !== undefined ? `${prefix}${rank.toLocaleString('en-US')}` : compact ? `Rank #${rank.toLocaleString('en-US')}` : group ? `#${rank.toLocaleString('en-US')} · ${group}` : `#${rank.toLocaleString('en-US')}`;
  return <span className={`component-reuse-label usage-${tier}`} title={title}>{formatted}</span>;
}

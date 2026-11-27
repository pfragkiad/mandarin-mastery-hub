// Coloured frequency-rank label shared by glyph cards, glyph details and the Sound
// chart's "In a character" rows. Inputs: the exact supplied rank (null = unranked),
// the library kind (for the group name) and `compact` ("Rank #12" instead of
// "#12 · group"). Colour tiers come from the exact rank only, never estimated.
import { usageGroupFor } from '@/lib/usage-frequency';
import type { LibraryKind } from '@/lib/character-library';

/** Exact rank colour tier: glyphs use ≤300 / ≤500 / ≤1000; idioms have a flatter head
 * distribution (62.8% at rank 1,000, 80.9% at 2,000, 92.6% at 3,500) so their colour bands
 * use ≤1000 / ≤2000 / ≤3500. */
export function usageRankTier(rank: number | null, scale: 'default' | 'idiom' = 'default'): 'none' | 'top' | 'inter' | 'mid' | 'low' {
  if (rank === null) return 'none';
  if (scale === 'idiom') return rank <= 1000 ? 'top' : rank <= 2000 ? 'inter' : rank <= 3500 ? 'mid' : 'low';
  return rank <= 300 ? 'top' : rank <= 500 ? 'inter' : rank <= 1000 ? 'mid' : 'low';
}

export function UsageLabel({ rank, kind, scale = 'default', compact = false, prefix, groupLabel, title }: { rank: number | null; kind?: LibraryKind; scale?: 'default' | 'idiom'; compact?: boolean; prefix?: string; groupLabel?: string | undefined; title?: string }) {
  const group = groupLabel ?? (kind ? usageGroupFor(kind, rank)?.label : undefined);
  const tier = usageRankTier(rank, scale);
  const formatted = rank === null ? 'Unranked' : prefix !== undefined ? `${prefix}${rank.toLocaleString('en-US')}` : compact ? `Rank #${rank.toLocaleString('en-US')}` : group ? `#${rank.toLocaleString('en-US')} · ${group}` : `#${rank.toLocaleString('en-US')}`;
  return <span className={`component-reuse-label usage-${tier}`} title={title}>{formatted}</span>;
}

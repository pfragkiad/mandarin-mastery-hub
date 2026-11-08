// Coloured frequency-rank label shared by glyph cards, glyph details and the Sound
// chart's "In a character" rows. Inputs: the exact supplied rank (null = unranked),
// the library kind (for the group name) and `compact` ("Rank #12" instead of
// "#12 · group"). Colour tiers come from the exact rank only, never estimated.
import { usageGroupFor } from '@/lib/usage-frequency';
import type { LibraryKind } from '@/lib/character-library';

export function UsageLabel({ rank, kind, compact = false }: { rank: number | null; kind: LibraryKind; compact?: boolean }) {
  const group = usageGroupFor(kind, rank);
  // Colour tiers by exact rank: ≤300 top, 301–500 intermediate, 501–1000 mid, >1000 low.
  const tier = rank === null ? 'none' : rank <= 300 ? 'top' : rank <= 500 ? 'inter' : rank <= 1000 ? 'mid' : 'low';
  return <span className={`component-reuse-label usage-${tier}`}>{rank === null ? 'Unranked' : compact ? `Rank #${rank.toLocaleString('en-US')}` : `#${rank.toLocaleString('en-US')} · ${group?.label ?? ''}`}</span>;
}

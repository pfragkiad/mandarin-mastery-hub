// Corpus frequency ranks (Jun Da Modern Chinese list; component/radical ranks are the supplied
// derived exposure estimates). Loaded lazily from /data/usage-order.json alongside the catalogue.
// The rank scope follows the Traditional preference: "all" includes traditional-only forms.
import type { LibraryEntry, LibraryKind } from './character-library';

export type UsageScope = 'all' | 'simplified';
type ScopeRanks = { characters: Record<string, number>; components: Record<string, number>; radicals: Record<string, number>; individual?: { characters: Record<string, number>; components: Record<string, number>; radicals?: Record<string, number> }; cumulative?: { characters: Record<string, number>; components: Record<string, number> }; groupCumulative?: { characters: Record<string, number>; components: Record<string, number>; radicals?: Record<string, number> } };
export type UsageOrderFile = { schemaVersion: number; source: { provider: string; version: string; sourceUrl: string; license: string }; method: string; scopes: Record<UsageScope, ScopeRanks> };

const empty: ScopeRanks = { characters: {}, components: {}, radicals: {} };
export const usageOrder: { loaded: boolean; data: UsageOrderFile | null } = { loaded: false, data: null };
export function hydrateUsageOrder(data: UsageOrderFile) { usageOrder.data = data; usageOrder.loaded = true; }

export type UsageGroup = { value: string; label: string; min: number; max: number };
const bin = (min: number, max: number): UsageGroup => ({ value: `${min}-${Number.isFinite(max) ? max : 'plus'}`, label: Number.isFinite(max) ? `Rank ${min.toLocaleString('en-US')}–${max.toLocaleString('en-US')}` : `Rank ${min.toLocaleString('en-US')}+`, min, max });
export const UNRANKED = 'unranked';
const unranked: UsageGroup = { value: UNRANKED, label: 'No frequency data', min: 0, max: 0 };
export const usageGroupsByKind: Record<'Characters' | 'Radicals' | 'Components', UsageGroup[]> = {
  Characters: [bin(1, 100), bin(101, 300), bin(301, 500), bin(501, 1000), bin(1001, 2000), bin(2001, 3500), bin(3501, 5000), bin(5001, 9933), unranked],
  Radicals: [bin(1, 10), bin(11, 25), bin(26, 50), bin(51, 100), bin(101, 150), bin(151, 200), bin(201, Infinity), unranked],
  Components: [bin(1, 25), bin(26, 50), bin(51, 100), bin(101, 200), bin(201, 300), bin(301, 500), bin(501, 1000), bin(1001, Infinity), unranked],
};
export const hasUsageGroups = (kind: string): kind is keyof typeof usageGroupsByKind => kind in usageGroupsByKind;
export function usageGroups(kind: string): UsageGroup[] { return hasUsageGroups(kind) ? usageGroupsByKind[kind] : []; }
export function parseUsageGroup(kind: string, value: unknown): string | undefined { return usageGroups(kind).find(group => group.value === value)?.value; }

export const scopeFor = (includeTraditional: boolean): UsageScope => includeTraditional ? 'all' : 'simplified';
const smallPercentage = new Intl.NumberFormat('en-US', { minimumSignificantDigits: 2, maximumSignificantDigits: 2, useGrouping: false });
export function formatUsagePercentage(percent: number): string {
  return `${percent > 0 && percent < 1 ? smallPercentage.format(percent) : percent.toFixed(1)}%`;
}
export function usagePercentage(glyph: string, kind: LibraryKind, includeTraditional: boolean, kangxiIndex?: number): number | null {
  if (kind === 'Radicals') return kangxiIndex ? usageOrder.data?.scopes[scopeFor(includeTraditional)].individual?.radicals?.[String(kangxiIndex)] ?? null : null;
  if (kind !== 'Characters' && kind !== 'Components') return null;
  return usageOrder.data?.scopes[scopeFor(includeTraditional)].individual?.[kind === 'Characters' ? 'characters' : 'components'][glyph] ?? null;
}
export function usageCumulative(glyph: string, kind: LibraryKind, includeTraditional: boolean): number | null {
  if (kind !== 'Characters' && kind !== 'Components') return null;
  return usageOrder.data?.scopes[scopeFor(includeTraditional)].cumulative?.[kind === 'Characters' ? 'characters' : 'components'][glyph] ?? null;
}
export function usageGroupLabel(group: UsageGroup, kind: string, includeTraditional: boolean): string {
  if (kind === 'Radicals') {
    const percent = usageOrder.data?.scopes[scopeFor(includeTraditional)].groupCumulative?.radicals?.[group.value];
    return percent === undefined ? group.label : `${group.label} · ${formatUsagePercentage(percent)}`;
  }
  if (kind !== 'Characters' && kind !== 'Components') return group.label;
  const percent = usageOrder.data?.scopes[scopeFor(includeTraditional)].groupCumulative?.[kind === 'Characters' ? 'characters' : 'components'][group.value];
  return percent === undefined ? group.label : `${group.label} · ${formatUsagePercentage(percent)}`;
}
export function usageRank(entry: Pick<LibraryEntry, 'hanzi' | 'kangxiIndex' | 'id'>, kind: LibraryKind, includeTraditional: boolean): number | null {
  const ranks = usageOrder.data?.scopes[scopeFor(includeTraditional)] ?? empty;
  if (kind === 'Characters') return ranks.characters[entry.hanzi] ?? null;
  if (kind === 'Components') return ranks.components[entry.hanzi] ?? null;
  if (kind === 'Radicals') return entry.kangxiIndex ? ranks.radicals[String(entry.kangxiIndex)] ?? null : null;
  return null;
}
export function usageGroupFor(kind: LibraryKind, rank: number | null): UsageGroup | undefined {
  const groups = usageGroups(kind);
  return rank === null ? groups.find(group => group.value === UNRANKED) : groups.find(group => rank >= group.min && rank <= group.max);
}
/** Most frequent first; unranked last; otherwise the existing catalogue order is kept (stable sort). */
export function sortByUsage<T extends Pick<LibraryEntry, 'hanzi' | 'kangxiIndex' | 'id'>>(entries: T[], kind: LibraryKind, includeTraditional: boolean): T[] {
  if (!hasUsageGroups(kind) || !usageOrder.data) return entries;
  const rank = (entry: T) => usageRank(entry, kind, includeTraditional) ?? Infinity;
  return [...entries].sort((a, b) => rank(a) - rank(b));
}
export function kindFromId(id: string): LibraryKind | undefined { const k = id.split(':')[0]; return k === 'Characters' || k === 'Radicals' || k === 'Components' || k === 'Strokes' ? k : undefined; }

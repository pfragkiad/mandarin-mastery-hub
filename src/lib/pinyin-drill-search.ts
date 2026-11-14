// Shared URL search for the three Pinyin quiz pages (Tone quiz, Sound-alikes,
// Type what you hear): the applied drill filters — initial and final — so each
// game's history and shared links restore exactly.
import type { DrillFilters } from '@/components/tutor/pinyin-drills';

export type PinyinDrillSearch = { initial?: string | undefined; final?: string | undefined };

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v : undefined);

export function drillSearchValidator(search: Record<string, unknown>): PinyinDrillSearch {
  const out: PinyinDrillSearch = {};
  for (const key of ['initial', 'final'] as const) { const v = text(search[key]); if (v) out[key] = v; }
  return out;
}

export function drillFiltersFrom(search: PinyinDrillSearch): DrillFilters {
  return { initial: search.initial ?? '', final: search.final ?? '' };
}

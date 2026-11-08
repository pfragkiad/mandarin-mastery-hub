import { createFileRoute } from '@tanstack/react-router';
import { PinyinGuidePage, type PinyinMode } from '@/components/tutor/pinyin-guide';
import { pageHead } from '@/lib/mandarin';

// URL search keeps the mode, the selected chart syllable and applied filters so
// history and shared links restore exactly. Chart and quizzes keep separate filters.
export type PinyinSearch = { mode?: Exclude<PinyinMode, 'chart'>; s?: string; q?: string; initial?: string; final?: string; focus?: 'review' | 'new' };
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v : undefined);
export const Route = createFileRoute('/pinyin')({
  validateSearch: (search: Record<string, unknown>): PinyinSearch => {
    const out: PinyinSearch = {};
    if (search.mode === 'tones' || search.mode === 'alikes' || search.mode === 'type') out.mode = search.mode;
    if (search.focus === 'review' || search.focus === 'new') out.focus = search.focus;
    for (const key of ['s', 'q', 'initial', 'final'] as const) { const v = text(search[key]); if (v) out[key] = v; }
    return out;
  },
  head: () => pageHead('Pinyin pronunciation', 'Hear every Mandarin syllable in all four tones, then practise with tone, sound-alike and typing quizzes.'),
  component: PinyinRoute,
});

function PinyinRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <PinyinGuidePage
    mode={search.mode ?? 'chart'}
    selected={search.s}
    chartFilters={{ q: search.q ?? '', initial: search.initial ?? '', final: search.final ?? '' }}
    drillFilters={{ initial: search.initial ?? '', final: search.final ?? '', focus: search.focus ?? '' }}
    onMode={mode => navigate({ search: mode === 'chart' ? {} : { mode } })}
    onSelect={s => navigate({ search: prev => ({ ...prev, s }), resetScroll: false, replace: !s })}
    onChartFilters={f => navigate({ search: prev => ({ ...prev, q: f.q || undefined, initial: f.initial || undefined, final: f.final || undefined }), resetScroll: false })}
    onDrillFilters={f => navigate({ search: prev => ({ ...prev, initial: f.initial || undefined, final: f.final || undefined, focus: f.focus || undefined }), resetScroll: false })}
  />;
}

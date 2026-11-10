import { createFileRoute } from '@tanstack/react-router';
import { PinyinGuidePage, type PinyinMode } from '@/components/tutor/pinyin-guide';
import { pageHead } from '@/lib/mandarin';
import type { Tone } from '@/lib/pinyin-guide';

// URL search keeps the mode, the selected chart syllable (s) and its chosen tone (t), and applied filters so
// history and shared links restore exactly. Chart and quizzes keep separate filters.
export type PinyinSearch = { mode?: Exclude<PinyinMode, 'chart'> | undefined; s?: string | undefined; t?: Tone | undefined; q?: string | undefined; initial?: string | undefined; final?: string | undefined; focus?: 'review' | 'new' | undefined };
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v : undefined);
export const Route = createFileRoute('/pinyin')({
  validateSearch: (search: Record<string, unknown>): PinyinSearch => {
    const out: PinyinSearch = {};
    if (search['mode'] === 'tones' || search['mode'] === 'alikes' || search['mode'] === 'type') out.mode = search['mode'];
    if (search['focus'] === 'review' || search['focus'] === 'new') out.focus = search['focus'];
    for (const key of ['s', 'q', 'initial', 'final'] as const) { const v = text(search[key]); if (v) out[key] = v; }
    // The router may parse ?t=3 as a number; accept either form, tones 1–5 only, and only with a syllable.
    const tone = Number(search['t']);
    if (out.s && Number.isInteger(tone) && tone >= 1 && tone <= 5) out.t = tone as Tone;
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
    tone={search.t ?? null}
    chartFilters={{ q: search.q ?? '', initial: search.initial ?? '', final: search.final ?? '' }}
    drillFilters={{ initial: search.initial ?? '', final: search.final ?? '', focus: search.focus ?? '' }}
    onMode={mode => navigate({ search: mode === 'chart' ? {} : { mode } })}
    // Opening a syllable pushes history (so Back returns to the previous one); choosing a
    // tone only replaces the current entry, so tone clicks never pile up history steps.
    onSelect={(s, t) => navigate({ search: prev => ({ ...prev, s, t: s ? t : undefined }), resetScroll: false, replace: !s })}
    onTone={t => navigate({ search: prev => ({ ...prev, t }), resetScroll: false, replace: true })}
    // Chart filters apply only on Apply/Enter, X or a chip, so each submission pushes one
    // history step (Back restores the previous filters), as in the libraries.
    // A toned search naming one exact sound (ma1) also selects it in the same step.
    onChartFilters={(f, pick) => navigate({ search: prev => ({ ...prev, q: f.q || undefined, initial: f.initial || undefined, final: f.final || undefined, ...(pick ? { s: pick.base, t: pick.tone } : {}) }), resetScroll: false })}
    onDrillFilters={f => navigate({ search: prev => ({ ...prev, initial: f.initial || undefined, final: f.final || undefined, focus: f.focus || undefined }), resetScroll: false })}
  />;
}

import { createFileRoute } from '@tanstack/react-router';
import { PinyinChartPage } from '@/components/tutor/pinyin-guide';
import { pageHead } from '@/lib/mandarin';
import type { Tone } from '@/lib/pinyin-guide';

// The Sound chart's own page. URL search keeps the selected syllable (s), its
// chosen tone (t) and the applied chart filters, so history and shared links
// restore exactly. The three quiz games live on their own routes under /pinyin.
export type PinyinSearch = { s?: string | undefined; t?: Tone | undefined; q?: string | undefined; initial?: string | undefined; final?: string | undefined };
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v : undefined);
export const Route = createFileRoute('/pinyin')({
  validateSearch: (search: Record<string, unknown>): PinyinSearch => {
    const out: PinyinSearch = {};
    for (const key of ['s', 'q', 'initial', 'final'] as const) { const v = text(search[key]); if (v) out[key] = v; }
    // The router may parse ?t=3 as a number; accept either form, tones 1–5 only, and only with a syllable.
    const tone = Number(search['t']);
    if (out.s && Number.isInteger(tone) && tone >= 1 && tone <= 5) out.t = tone as Tone;
    return out;
  },
  head: () => pageHead('Pinyin sound chart', 'Hear every Mandarin syllable in all four tones, with recordings and example characters.'),
  component: PinyinRoute,
});

function PinyinRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <PinyinChartPage
    selected={search.s}
    tone={search.t ?? null}
    filters={{ q: search.q ?? '', initial: search.initial ?? '', final: search.final ?? '' }}
    // Opening a syllable pushes history (so Back returns to the previous one); choosing a
    // tone only replaces the current entry, so tone clicks never pile up history steps.
    onSelect={(s, t) => navigate({ search: prev => ({ ...prev, s, t: s ? t : undefined }), resetScroll: false, replace: !s })}
    onTone={t => navigate({ search: prev => ({ ...prev, t }), resetScroll: false, replace: true })}
    // Chart filters apply only on Apply/Enter, X or a chip, so each submission pushes one
    // history step (Back restores the previous filters), as in the libraries.
    // A toned search naming one exact sound (ma1) also selects it in the same step.
    onFilters={(f, pick) => navigate({ search: prev => ({ ...prev, q: f.q || undefined, initial: f.initial || undefined, final: f.final || undefined, ...(pick ? { s: pick.base, t: pick.tone } : {}) }), resetScroll: false })}
  />;
}

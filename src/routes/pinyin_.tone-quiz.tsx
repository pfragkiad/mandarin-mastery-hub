import { createFileRoute } from '@tanstack/react-router';
import { PinyinDrillPage } from '@/components/tutor/pinyin-guide';
import { pageHead } from '@/lib/mandarin';
import { drillSearchValidator, drillFiltersFrom, type PinyinDrillSearch } from '@/lib/pinyin-drill-search';

// Tone quiz: its own page, separate from the Sound chart. URL search keeps the
// applied drill filters (initial/final) so history restores them.
export const Route = createFileRoute('/pinyin_/tone-quiz')({
  validateSearch: drillSearchValidator,
  head: () => pageHead('Tone quiz', 'Hear a Mandarin syllable and pick its tone.'),
  component: ToneQuizRoute,
});

function ToneQuizRoute() {
  const search: PinyinDrillSearch = Route.useSearch();
  const navigate = Route.useNavigate();
  return <PinyinDrillPage mode="tones" filters={drillFiltersFrom(search)}
    onFilters={f => navigate({ search: { initial: f.initial || undefined, final: f.final || undefined }, resetScroll: false })} />;
}

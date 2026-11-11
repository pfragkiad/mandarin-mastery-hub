import { createFileRoute } from '@tanstack/react-router';
import { PinyinDrillPage } from '@/components/tutor/pinyin-guide';
import { pageHead } from '@/lib/mandarin';
import { drillSearchValidator, drillFiltersFrom, type PinyinDrillSearch } from '@/lib/pinyin-drill-search';

// Type what you hear: its own page, separate from the Sound chart. URL search
// keeps the applied drill filters (initial/final/focus) so history restores them.
export const Route = createFileRoute('/pinyin/type-what-you-hear')({
  validateSearch: drillSearchValidator,
  head: () => pageHead('Type what you hear', 'Listen to a Mandarin syllable and type its pinyin.'),
  component: TypeWhatYouHearRoute,
});

function TypeWhatYouHearRoute() {
  const search: PinyinDrillSearch = Route.useSearch();
  const navigate = Route.useNavigate();
  return <PinyinDrillPage mode="type" filters={drillFiltersFrom(search)}
    onFilters={f => navigate({ search: { initial: f.initial || undefined, final: f.final || undefined, focus: f.focus || undefined }, resetScroll: false })} />;
}

import { createFileRoute } from '@tanstack/react-router';
import { PinyinDrillPage } from '@/components/tutor/pinyin-guide';
import { pageHead } from '@/lib/mandarin';
import { drillSearchValidator, drillFiltersFrom, type PinyinDrillSearch } from '@/lib/pinyin-drill-search';

// Sound-alikes quiz: its own page, separate from the Sound chart. URL search
// keeps the applied drill filters (initial/final/focus) so history restores them.
export const Route = createFileRoute('/pinyin/sound-alikes')({
  validateSearch: drillSearchValidator,
  head: () => pageHead('Sound-alikes quiz', 'Tell close Mandarin syllables apart by ear.'),
  component: SoundAlikesRoute,
});

function SoundAlikesRoute() {
  const search: PinyinDrillSearch = Route.useSearch();
  const navigate = Route.useNavigate();
  return <PinyinDrillPage mode="alikes" filters={drillFiltersFrom(search)}
    onFilters={f => navigate({ search: { initial: f.initial || undefined, final: f.final || undefined, focus: f.focus || undefined }, resetScroll: false })} />;
}

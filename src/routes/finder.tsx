import { createFileRoute } from '@tanstack/react-router';
import { HanziFinderPage } from '@/components/tutor/hanzi-finder';
import { FINDER_SCOPES, type FinderScope } from '@/lib/hanzi-finder-records';
import { pageHead } from '@/lib/mandarin';

// Hanzi finder: draw a character, see matching glyphs. The scope (?scope=Characters…)
// lives in URL search so Back and shared links restore it; "all" is the default and
// is never written. The drawing itself is not in the URL.
export type FinderSearch = { scope?: Exclude<FinderScope, 'all'> };
export const Route = createFileRoute('/finder')({
  validateSearch: (search: Record<string, unknown>): FinderSearch => {
    const scope = FINDER_SCOPES.find(s => s.key !== 'all' && s.key === search['scope'])?.key;
    return scope && scope !== 'all' ? { scope } : {};
  },
  head: () => pageHead('Hanzi finder', 'Draw a Chinese character you can’t type and find matching characters, components and radicals, each with a similarity percentage.'),
  component: FinderRoute,
});

function FinderRoute() {
  const { scope } = Route.useSearch();
  const navigate = Route.useNavigate();
  return <HanziFinderPage scope={scope ?? 'all'} onScope={next => { void navigate({ search: next === 'all' ? {} : { scope: next }, resetScroll: false }); }}/>;
}

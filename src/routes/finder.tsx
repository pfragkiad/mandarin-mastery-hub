import { createFileRoute } from '@tanstack/react-router';
import { HanziFinderPage } from '@/components/tutor/hanzi-finder';
import { FINDER_SCOPES, type FinderScope } from '@/lib/hanzi-finder-records';
import { pageHead } from '@/lib/mandarin';

// Hanzi finder: draw a character, see matching glyphs. The scope (?scope=Characters…)
// lives in URL search so Back and shared links restore it; "all" is the default and
// is never written. The drawing itself is not in the URL; `similar` (one exact
// glyph, from a detail card's "Find similar") puts that glyph's recorded strokes
// on the board, and is dropped as soon as the learner edits the drawing.
export type FinderSearch = { scope?: Exclude<FinderScope, 'all'>; similar?: string };
export const Route = createFileRoute('/finder')({
  validateSearch: (search: Record<string, unknown>): FinderSearch => {
    const scope = FINDER_SCOPES.find(s => s.key !== 'all' && s.key === search['scope'])?.key;
    const similar = typeof search['similar'] === 'string' && Array.from(search['similar']).length === 1 ? search['similar'] : undefined;
    return { ...(scope && scope !== 'all' ? { scope } : {}), ...(similar ? { similar } : {}) };
  },
  head: () => pageHead('Hanzi finder', 'Draw a Chinese character you can’t type and find matching characters, components and radicals, each with a similarity percentage.'),
  component: FinderRoute,
});

function FinderRoute() {
  const { scope, similar } = Route.useSearch();
  const navigate = Route.useNavigate();
  return <HanziFinderPage scope={scope ?? 'all'} similar={similar}
    onScope={next => { void navigate({ search: { ...(next === 'all' ? {} : { scope: next }), ...(similar ? { similar } : {}) }, resetScroll: false }); }}
    // Editing the forwarded strokes makes it the learner's own drawing: replace (not push) so Back skips the half-edited state.
    onLeaveSimilar={() => { void navigate({ search: scope ? { scope } : {}, replace: true, resetScroll: false }); }}/>;
}

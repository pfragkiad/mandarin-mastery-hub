import { createFileRoute } from '@tanstack/react-router';
import { DrawingGamePage } from '@/components/tutor/drawing-game';
import { drawingSearch } from '@/lib/drawing-game';
import { pageHead } from '@/lib/mandarin';

export const Route = createFileRoute('/drawing')({
  validateSearch: drawingSearch,
  head: () => pageHead('Drawing game', 'Draw Mandarin characters, radicals, components or a random character from words selected by collection and HSK level. Review missed cards with a hidden writing guide.'),
  component: DrawingRoute,
});
function DrawingRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <DrawingGamePage search={search} onSearch={next => { void navigate({ search: next, resetScroll: false }); }}/>;
}
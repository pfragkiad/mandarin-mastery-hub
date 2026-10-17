import { createFileRoute } from '@tanstack/react-router';
import { DrawingGamePage } from '@/components/tutor/drawing-game';
import { drawingSearch } from '@/lib/drawing-game';
import { pageHead } from '@/lib/mandarin';

export const Route = createFileRoute('/drawing')({
  validateSearch: drawingSearch,
  head: () => pageHead('Drawing game', 'Recall Mandarin characters, radicals and components from pinyin and meaning. Write from memory with a hidden guide and review missed cards.'),
  component: DrawingRoute,
});
function DrawingRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <DrawingGamePage search={search} onSearch={next => { void navigate({ search: next, resetScroll: false }); }}/>;
}
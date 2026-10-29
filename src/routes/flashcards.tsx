import { createFileRoute } from '@tanstack/react-router';
import { FlashcardsPage } from '@/components/tutor/flashcards';
import { pageHead } from '@/lib/mandarin';
export const Route = createFileRoute('/flashcards')({
  validateSearch: (search: Record<string, unknown>): { category?: string } => (typeof search['category'] === 'string' && search['category'].trim() ? { category: search['category'] } : {}),
  head: () => pageHead('Flashcards', 'Practise Mandarin vocabulary and characters with shuffled flashcards by category and level.'),
  component: FlashcardsRoute,
});
function FlashcardsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <FlashcardsPage category={search.category ?? 'All vocabulary'} onCategoryChange={category => { void navigate({ search: category === 'All vocabulary' ? {} : { category }, replace: true, resetScroll: false }); }} />;
}

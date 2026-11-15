import { createFileRoute } from '@tanstack/react-router';
import { FlashcardsPage, type FlashcardFilters } from '@/components/tutor/flashcards';
import { pageHead } from '@/lib/mandarin';
export const Route = createFileRoute('/flashcards')({
  validateSearch: (search: Record<string, unknown>): Partial<FlashcardFilters> => ({ ...Object.fromEntries(['category', 'level', 'pos', 'usage', 'strokes'].flatMap(key => typeof search[key] === 'string' && search[key].trim() ? [[key, search[key]]] : [])), ...(search['saved'] === true || search['saved'] === '1' ? { saved: true } : {}), ...(search['usageUpTo'] === '1' || search['usageUpTo'] === true ? { usageUpTo: '1' as const } : {}), ...(search['strokesUpTo'] === '1' || search['strokesUpTo'] === true ? { strokesUpTo: '1' as const } : {}) }),
  head: () => pageHead('Flashcards', 'Practise Mandarin vocabulary and characters with shuffled flashcards by category and level.'),
  component: FlashcardsRoute,
});
function FlashcardsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <FlashcardsPage category={search.category ?? 'All vocabulary'} level={search.level ?? 'All levels'} pos={search.pos ?? 'All types'} usage={search.usage ?? ''} strokes={search.strokes ?? ''} saved={search.saved} usageUpTo={search.usageUpTo} strokesUpTo={search.strokesUpTo} onFiltersChange={filters => { void navigate({ search: filters, resetScroll: false }); }} />;
}

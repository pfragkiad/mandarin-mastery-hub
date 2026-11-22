import { createFileRoute } from '@tanstack/react-router';
import { FlashcardsPage, type FlashcardFilters } from '@/components/tutor/flashcards';
import { collections, pageHead } from '@/lib/mandarin';
import { normalizeFlashcardCategory } from '@/lib/flashcard-filters';
export const Route = createFileRoute('/flashcards')({
  validateSearch: (search: Record<string, unknown>): Partial<FlashcardFilters> => ({ ...Object.fromEntries(['category', 'collection', 'level', 'pos', 'style', 'usage', 'strokes', 'lesson'].flatMap(key => typeof search[key] === 'string' && search[key].trim() ? [[key, search[key]]] : [])), ...(search['saved'] === true || search['saved'] === '1' ? { saved: true } : {}), ...(search['usageUpTo'] === '1' || search['usageUpTo'] === true ? { usageUpTo: '1' as const } : {}), ...(search['strokesUpTo'] === '1' || search['strokesUpTo'] === true ? { strokesUpTo: '1' as const } : {}) }),
  head: () => pageHead('Flashcards', 'Practise Mandarin characters, components, radicals, words and phrases with shuffled flashcards by topic, lesson, level, rank and stroke count.'),
  component: FlashcardsRoute,
});
function FlashcardsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  // Older links kept a collection name (or "All vocabulary") in `category`; read them as Words + that collection.
  const { category, collection } = normalizeFlashcardCategory(search.category, search.collection, collections);
  return <FlashcardsPage category={category} collection={collection} level={search.level ?? 'All levels'} pos={search.pos ?? 'All types'} usage={search.usage ?? ''} strokes={search.strokes ?? ''} saved={search.saved} usageUpTo={search.usageUpTo} strokesUpTo={search.strokesUpTo} style={search.style} lesson={search.lesson} onFiltersChange={filters => { void navigate({ search: { ...filters, collection: filters.collection || undefined, lesson: filters.lesson || undefined }, resetScroll: false }); }} />;
}

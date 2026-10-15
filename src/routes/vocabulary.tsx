import { createFileRoute } from '@tanstack/react-router';
import { VocabularyPage } from '@/components/tutor/vocabulary';
import { pageHead } from '@/lib/mandarin';
export const Route = createFileRoute('/vocabulary')({ validateSearch: (search: Record<string, unknown>): { q?: string } => (typeof search['q'] === 'string' && search['q'] ? { q: search['q'] } : {}), head: () => pageHead('Vocabulary', 'Discover Mandarin words, listen to pronunciation, and collect vocabulary for everyday life.'), component: VocabularyRoute });
function VocabularyRoute() { const { q } = Route.useSearch(); return <VocabularyPage key={q ?? ''} initialQuery={q ?? ''} />; }

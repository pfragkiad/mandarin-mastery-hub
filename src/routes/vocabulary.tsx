import { createFileRoute } from '@tanstack/react-router';
import { VocabularyPage } from '@/components/tutor/vocabulary';
import { pageHead } from '@/lib/mandarin';
export const Route = createFileRoute('/vocabulary')({ validateSearch: (search: Record<string, unknown>): { q?: string; word?: string } => ({ ...(typeof search['q'] === 'string' && search['q'] ? { q: search['q'] } : {}), ...(typeof search['word'] === 'string' && search['word'] ? { word: search['word'] } : {}) }), head: () => pageHead('Vocabulary', 'Discover Mandarin words, listen to pronunciation, and collect vocabulary for everyday life.'), component: VocabularyRoute });
function VocabularyRoute() { const { q, word } = Route.useSearch(); return <VocabularyPage key={`${q ?? ''}:${word ?? ''}`} initialQuery={q ?? ''} initialWordId={word ?? ''} />; }

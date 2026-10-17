import { createFileRoute } from '@tanstack/react-router';
import { VocabularyPage } from '@/components/tutor/vocabulary';
import { pageHead } from '@/lib/mandarin';
export type VocabularySearch = { q?: string; word?: string; tab?: 'word' | 'phrase'; page?: number; collection?: string; level?: string; status?: string; py?: 'pinyin' };
export const Route = createFileRoute('/vocabulary')({ validateSearch: (search: Record<string, unknown>): VocabularySearch => ({
  ...(search['tab'] === 'word' || search['tab'] === 'phrase' ? { tab: search['tab'] } : {}),
  ...(search['py'] === 'pinyin' ? { py: 'pinyin' as const } : {}),
  ...(typeof search['q'] === 'string' && search['q'] ? { q: search['q'] } : {}),
  ...(typeof search['word'] === 'string' && search['word'] ? { word: search['word'] } : {}),
  ...(typeof search['page'] === 'number' ? { page: search['page'] } : {}),
  ...(typeof search['collection'] === 'string' ? { collection: search['collection'] } : {}),
  ...(typeof search['level'] === 'string' ? { level: search['level'] } : {}),
  ...(typeof search['status'] === 'string' ? { status: search['status'] } : {}),
}), head: () => pageHead('Vocabulary', 'Discover Mandarin words and phrases, listen to pronunciation, and collect vocabulary for everyday life.'), component: VocabularyRoute });
function VocabularyRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <VocabularyPage {...search} initialQuery={search.q ?? ''} initialWordId={search.word ?? ''}
    onTabChange={tab => navigate({ search: { tab }, resetScroll: false })}
    onFiltersChange={(patch, replace = false) => navigate({ search: prev => { const { word: _word, ...rest } = prev; return { ...rest, ...patch, page: 1 }; }, resetScroll: false, replace })}
    onPageChange={page => navigate({ search: prev => { const { word: _word, ...rest } = prev; return { ...rest, page }; }, resetScroll: false })}
    onWordOpen={(id, page) => navigate({ search: prev => { const { word: _word, ...rest } = prev; return { ...rest, ...(id ? { word: id } : {}), ...(page ? { page } : {}) }; }, resetScroll: false, replace: !id })} />;
}

import { shuffleSeed, type LibrarySort } from '@/lib/library-order';
import { createFileRoute } from '@tanstack/react-router';
import { VocabularyPage } from '@/components/tutor/vocabulary';
import { pageHead } from '@/lib/mandarin';
export type VocabularySearch = { sort?: LibrarySort | undefined; seed?: number | undefined; q?: string; word?: string; tab?: 'word' | 'idiom' | 'phrase'; page?: number; collection?: string; subtopic?: string; level?: string; status?: string; py?: 'pinyin' | 'exact' | undefined; pos?: string; style?: string; band?: string; /** '1' widens the idiom rank band to rank 1..band end ("include lower ranks"). */ bandUpTo?: '1' | undefined };
export const Route = createFileRoute('/vocabulary')({ validateSearch: (search: Record<string, unknown>): VocabularySearch => ({
  ...(search['sort'] === 'pinyin' || search['sort'] === 'hsk' || search['sort'] === 'random' ? { sort: search['sort'] } : {}),
  ...(shuffleSeed(search['seed']) ? { seed: shuffleSeed(search['seed']) } : {}),
  ...(search['tab'] === 'word' || search['tab'] === 'idiom' || search['tab'] === 'phrase' ? { tab: search['tab'] } : {}),
  ...(search['py'] === 'pinyin' || search['py'] === 'exact' ? { py: search['py'] } : {}),
  ...(typeof search['q'] === 'string' && search['q'] ? { q: search['q'] } : {}),
  ...(typeof search['word'] === 'string' && search['word'] ? { word: search['word'] } : {}),
  ...(typeof search['page'] === 'number' ? { page: search['page'] } : {}),
  ...(typeof search['collection'] === 'string' && search['collection'] ? { collection: search['collection'] } : {}),
  // Subtopic: the stable registry ID (e.g. digital-technology); unknown IDs simply match nothing.
  ...(typeof search['subtopic'] === 'string' && search['subtopic'] ? { subtopic: search['subtopic'] } : {}),
  ...(typeof search['level'] === 'string' && search['level'] ? { level: search['level'] } : {}),
  ...(typeof search['status'] === 'string' && search['status'] ? { status: search['status'] } : {}),
  ...(typeof search['pos'] === 'string' && search['pos'] ? { pos: search['pos'] } : {}),
  ...(typeof search['style'] === 'string' && search['style'] ? { style: search['style'] } : {}),
  ...(typeof search['band'] === 'string' && search['band'] ? { band: search['band'] } : {}),
  // TanStack parses bare URL numbers into JS numbers and quotes numeric-looking
  // strings, so the flag can arrive as 1, '1' or '"1"'; all three mean "widen".
  ...(search['bandUpTo'] === 1 || search['bandUpTo'] === '1' || search['bandUpTo'] === '"1"' || search['bandUpTo'] === true ? { bandUpTo: '1' as const } : {}),
}), head: () => pageHead('Vocabulary', 'Discover Mandarin words and phrases, listen to pronunciation, and collect vocabulary for everyday life.'), component: VocabularyRoute });
function VocabularyRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <VocabularyPage {...search} initialQuery={search.q ?? ''} initialWordId={search.word ?? ''}
    onFiltersChange={(patch, replace = false) => navigate({ search: prev => { const { word: _word, ...rest } = prev; return { ...rest, ...patch, page: 1 }; }, resetScroll: false, replace })}
    onPageChange={page => navigate({ search: prev => { const { word: _word, ...rest } = prev; return { ...rest, page }; }, resetScroll: false })}
    onWordOpen={(id, page) => navigate({ search: prev => { const { word: _word, ...rest } = prev; return { ...rest, ...(id ? { word: id } : {}), ...(page ? { page } : {}) }; }, resetScroll: false, replace: !id })} />;
}

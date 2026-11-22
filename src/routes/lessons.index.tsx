import { createFileRoute } from '@tanstack/react-router';
import { LessonsIndex } from '@/components/tutor/lessons-index';
import { pageHead } from '@/lib/mandarin';
import { lessonCategories, lessonSummaries } from '@/lib/lessons';
import { lessonScopes } from '@/components/tutor/lesson-search-results';

// The Lessons index. The browsing mode and its filters live in URL search so Back and shared
// links restore them: ?view=topic (absent = By course), &category=<registry topic id> and
// &tag=<recorded lesson tag>, both only in the topic view; an applied lesson search adds &q=<text>
// and optionally &scope=<course id | independent>; unknown values are dropped.
export type LessonsSearch = { view?: 'topic' | undefined; category?: string | undefined; tag?: string | undefined; q?: string | undefined; scope?: string | undefined };
export const Route = createFileRoute('/lessons/')({
  validateSearch: (search: Record<string, unknown>): LessonsSearch => {
    const q = typeof search['q'] === 'string' && search['q'].trim() ? search['q'] : undefined;
    const scope = q && typeof search['scope'] === 'string' && lessonScopes.some(s => s.id === search['scope']) ? search['scope'] : undefined;
    const found = { ...(q ? { q } : {}), ...(scope ? { scope } : {}) };
    if (search['view'] !== 'topic') return found;
    const id = search['category'];
    const tag = search['tag'];
    return {
      ...found,
      view: 'topic',
      ...(typeof id === 'string' && lessonCategories.some(c => c.id === id) ? { category: id } : {}),
      ...(typeof tag === 'string' && lessonSummaries.some(s => s.tags.includes(tag)) ? { tag } : {}),
    };
  },
  head: () => pageHead('Lessons', 'Guided Mandarin lessons by course and topic — search every lesson’s hanzi, pinyin and English — with examples and self-check questions.'),
  component: LessonsRoute,
});

function LessonsRoute() {
  const { view, category, tag, q, scope } = Route.useSearch();
  const navigate = Route.useNavigate();
  return <LessonsIndex view={view ?? 'course'} category={category} tag={tag} q={q ?? ''} scope={scope} onSearch={next => navigate({ search: next, resetScroll: false })}/>;
}

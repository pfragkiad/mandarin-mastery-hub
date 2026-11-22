import { createFileRoute } from '@tanstack/react-router';
import { LessonsIndex } from '@/components/tutor/lessons-index';
import { pageHead } from '@/lib/mandarin';
import { lessonCategories, lessonSummaries } from '@/lib/lessons';

// The Lessons index. The browsing mode and its filters live in URL search so Back and shared
// links restore them: ?view=topic (absent = By course), &category=<registry topic id> and
// &tag=<recorded lesson tag>, both only in the topic view; unknown values are dropped.
export type LessonsSearch = { view?: 'topic' | undefined; category?: string | undefined; tag?: string | undefined };
export const Route = createFileRoute('/lessons/')({
  validateSearch: (search: Record<string, unknown>): LessonsSearch => {
    if (search['view'] !== 'topic') return {};
    const id = search['category'];
    const tag = search['tag'];
    return {
      view: 'topic',
      ...(typeof id === 'string' && lessonCategories.some(c => c.id === id) ? { category: id } : {}),
      ...(typeof tag === 'string' && lessonSummaries.some(s => s.tags.includes(tag)) ? { tag } : {}),
    };
  },
  head: () => pageHead('Lessons', 'Guided Mandarin lessons by course and topic: the HSK 3.0 Level 1 path plus character lessons, with examples and self-check questions.'),
  component: LessonsRoute,
});

function LessonsRoute() {
  const { view, category, tag } = Route.useSearch();
  const navigate = Route.useNavigate();
  return <LessonsIndex view={view ?? 'course'} category={category} tag={tag} onSearch={next => navigate({ search: next, resetScroll: false })}/>;
}

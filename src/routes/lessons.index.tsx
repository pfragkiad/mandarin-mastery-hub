import { createFileRoute } from '@tanstack/react-router';
import { LessonsIndex } from '@/components/tutor/lessons-index';
import { pageHead } from '@/lib/mandarin';
import { lessonCategories } from '@/lib/lessons';

// The Lessons index. The category filter lives in URL search (?category=<registry id>)
// so Back and shared links restore it; unknown ids are dropped.
export type LessonsSearch = { category?: string | undefined };
export const Route = createFileRoute('/lessons/')({
  validateSearch: (search: Record<string, unknown>): LessonsSearch => {
    const id = search['category'];
    return typeof id === 'string' && lessonCategories.some(c => c.id === id) ? { category: id } : {};
  },
  head: () => pageHead('Lessons', 'Guided Mandarin lessons on how characters, words and grammar patterns are used, with examples and self-check questions.'),
  component: LessonsRoute,
});

function LessonsRoute() {
  const { category } = Route.useSearch();
  const navigate = Route.useNavigate();
  return <LessonsIndex category={category} onCategory={id => navigate({ search: id ? { category: id } : {}, resetScroll: false })}/>;
}

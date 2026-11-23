import { createFileRoute, Link, notFound, useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { LessonPage } from '@/components/tutor/lesson-page';
import { pageHead } from '@/lib/mandarin';
import { loadLesson, lessonSummary } from '@/lib/lessons';
import { Button } from '@/components/ui/button';

// One lesson, addressed by its permanent lesson_id (/lessons/char-6B21). The whole lesson
// JSON loads lazily here; title and description come from the eager summary so head()
// works before the loader finishes. The vocabulary priority filter lives in URL search.
export type LessonSearch = { priority?: 'A' | 'B' | 'C' | undefined };
export const Route = createFileRoute('/lessons/$lessonId')({
  validateSearch: (search: Record<string, unknown>): LessonSearch => {
    const p = search['priority'];
    return p === 'A' || p === 'B' || p === 'C' ? { priority: p } : {};
  },
  loader: async ({ params }) => {
    const lesson = await loadLesson(params.lessonId);
    if (!lesson) throw notFound();
    return lesson;
  },
  head: ({ params }) => {
    const s = lessonSummary(params.lessonId);
    if (!s) return { meta: [{ title: 'Lesson not found · Mandarin Tutor' }, { name: 'robots', content: 'noindex' }] };
    return pageHead(s.headword ? `${s.headword.hanzi} · ${s.title}` : s.title, s.description || s.subtitle || 'A guided Mandarin lesson.');
  },
  component: LessonRoute,
  errorComponent: LessonError,
  notFoundComponent: () => <div className="record-gap lesson-missing"><p>This lesson doesn’t exist.</p><Button asChild variant="outline" size="sm"><Link to="/lessons">All lessons</Link></Button></div>,
});

function LessonRoute() {
  const lesson = Route.useLoaderData();
  const { priority } = Route.useSearch();
  const navigate = Route.useNavigate();
  // Keyed by lesson so Previous/Next start that lesson's own view (open sections, panels).
  return <LessonPage key={lesson.summary.id} lesson={lesson} priority={priority} onPriority={value => navigate({ search: value ? { priority: value } : {}, resetScroll: false })}/>;
}

function LessonError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return <div className="record-gap lesson-missing" role="alert"><p>The lesson couldn’t be loaded. {error instanceof Error ? error.message : ''}</p><Button variant="outline" size="sm" onClick={() => { void router.invalidate(); reset(); }}>Try again</Button></div>;
}

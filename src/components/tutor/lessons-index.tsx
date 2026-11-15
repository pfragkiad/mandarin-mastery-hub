import { Link } from '@tanstack/react-router';
import { BookText, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { lessonCategories, lessonSummaries, type LessonSummary } from '@/lib/lessons';
import { LessonText } from './lesson-text';
import { LessonStatusPill } from './lesson-page';
import { HintBody } from './source-info';

/** Lessons' status pill in the page heading: the collection is partial material, so the
 *  tag says so and opens the shared hint card explaining exactly what is missing. No
 *  inputs or state — the copy restates only what the data holds today (a handful of
 *  character lessons), so the tag can never read as a claim of complete coverage. */
function ExperimentalTag() {
  return <Popover>
    <PopoverTrigger className="experimental-tag" aria-label="Lessons are experimental — what this means">
      <FlaskConical aria-hidden="true"/>Experimental
    </PopoverTrigger>
    <PopoverContent className="source-info-popover count-hint w-auto" align="end"><HintBody>
      <strong className="count-hint-title count-hint-experimental">Experimental</strong><br/>
      Still being built: only a few character lessons so far; word, phrase and topic lessons are not in the collection yet.
    </HintBody></PopoverContent>
  </Popover>;
}

/**
 * The Lessons index (/lessons): every lesson from src/lib/lessons.ts, grouped under the
 * shared registry categories (a lesson sits under its primary category).
 *
 * Inputs: `category` — the URL-backed category filter (registry id) and `onCategory`,
 * which pushes the choice into the URL so Back restores it. No other state.
 */
const kindLabel: Record<LessonSummary['kind'], string> = { character: 'Character', word: 'Word', phrase: 'Phrase', topic: 'Topic' };

export function LessonsIndex({ category, onCategory }: { category: string | undefined; onCategory: (id: string | undefined) => void }) {
  const used = lessonCategories.filter(c => lessonSummaries.some(s => s.primaryCategory?.id === c.id));
  const uncategorised = lessonSummaries.filter(s => !s.primaryCategory);
  const groups = used.filter(c => !category || c.id === category).map(c => ({ id: c.id, label: c.label, description: c.description, lessons: lessonSummaries.filter(s => s.primaryCategory?.id === c.id) }));
  if (!category && uncategorised.length) groups.push({ id: 'other', label: 'Other lessons', description: '', lessons: uncategorised });
  return <div className="lessons-index library-page">
    <div className="page-heading library-heading"><div><div className="eyebrow">READ · LISTEN · CHECK YOURSELF</div><h1>Lessons</h1><p>Short guided lessons on how characters, words and patterns are really used, with examples to listen to and questions to check yourself.</p></div><ExperimentalTag/></div>
    {used.length > 1 && <div className="lesson-filter" role="group" aria-label="Filter lessons by category">
      <Button size="sm" variant={category ? 'outline' : 'default'} aria-pressed={!category} onClick={() => onCategory(undefined)}>All · {lessonSummaries.length}</Button>
      {used.map(c => <Button key={c.id} size="sm" variant={category === c.id ? 'default' : 'outline'} aria-pressed={category === c.id} onClick={() => onCategory(c.id)}>{c.label} · {lessonSummaries.filter(s => s.primaryCategory?.id === c.id).length}</Button>)}
    </div>}
    {lessonSummaries.length === 0 && <div className="record-gap"><p>No lessons recorded yet.</p></div>}
    {groups.map(g => <section key={g.id} className="lessons-group" aria-labelledby={`lessons-${g.id}`}>
      <h2 id={`lessons-${g.id}`}>{g.label}</h2>
      {g.description && <p className="lesson-note">{g.description}</p>}
      <div className="lessons-grid">{g.lessons.map(s => <LessonCard key={s.id} lesson={s}/>)}</div>
    </section>)}
  </div>;
}

/** One lesson card: the headword box when the lesson has one, else the book mark. */
export function LessonCard({ lesson }: { lesson: LessonSummary }) {
  return <Link to="/lessons/$lessonId" params={{ lessonId: lesson.id }} className="lesson-index-card">
    <span className={`lesson-index-glyph${lesson.headword ? '' : ' is-topic'}`} aria-hidden="true">{lesson.headword ? <span lang="zh-CN">{lesson.headword.hanzi}</span> : <BookText/>}</span>
    <span className="lesson-index-copy">
      <span className="lesson-index-meta">{kindLabel[lesson.kind]}{lesson.headword?.pinyin && <> · <span className="pinyin">{lesson.headword.pinyin}</span></>}<LessonStatusPill status={lesson.status}/></span>
      <strong>{lesson.title}</strong>
      {lesson.subtitle && <span className="lesson-index-subtitle"><LessonText text={lesson.subtitle}/></span>}
      {lesson.audience && <small>{lesson.audience}</small>}
    </span>
  </Link>;
}

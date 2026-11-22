import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { BookText, FlaskConical, Library, Tags, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { lessonCategories, lessonSummaries, type LessonSummary } from '@/lib/lessons';
import { courses, projectIndependentLessons, sectionPlacements, type Course } from '@/lib/lesson-curricula';
import { LessonText } from './lesson-text';
import { LessonStatusPill } from './lesson-page';
import { HintBody } from './source-info';

/** Lessons' status pill in the page heading: the collection is partial material, so the
 *  tag says so and opens the shared hint card explaining exactly what is missing. No
 *  inputs or state — the copy restates only what the data holds today, so the tag can
 *  never read as a claim of complete coverage. */
function ExperimentalTag() {
  return <Popover>
    <PopoverTrigger className="experimental-tag" aria-label="Lessons are experimental — what this means">
      <FlaskConical aria-hidden="true"/>Experimental
    </PopoverTrigger>
    <PopoverContent className="source-info-popover count-hint w-auto" align="end"><HintBody>
      <strong className="count-hint-title count-hint-experimental">Experimental</strong><br/>
      Still being built: the HSK 3.0 Level 1 path, a Conversational Mandarin course and two character lessons so far, all still drafts awaiting review. Later levels are not in the collection yet.
    </HintBody></PopoverContent>
  </Popover>;
}

export type LessonsView = 'course' | 'topic';

/**
 * The Lessons index (/lessons), with two ways to browse the same lessons:
 * - By course (default): each curriculum manifest (src/lib/lesson-curricula.ts) as
 *   Course → Level → Unit → Lesson in its recorded order, with each lesson's recorded
 *   prerequisites, then "Independent lessons" for lessons no course places (次, 以).
 * - By topic: every lesson across all courses under its primary registry topic; the topic
 *   filter also matches secondary topics, and a lesson's tags filter the list by that tag.
 * Lessons are only referenced — one lesson placed in two courses is still one lesson.
 *
 * Inputs: the URL-backed `view`, `category` (registry topic id) and `tag`, and `onSearch`,
 * which pushes a change into the URL so Back restores it. No other state.
 */
export function LessonsIndex({ view, category, tag, onSearch }: { view: LessonsView; category: string | undefined; tag: string | undefined; onSearch: (next: { view?: 'topic'; category?: string; tag?: string }) => void }) {
  return <div className="lessons-index library-page">
    <div className="page-heading library-heading"><div><div className="eyebrow">READ · LISTEN · CHECK YOURSELF</div><h1>Lessons</h1><p>Short guided lessons on how characters, words and patterns are really used, with examples to listen to and questions to check yourself.</p></div><ExperimentalTag/></div>
    <div className="lesson-view-switch writer-speed-options" role="group" aria-label="Browse lessons">
      <Button variant="ghost" size="sm" type="button" className={view === 'course' ? 'active' : ''} aria-pressed={view === 'course'} onClick={() => onSearch({})}><Library aria-hidden="true"/>By course</Button>
      <Button variant="ghost" size="sm" type="button" className={view === 'topic' ? 'active' : ''} aria-pressed={view === 'topic'} onClick={() => onSearch({ view: 'topic' })}><Tags aria-hidden="true"/>By topic</Button>
    </div>
    {lessonSummaries.length === 0 && <div className="record-gap"><p>No lessons recorded yet.</p></div>}
    {view === 'course' ? <CourseView/> : <TopicView category={category} tag={tag} onSearch={onSearch}/>}
  </div>;
}

/** Remembered open/collapsed flag for one course drawer. Drawers start COLLAPSED on a
 *  first visit (the list is long), then the visitor's own fold/unfold choice is kept in
 *  localStorage per drawer id. Read after mount so server and first client render agree. */
const FOLD_KEY = 'lessons-fold-v1';
function useLessonFold(id: string): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FOLD_KEY);
      if (saved) setOpen(Boolean((JSON.parse(saved) as Record<string, boolean>)[id]));
    } catch { /* storage unavailable: stay collapsed */ }
  }, [id]);
  const update = (next: boolean) => {
    setOpen(next);
    try {
      const saved = localStorage.getItem(FOLD_KEY);
      const all = saved ? (JSON.parse(saved) as Record<string, boolean>) : {};
      all[id] = next;
      localStorage.setItem(FOLD_KEY, JSON.stringify(all));
    } catch { /* ignore */ }
  };
  return [open, update];
}

/** One foldable drawer (a course, or "Independent lessons"): collapsed by default,
 *  remembering the visitor's last choice. Native <details> keeps keyboard and screen
 *  reader support; onToggle fires for every open/close, so the choice is stored there. */
function LessonFold({ id, title, note, children }: { id: string; title: string; note?: string; children: React.ReactNode }) {
  const [open, setOpen] = useLessonFold(id);
  return <details className="lessons-group lessons-course lessons-fold" open={open} onToggle={e => setOpen((e.target as HTMLDetailsElement).open)}>
    <summary><h2 id={`course-${id}`}>{title}</h2></summary>
    {note && <p className="lesson-note">{note}</p>}
    {children}
  </details>;
}

/** By course: every course, then the lessons no course places. */
function CourseView() {
  return <>
    {courses.map(c => <CourseOutline key={c.id} course={c}/>)}
    {projectIndependentLessons.length > 0 && <LessonFold id="independent" title="Independent lessons" note="Lessons that stand on their own, outside any course. Open them in any order.">
      <div className="lessons-grid">{projectIndependentLessons.map(s => <LessonCard key={s.id} lesson={s}/>)}</div>
    </LessonFold>}
  </>;
}

/** One course: its levels (sections) → units → numbered lessons, all in recorded order.
 *  Lesson numbers count through the whole level, so "Lesson 5" matches the lesson page. */
function CourseOutline({ course }: { course: Course }) {
  return <LessonFold id={course.id} title={course.title} note={course.description}>
    {course.sections.map(section => {
      const flat = sectionPlacements(section);
      return <div key={section.id} className="lessons-level">
        <h3>{section.title}<span className="lessons-level-count">{flat.length} {flat.length === 1 ? 'lesson' : 'lessons'}</span></h3>
        {section.description && <p className="lesson-note">{section.description}</p>}
        {section.units.map((unit, u) => <div key={unit.id} className="lessons-unit">
          <h4><span className="lessons-unit-number">Unit {u + 1}</span>{unit.title}</h4>
          <ol className="lessons-grid lessons-path">{unit.placements.map(p => <li key={p.id}>
            <LessonCard lesson={p.lesson} number={flat.indexOf(p) + 1} after={p.prerequisites}/>
          </li>)}</ol>
        </div>)}
      </div>;
    })}
  </LessonFold>;
}

/** By topic: lessons under their primary registry topic; a topic filter also matches
 *  secondary topics, and a tag filter keeps only lessons carrying that exact tag. */
function TopicView({ category, tag, onSearch }: { category: string | undefined; tag: string | undefined; onSearch: (next: { view?: 'topic'; category?: string; tag?: string }) => void }) {
  const inTopic = (s: LessonSummary, id: string) => s.categories.some(c => c.id === id);
  const matching = lessonSummaries.filter(s => (!category || inTopic(s, category)) && (!tag || s.tags.includes(tag)));
  const used = lessonCategories.filter(c => lessonSummaries.some(s => inTopic(s, c.id)));
  const primaryGroups = lessonCategories.map(c => ({ id: c.id, label: c.label, description: c.description, lessons: matching.filter(s => s.primaryCategory?.id === c.id) })).filter(g => g.lessons.length);
  // With a topic chosen, lessons that only list it as a secondary topic still belong in one group.
  const groups = category ? [{ ...used.find(c => c.id === category)!, lessons: matching }].filter(g => g.lessons.length) : primaryGroups;
  const unfiled = category ? [] : matching.filter(s => !s.primaryCategory);
  if (unfiled.length) groups.push({ id: 'other', label: 'Other lessons', description: '', lessons: unfiled });
  return <>
    <div className="lesson-topic-filters">
      <select className="filter-select" aria-label="Filter lessons by topic" value={category ?? ''} onChange={e => onSearch({ view: 'topic', ...(e.target.value ? { category: e.target.value } : {}), ...(tag ? { tag } : {}) })}>
        <option value="">All topics · {lessonSummaries.length}</option>
        {used.map(c => <option key={c.id} value={c.id}>{c.label} · {lessonSummaries.filter(s => inTopic(s, c.id)).length}</option>)}
      </select>
      {tag && <button type="button" className="lesson-tag-chip is-active" onClick={() => onSearch({ view: 'topic', ...(category ? { category } : {}) })} aria-label={`Remove tag filter ${tag}`}>#{tag}<X aria-hidden="true"/></button>}
    </div>
    {groups.length === 0 && <div className="record-gap"><p>No lessons match this topic and tag.</p></div>}
    {groups.map(g => <section key={g.id} className="lessons-group" aria-labelledby={`lessons-${g.id}`}>
      <h2 id={`lessons-${g.id}`}>{g.label}</h2>
      {g.description && <p className="lesson-note">{g.description}</p>}
      <div className="lessons-grid">{g.lessons.map(s => <LessonCard key={s.id} lesson={s} onTag={t => onSearch(t === tag ? { view: 'topic', ...(category ? { category } : {}) } : { view: 'topic', ...(category ? { category } : {}), tag: t })} activeTag={tag}/>)}</div>
    </section>)}
  </>;
}

const kindLabel: Record<LessonSummary['kind'], string> = { character: 'Character', word: 'Word', phrase: 'Phrase', topic: 'Topic' };

/**
 * One lesson card: the headword box when the lesson has one; otherwise the lesson's number
 * in its course (course view) or the book mark. `after` lists recorded prerequisites;
 * `onTag` shows the lesson's tags as buttons that filter the topic view (the card link and
 * the tag buttons are siblings, never nested interactive elements).
 */
export function LessonCard({ lesson, number, after = [], onTag, activeTag }: { lesson: LessonSummary; number?: number; after?: LessonSummary[]; onTag?: (tag: string) => void; activeTag?: string | undefined }) {
  const box = lesson.headword ? <span lang="zh-CN">{lesson.headword.hanzi}</span> : number ? <span className="lesson-index-number">{number}</span> : <BookText/>;
  return <div className="lesson-index-item">
    <Link to="/lessons/$lessonId" params={{ lessonId: lesson.id }} className="lesson-index-card">
      <span className={`lesson-index-glyph${lesson.headword ? '' : ' is-topic'}`} aria-hidden="true">{box}</span>
      <span className="lesson-index-copy">
        <span className="lesson-index-meta">{number ? `Lesson ${number}` : kindLabel[lesson.kind]}{lesson.headword?.pinyin && <> · <span className="pinyin">{lesson.headword.pinyin}</span></>}<LessonStatusPill status={lesson.status}/></span>
        <strong>{lesson.title}</strong>
        {lesson.subtitle && <span className="lesson-index-subtitle"><LessonText text={lesson.subtitle}/></span>}
        {after.length > 0 && <small>After: {after.map(a => a.title).join(', ')}</small>}
        {!number && lesson.audience && <small>{lesson.audience}</small>}
      </span>
    </Link>
    {onTag && lesson.tags.length > 0 && <div className="lesson-index-tags" aria-label={`Tags for ${lesson.title}`}>
      {lesson.tags.map(t => <button key={t} type="button" className={`lesson-tag-chip${activeTag === t ? ' is-active' : ''}`} aria-pressed={activeTag === t} onClick={() => onTag(t)}>#{t}</button>)}
    </div>}
  </div>;
}

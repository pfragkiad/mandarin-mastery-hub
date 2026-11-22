import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronDown, FlaskConical, Library, Search, Tags, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { lessonCategories, lessonSummaries, lessonSummary, type LessonSummary } from '@/lib/lessons';
import { courses, projectIndependentLessons, sectionPlacements, type Course } from '@/lib/lesson-curricula';
import { LessonText } from './lesson-text';
import { readLessonFolds, setLessonFold } from '@/lib/lesson-fold';
import { HintBody, SourceInfo } from './source-info';
import { continueLesson, lessonState, resetCourseProgress, useLessonProgress, type LessonProgressMap } from '@/lib/lesson-progress';
import { ResetProgressButton } from './reset-progress-button';
import { DraftFilterForm } from './filter-form';
import { LessonSearchResults, lessonScopeLabel, lessonScopes } from './lesson-search-results';

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
/** One Lessons URL state: browsing view/topic/tag plus an applied search (`q`, `scope`). */
export type LessonsNav = { view?: 'topic'; category?: string; tag?: string; q?: string; scope?: string };

type LessonSearchDraft = { q: string; scope: string };
/**
 * The Lessons search box with its scope dropdown (All lessons, one course, or Independent
 * lessons). Inputs: the applied `q`/`scope` from the URL and `onApply`, which pushes the new
 * search into the URL so Back restores it. Drafts live inside the shared DraftFilterForm,
 * so typing never rerenders the lesson list; results come only on Apply/Enter, and the
 * scope alone (with no text) never offers Apply, since it searches nothing by itself.
 */
function LessonSearchForm({ q, scope, onApply }: { q: string; scope: string | undefined; onApply: (next: LessonSearchDraft) => void }) {
  const applied = { q, scope: scope ?? '' };
  const label = lessonScopeLabel(scope);
  return <div className="lesson-search">
    <DraftFilterForm searchKey="q" searchModeKey="scope" applied={applied} active={q.trim() !== ''} count={0} showCount={false}
      onApply={onApply} onClear={() => { const empty = { q: '', scope: '' }; onApply(empty); return empty; }}
      chips={q.trim() && label ? [{ label, clear: { scope: '' } }] : []}
      filterFields={({ draft, patch }) => <select className="filter-select" aria-label="Search in" value={draft.scope} onChange={e => patch({ scope: e.target.value })}>
        <option value="">All lessons</option>
        {lessonScopes.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>}>
      {({ draft, patch }) => <div className="search-field"><Search aria-hidden="true"/><input type="search" aria-label="Search lessons" placeholder="Search lessons: 学生, xue2sheng1, xuesheng, student…" value={draft.q} onChange={e => patch({ q: e.target.value })}/></div>}
    </DraftFilterForm>
  </div>;
}

/**
 * The Lessons index (/lessons), with two ways to browse the same lessons:
 * - By course (default): each curriculum manifest (src/lib/lesson-curricula.ts) as
 *   Course → Level → Unit → Lesson in its recorded order, with each lesson's recorded
 *   prerequisites, then "Independent lessons" for lessons no course places (次, 以).
 * - By topic: every lesson across all courses under its primary registry topic; the topic
 *   filter also matches secondary topics, and a lesson's tags filter the list by that tag.
 * Lessons are only referenced — one lesson placed in two courses is still one lesson.
 *
 * A search box above both views (LessonSearchForm) searches every lesson's text, in all
 * lessons or one course; while a search is applied its results replace the list.
 *
 * Inputs: the URL-backed `view`, `category` (registry topic id), `tag`, `q` and `scope`, and `onSearch`,
 * which pushes a change into the URL so Back restores it. No other state.
 */
export function LessonsIndex({ view, category, tag, q = '', scope, onSearch }: { view: LessonsView; category: string | undefined; tag: string | undefined; q?: string; scope?: string | undefined; onSearch: (next: LessonsNav) => void }) {
  // View, topic and tag changes keep an applied search; the search form keeps the browsing view.
  const keep = { ...(q.trim() ? { q } : {}), ...(q.trim() && scope ? { scope } : {}) };
  const browse = (next: LessonsNav) => onSearch({ ...next, ...keep });
  const browsing = { ...(view === 'topic' ? { view: 'topic' as const } : {}), ...(category ? { category } : {}), ...(tag ? { tag } : {}) };
  const searching = q.trim() !== '';
  const progress = useLessonProgress();
  return <div className="lessons-index library-page">
    <div className="page-heading library-heading"><div><div className="eyebrow">READ · LISTEN · CHECK YOURSELF</div><h1>Lessons</h1><p>Short guided lessons on how characters, words and patterns are really used, with examples to listen to and questions to check yourself.</p></div><ExperimentalTag/></div>
    <LessonSearchForm q={q} scope={scope} onApply={(next) => onSearch({ ...browsing, ...(next.q.trim() ? { q: next.q } : {}), ...(next.q.trim() && next.scope ? { scope: next.scope } : {}) })}/>
    <div className="lesson-view-switch writer-speed-options" role="group" aria-label="Browse lessons">
      <Button variant="ghost" size="sm" type="button" className={view === 'course' ? 'active' : ''} aria-pressed={view === 'course'} onClick={() => browse({})}><Library aria-hidden="true"/>By course</Button>
      <Button variant="ghost" size="sm" type="button" className={view === 'topic' ? 'active' : ''} aria-pressed={view === 'topic'} onClick={() => browse({ view: 'topic' })}><Tags aria-hidden="true"/>By topic</Button>
    </div>
    {!searching && <ContinueCard progress={progress}/>}
    {lessonSummaries.length === 0 && <div className="record-gap"><p>No lessons recorded yet.</p></div>}
    {searching ? <LessonSearchResults query={q} scope={scope}/> : view === 'course' ? <CourseView progress={progress}/> : <TopicView category={category} tag={tag} onSearch={browse} progress={progress}/>}
  </div>;
}

/** Remembered open/collapsed flag for one course drawer. Drawers start COLLAPSED on a
 *  first visit (the list is long), then the visitor's own fold/unfold choice is kept in
 *  localStorage per drawer id. Read after mount so server and first client render agree. */
function useLessonFold(id: string): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(Boolean(readLessonFolds()[id])); }, [id]);
  const update = (next: boolean) => { setOpen(next); setLessonFold(id, next); };
  return [open, update];
}

/** One foldable drawer (a course, or "Independent lessons"): collapsed by default,
 *  remembering the visitor's last choice. Native <details> keeps keyboard and screen
 *  reader support; onToggle fires for every open/close, so the choice is stored there.
 *  React also delivers a nested unit's toggle to this handler, so only this drawer's own
 *  toggle (target === currentTarget) is stored — a unit's arrow never folds the course.
 *  `tools` sits at the end of the note row (e.g. the course's Reset progress). */
function LessonFold({ id, title, note, info, aside, tools, children }: { id: string; title: string; note?: string; info?: string; aside?: React.ReactNode; tools?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useLessonFold(id);
  return <details className="lessons-group lessons-course lessons-fold" open={open} onToggle={e => { if (e.target === e.currentTarget) setOpen(e.currentTarget.open); }}>
    <summary><h2 id={`course-${id}`}>{title}</h2>{aside}</summary>
    {(note || tools) && <div className="lesson-fold-intro">
      {note && <p className="lesson-note">{note}{info && <> <SourceInfo className="lesson-course-info" inline>{info}</SourceInfo></>}</p>}
      {tools}
    </div>}
    {children}
  </details>;
}

/** Card shown above both views for the most recent unfinished lesson (cookie progress). */
function ContinueCard({ progress }: { progress: LessonProgressMap }) {
  const id = continueLesson(progress);
  const lesson = id ? lessonSummary(id) : undefined;
  if (!lesson || !id) return null;
  const entry = progress[id]!;
  const { fraction } = lessonState(entry);
  return <Link to="/lessons/$lessonId" params={{ lessonId: id }} className="lesson-continue">
    <LessonGlyph lesson={lesson}/>
    <span className="lesson-continue-copy">
      <small>Continue where you left off{entry.total ? ` · ${entry.answered.length} of ${entry.total} tasks` : ''}</small>
      <strong>{lesson.title}</strong>
      <ProgressBar fraction={fraction}/>
    </span>
    <span className="lesson-continue-action">Resume</span>
  </Link>;
}

function ProgressBar({ fraction }: { fraction: number }) {
  return <span className="lesson-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}><span style={{ width: `${fraction * 100}%` }}/></span>;
}

/** Learner-facing caveats per course, shown behind the (i) beside the course note. */
const courseCaveat = (c: Course) => c.kind.toLowerCase().includes('hsk') || c.id.startsWith('hsk')
  ? 'A suggested order for learning the Level 1 words. It is not an official HSK sequence.'
  : 'A suggested order. Lessons can be opened in any order.';

/** By course: every course, then the lessons no course places. */
function CourseView({ progress }: { progress: LessonProgressMap }) {
  return <>
    {courses.map(c => <CourseOutline key={c.id} course={c} progress={progress}/>)}
    {projectIndependentLessons.length > 0 && <LessonFold id="independent" title="Independent lessons" note="Lessons that stand on their own, outside any course. Open them in any order.">
      <div className="lessons-grid">{projectIndependentLessons.map(s => <LessonCard key={s.id} lesson={s} progress={progress}/>)}</div>
    </LessonFold>}
  </>;
}

const isDone = (p: LessonProgressMap, id: string) => lessonState(p[id]).state === 'done';

/** One course: its levels (sections) → collapsible units → numbered lessons on a path,
 *  in recorded order. Lesson numbers count through the whole level, so "Lesson 5" matches
 *  the lesson page. "Up next" is the first lesson of the course not done yet; later
 *  not-started lessons are dimmed (still open-able: browsing stays free). */
function CourseOutline({ course, progress }: { course: Course; progress: LessonProgressMap }) {
  const all = course.sections.flatMap(sectionPlacements);
  const done = all.filter(p => isDone(progress, p.lesson.id)).length;
  // Partly done lessons count too, so one revealed answer already moves the course bar
  // and the label names lessons in progress (a bar stuck at 0 read as "nothing saved").
  const working = all.filter(p => lessonState(progress[p.lesson.id]).state === 'in-progress').length;
  const fraction = all.length ? all.reduce((sum, p) => sum + lessonState(progress[p.lesson.id]).fraction, 0) / all.length : 0;
  const next = all.find(p => !isDone(progress, p.lesson.id))?.lesson.id;
  const ids = all.map(p => p.lesson.id);
  const started = ids.some(id => progress[id]);
  return <LessonFold id={course.id} title={course.title} note={course.description} info={courseCaveat(course)}
    tools={started ? <ResetProgressButton label="Reset course progress" title={`Reset ${course.title}?`} description="Every lesson in this course goes back to not started. Lessons outside this course keep their progress." onReset={() => resetCourseProgress(ids)}/> : undefined}
    aside={<span className="lesson-course-progress"><small>{done} of {all.length} lessons done{working > 0 && ` · ${working} in progress`}</small><ProgressBar fraction={fraction}/></span>}>
    {course.sections.map(section => {
      const flat = sectionPlacements(section);
      return <div key={section.id} className="lessons-level">
        {course.sections.length > 1 && <h3>{section.title}<span className="lessons-level-count">{flat.length} {flat.length === 1 ? 'lesson' : 'lessons'}</span></h3>}
        {section.units.map((unit, u) => {
          const unitDone = unit.placements.filter(p => isDone(progress, p.lesson.id)).length;
          return <details key={unit.id} className="lessons-unit" open>
            <summary><h4><span className="lessons-unit-number">Unit {u + 1}</span>{unit.title}</h4><span className="lessons-unit-count">{unitDone} / {unit.placements.length}<ChevronDown aria-hidden="true"/></span></summary>
            <ol className="lessons-grid lessons-path">{unit.placements.map(p => <li key={p.id}>
              <LessonCard lesson={p.lesson} number={flat.indexOf(p) + 1} after={p.prerequisites} progress={progress} upNext={p.lesson.id === next}/>
            </li>)}</ol>
          </details>;
        })}
      </div>;
    })}
  </LessonFold>;
}

/** By topic: lessons under their primary registry topic; a topic filter also matches
 *  secondary topics, and a tag filter keeps only lessons carrying that exact tag. */
function TopicView({ category, tag, onSearch, progress }: { category: string | undefined; tag: string | undefined; onSearch: (next: LessonsNav) => void; progress: LessonProgressMap }) {
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
      <div className="lessons-grid">{g.lessons.map(s => <LessonCard key={s.id} lesson={s} progress={progress} onTag={t => onSearch(t === tag ? { view: 'topic', ...(category ? { category } : {}) } : { view: 'topic', ...(category ? { category } : {}), tag: t })} activeTag={tag}/>)}</div>
    </section>)}
  </>;
}

const kindLabel: Record<LessonSummary['kind'], string> = { character: 'Character', word: 'Word', phrase: 'Phrase', topic: 'Topic' };

/** Representative hanzi and colour family per topic, so topic lessons scan by subject
 *  instead of all wearing one book icon. Presentation only: the topic itself comes from
 *  the lesson's recorded classification. Unknown topics fall back to 课 in neutral. */
const TOPIC_MARKS: Record<string, [string, string]> = {
  'numbers-quantities': ['数', 'jade'], 'time-calendar': ['时', 'sky'], 'time-frequency-repetition': ['次', 'sky'],
  'family-relationships': ['家', 'amber'], 'people-identity': ['人', 'amber'], 'reference-questions': ['问', 'sky'],
  'food-drink': ['吃', 'rose'], 'school-language': ['学', 'violet'], 'work-jobs': ['工', 'violet'],
  'shopping-money': ['钱', 'jade'], 'home-objects': ['房', 'amber'], 'travel-transport': ['车', 'sky'],
  'health-wellbeing': ['病', 'rose'], 'animals-weather': ['天', 'jade'], 'daily-actions': ['做', 'amber'],
  'leisure-media': ['玩', 'rose'], 'places-directions': ['路', 'sky'], 'communication-social': ['说', 'violet'],
  'qualities-feelings': ['好', 'rose'], 'grammar-functions': ['的', 'violet'], 'abstract-concepts': ['想', 'violet'],
  'science-technology': ['电', 'sky'], 'society-government-law': ['国', 'amber'], 'vocabulary-grammar-patterns': ['词', 'violet'],
};

/** The card's box: headword when recorded, else the course number, else the topic mark. */
function LessonGlyph({ lesson, number }: { lesson: LessonSummary; number?: number | undefined }) {
  const mark = TOPIC_MARKS[lesson.primaryCategory?.id ?? ''] ?? ['课', 'neutral'];
  const tone = lesson.headword || number ? 'jade' : mark[1];
  return <span className={`lesson-index-glyph tone-${tone}`} aria-hidden="true">
    {lesson.headword ? <span lang="zh-CN">{lesson.headword.hanzi}</span> : number ? <span className="lesson-index-number">{number}</span> : <span lang="zh-CN">{mark[0]}</span>}
  </span>;
}

/**
 * One lesson card: glyph box, meta line (number/kind + progress state), title, subtitle,
 * then a footer pinned to the card bottom with the progress bar and up to three tags.
 * The whole card is one box so a grid row shares one height; the link covers the top
 * and tag buttons sit beside it (never nested interactive elements).
 * Inputs: `progress` (cookie map) gives the state; `upNext` highlights the course's next lesson.
 */
export function LessonCard({ lesson, number, after = [], onTag, activeTag, extra, progress, upNext = false }: { lesson: LessonSummary; number?: number; after?: LessonSummary[]; onTag?: (tag: string) => void; activeTag?: string | undefined; extra?: React.ReactNode; progress?: LessonProgressMap; upNext?: boolean }) {
  const { state, fraction } = lessonState(progress?.[lesson.id]);
  const stateLabel = state === 'done' ? 'Done' : state === 'in-progress' ? 'In progress' : upNext ? 'Up next' : '';
  const dim = number !== undefined && state === 'not-started' && !upNext && progress !== undefined;
  const tags = activeTag && lesson.tags.includes(activeTag) ? [activeTag, ...lesson.tags.filter(t => t !== activeTag)].slice(0, 3) : lesson.tags.slice(0, 3);
  return <div className={`lesson-index-item is-${state}${upNext ? ' is-next' : ''}${dim ? ' is-dim' : ''}`}>
    <Link to="/lessons/$lessonId" params={{ lessonId: lesson.id }} className="lesson-index-card">
      <LessonGlyph lesson={lesson} number={number}/>
      <span className="lesson-index-copy">
        <span className="lesson-index-meta">{number ? `Lesson ${number}` : kindLabel[lesson.kind]}{lesson.headword?.pinyin && <> · <span className="pinyin">{lesson.headword.pinyin}</span></>}{stateLabel && <> · <span className="lesson-state">{stateLabel}</span></>}</span>
        <strong>{lesson.title}</strong>
        {lesson.subtitle && <span className="lesson-index-subtitle"><LessonText text={lesson.subtitle}/></span>}
        {after.length > 0 && <small>After: {after.map(a => a.title).join(', ')}</small>}
        {extra}
      </span>
    </Link>
    <div className="lesson-index-foot">
      {progress && <ProgressBar fraction={fraction}/>}
      {onTag && tags.length > 0 && <div className="lesson-index-tags" aria-label={`Tags for ${lesson.title}`}>
        {tags.map(t => <button key={t} type="button" className={`lesson-tag-chip${activeTag === t ? ' is-active' : ''}`} aria-pressed={activeTag === t} onClick={() => onTag(t)}>#{t}</button>)}
      </div>}
    </div>
  </div>;
}

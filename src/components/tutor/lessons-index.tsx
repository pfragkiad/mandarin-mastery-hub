import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronDown, FlaskConical, Library, Search, Tags, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { lessonCategories, lessonSummaries, lessonSummary, type LessonSummary } from '@/lib/lessons';
import { courses, projectIndependentLessons, sectionPlacements, type Course } from '@/lib/lesson-curricula';
import { LessonText } from './lesson-text';
import { FilterSelect } from './filter-select';
import { useOneLineTitle } from './one-line-title';
import { levelFoldId, readLessonFolds, setLessonFold } from '@/lib/lesson-fold';
import { HintBody, SourceInfo } from './source-info';
import { continueLesson, lessonState, resetCourseProgress, useLessonProgress, type LessonProgressMap } from '@/lib/lesson-progress';
import { ResetProgressButton } from './reset-progress-button';
import { DraftFilterForm } from './filter-form';
import { LessonSearchResults, lessonScopeLabel, lessonScopes } from './lesson-search-results';
import { displaySubtitle, displayTags } from '@/lib/lesson-header-copy';

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
      Still being built: the HSK 3.0 Level 1 and Level 2 paths, a Conversational Mandarin course and two character lessons so far, all still drafts awaiting review. Levels 3 and above are not in the collection yet.
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
      filterFields={({ draft, patch }) => <FilterSelect ariaLabel="Search in" value={draft.scope} onValueChange={scope => patch({ scope })} items={[{ value: '', label: 'All lessons' }, ...lessonScopes.map(s => ({ value: s.id, label: s.label }))]} />}>
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

/** Remembered open/collapsed flag for one drawer. Course drawers start COLLAPSED on a
 *  first visit (the list is long); a level passes its own first-visit default. Afterwards
 *  the visitor's own fold/unfold choice is kept in localStorage per drawer id. Read after
 *  mount so server and first client render agree. */
function useLessonFold(id: string, fallback = false): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(fallback);
  useEffect(() => { setOpen(readLessonFolds()[id] ?? fallback); }, [id, fallback]);
  const update = (next: boolean) => { setOpen(next); setLessonFold(id, next); };
  return [open, update];
}

/** One foldable drawer (a course, or "Independent lessons"): collapsed by default,
 *  remembering the visitor's last choice. Native <details> keeps keyboard and screen
 *  reader support; onToggle fires for every open/close, so the choice is stored there.
 *  React also delivers a nested unit's toggle to this handler, so only this drawer's own
 *  toggle (target === currentTarget) is stored — a unit's arrow never folds the course.
 *  `tools` sits at the end of the note row (e.g. the course's Reset progress). */
function LessonFold({ id, title, shortTitle, note, info, aside, tools, children }: { id: string; title: string; shortTitle?: string | undefined; note?: string; info?: string; aside?: React.ReactNode; tools?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useLessonFold(id);
  return <details className="lessons-group lessons-course lessons-fold" open={open} onToggle={e => { if (e.target === e.currentTarget) setOpen(e.currentTarget.open); }}>
    <summary><FoldChevron/><FoldTitle id={`course-${id}`} title={title} shortTitle={shortTitle}/>{aside}</summary>
    {(note || tools) && <div className="lesson-fold-intro">
      {note && <p className="lesson-note">{note}{info && <> <SourceInfo className="lesson-course-info" inline>{info}</SourceInfo></>}</p>}
      {tools}
    </div>}
    {children}
  </details>;
}

/** The open/closed arrow of a course or level drawer. It sits in its own grid column beside
 *  the title, centred on the title's first line, so a long title wraps beside it instead of
 *  leaving the arrow alone on a line; it turns down when the drawer is open (CSS). */
function FoldChevron() {
  return <span className="lessons-fold-chevron" aria-hidden="true"><ChevronDown/></span>;
}

/** A course drawer's title: shrunk slightly (down to 16px) when that keeps it on one line,
 *  otherwise left at its stylesheet size to wrap (owner's choice: smaller only if it fits).
 *  On narrow drawers a recorded short title (course.shortTitle) replaces the full one so
 *  the heading stays on one line; the full title is kept for screen readers and wide
 *  screens. The one-line fit measures whichever span is visible (the hidden one has no
 *  width in the clone), so crossing the narrow threshold re-fits automatically. */
function FoldTitle({ id, title, shortTitle }: { id: string; title: string; shortTitle?: string | undefined }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useOneLineTitle(ref, title, { minSize: 16, onlyIfFits: true });
  return <h2 ref={ref} id={id}>
    <span className="fold-title-full">{title}</span>
    {shortTitle && <span className="fold-title-short" aria-hidden="true">{shortTitle}</span>}
  </h2>;
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
const courseCaveat = (c: Course) => {
  if (!(c.kind.toLowerCase().includes('hsk') || c.id.startsWith('hsk'))) return 'A suggested order. Lessons can be opened in any order.';
  // Name the levels the course's own sections record (Level 1 and Level 2 are sections of one course).
  const levels = c.sections.flatMap(s => s.level == null ? [] : [s.level]);
  return `A suggested order for learning the ${levels.length ? `Level ${levels.join(' and ')} ` : 'HSK '}words. It is not an official HSK sequence.`;
};

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
  return <LessonFold id={course.id} title={course.title} shortTitle={course.shortTitle} note={course.description} info={courseCaveat(course)}
    tools={started ? <ResetProgressButton label="Reset course progress" title={`Reset ${course.title}?`} description="Every lesson in this course goes back to not started. Lessons outside this course keep their progress." onReset={() => resetCourseProgress(ids)}/> : undefined}
    aside={<span className="lesson-course-progress"><small>{done} of {all.length} lessons done{working > 0 && ` · ${working} in progress`}</small><ProgressBar fraction={fraction}/></span>}>
    {course.sections.map(section => {
      const flat = sectionPlacements(section);
      const units = <LevelUnits section={section} flat={flat} progress={progress} next={next}/>;
      // A one-level course shows its units directly; each level of a multi-level course
      // (HSK Level 1, Level 2…) is its own drawer, since each is a large body of study.
      return course.sections.length > 1
        ? <LevelFold key={section.id} id={levelFoldId(course.id, section.id)} section={section} flat={flat} progress={progress} defaultOpen={flat.some(p => p.lesson.id === next)}>{units}</LevelFold>
        : <div key={section.id} className="lessons-level">{units}</div>;
    })}
  </LessonFold>;
}

type Section = Course['sections'][number];
type Placement = ReturnType<typeof sectionPlacements>[number];

/** One level's units (each a collapsible <details>, open by default) → numbered lessons on
 *  a path. Inputs: the level, its placements in order (`flat`, which numbers the lessons
 *  through the whole level), progress, and the course's "up next" lesson id. */
function LevelUnits({ section, flat, progress, next }: { section: Section; flat: Placement[]; progress: LessonProgressMap; next: string | undefined }) {
  return <>{section.units.map((unit, u) => {
    const unitDone = unit.placements.filter(p => isDone(progress, p.lesson.id)).length;
    return <details key={unit.id} className="lessons-unit" open>
      <summary><h4><span className="lessons-unit-number">Unit {u + 1}</span>{unit.title}</h4><span className="lessons-unit-count">{unitDone} / {unit.placements.length}<ChevronDown aria-hidden="true"/></span></summary>
      <ol className="lessons-grid lessons-path">{unit.placements.map(p => <li key={p.id}>
        <LessonCard lesson={p.lesson} number={flat.indexOf(p) + 1} after={p.prerequisites} progress={progress} upNext={p.lesson.id === next}/>
      </li>)}</ol>
    </details>;
  })}</>;
}

/** One level of a multi-level course as its own remembered drawer, with that level's
 *  lessons-done count and bar in the heading. First visit: only the level holding the
 *  course's "up next" lesson starts open (`defaultOpen`). As with the course drawer, only
 *  this element's own toggle is stored, so a unit's arrow never folds the level. */
function LevelFold({ id, section, flat, progress, defaultOpen, children }: { id: string; section: Section; flat: Placement[]; progress: LessonProgressMap; defaultOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useLessonFold(id, defaultOpen);
  const done = flat.filter(p => isDone(progress, p.lesson.id)).length;
  const fraction = flat.length ? flat.reduce((sum, p) => sum + lessonState(progress[p.lesson.id]).fraction, 0) / flat.length : 0;
  return <details className="lessons-level lessons-level-fold" open={open} onToggle={e => { if (e.target === e.currentTarget) setOpen(e.currentTarget.open); }}>
    <summary>
      <FoldChevron/>
      <h3>{section.title}<span className="lessons-level-count">{flat.length} {flat.length === 1 ? 'lesson' : 'lessons'}</span></h3>
      <span className="lesson-course-progress"><small>{done} of {flat.length} done</small><ProgressBar fraction={fraction}/></span>
    </summary>
    {children}
  </details>;
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
      <FilterSelect ariaLabel="Filter lessons by topic" value={category ?? ''} onValueChange={v => onSearch({ view: 'topic', ...(v ? { category: v } : {}), ...(tag ? { tag } : {}) })} items={[{ value: '', label: `All topics · ${lessonSummaries.length}` }, ...used.map(c => ({ value: c.id, label: `${c.label} · ${lessonSummaries.filter(s => inTopic(s, c.id)).length}` }))]} />
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

/** The card's box: headword when recorded, else the course number, else the lesson's recorded
 *  icon_glyph, else the topic mark (the colour always follows the topic). */
function LessonGlyph({ lesson, number }: { lesson: LessonSummary; number?: number | undefined }) {
  const mark = TOPIC_MARKS[lesson.primaryCategory?.id ?? ''] ?? ['课', 'neutral'];
  const tone = lesson.headword || number ? 'jade' : mark[1];
  return <span className={`lesson-index-glyph tone-${tone}`} aria-hidden="true">
    {lesson.headword ? <span lang="zh-CN">{lesson.headword.hanzi}</span> : number ? <span className="lesson-index-number">{number}</span> : <span lang="zh-CN">{lesson.iconGlyph ?? mark[0]}</span>}
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
  // Content tags only (lesson-header-copy.ts drops course/level/format tags); an active tag
  // filter keeps its own chip first so the learner can see and clear it.
  const shown = displayTags(lesson.tags, Infinity);
  const tags = activeTag && lesson.tags.includes(activeTag) ? [activeTag, ...shown.filter(t => t !== activeTag)].slice(0, 3) : shown.slice(0, 3);
  const subtitle = displaySubtitle(lesson.subtitle);
  return <div className={`lesson-index-item is-${state}${upNext ? ' is-next' : ''}${dim ? ' is-dim' : ''}`}>
    <Link to="/lessons/$lessonId" params={{ lessonId: lesson.id }} className="lesson-index-card">
      <LessonGlyph lesson={lesson} number={number}/>
      <span className="lesson-index-copy">
        <span className="lesson-index-meta">{number ? `Lesson ${number}` : kindLabel[lesson.kind]}{lesson.headword?.pinyin && <> · <span className="pinyin">{lesson.headword.pinyin}</span></>}{stateLabel && <> · <span className="lesson-state">{stateLabel}</span></>}</span>
        <strong>{lesson.title}</strong>
        {subtitle && <span className="lesson-index-subtitle"><LessonText text={subtitle}/></span>}
        {after.length > 0 && <small>After: {after.map(a => a.title).join(', ')}</small>}
        {extra}
      </span>
    </Link>
    <div className="lesson-index-foot">
      <LessonFacts lesson={lesson} done={state === 'done' ? lesson.checkpoints.required : progress?.[lesson.id]?.answered.length}/>
      {progress && <ProgressBar fraction={fraction}/>}
      {onTag && tags.length > 0 && <div className="lesson-index-tags" aria-label={`Tags for ${lesson.title}`}>
        {tags.map(t => <button key={t} type="button" className={`lesson-tag-chip${activeTag === t ? ' is-active' : ''}`} aria-pressed={activeTag === t} onClick={() => onTag(t)}>#{t}</button>)}
      </div>}
    </div>
  </div>;
}

/** "25 min · 18 tasks" (or "4/18 tasks" once started), from the lesson's recorded estimate and
 *  required checkpoints; optional ones read "+3 bonus". Hidden when neither is recorded. */
function LessonFacts({ lesson, done }: { lesson: LessonSummary; done: number | undefined }) {
  const { required, optional } = lesson.checkpoints;
  const parts = [
    lesson.estimatedMinutes ? `${lesson.estimatedMinutes} min` : '',
    required ? `${done ? `${Math.min(done, required)}/` : ''}${required} ${required === 1 ? 'task' : 'tasks'}` : '',
    optional ? `+${optional} bonus` : '',
  ].filter(Boolean);
  return parts.length ? <span className="lesson-index-facts">{parts.join(' · ')}</span> : null;
}

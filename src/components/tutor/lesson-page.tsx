import { wordHskPill } from './word-identity-pills';
import { LessonFitGrid } from './lesson-fit-grid';
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { lessonState, type LessonProgressEntry, markLessonCompleted, markLessonOpened, markQuestionAnswered, resetLesson, resetLessonTasks, restoreLesson, snapshotLesson, unmarkCheckpoint, useLessonProgress } from '@/lib/lesson-progress';
import { toast } from 'sonner';
import { restoredFaceView } from '@/lib/face-view';
import { blurredPieceAt, REVEALED_ATTR } from '@/lib/lesson-reveal';
import { CharacterHintsToggle } from './face-toggles';
import { PhoneLessonBar, SidebarProgress, StudyToggles, type ProgressNumbers, type SectionLink, type StudyView } from './lesson-controls';
import { checkpointLabel, migrateLegacyKeys, planCheckpoints, type CheckpointPlan, type LessonCheckpoint } from '@/lib/lesson-checkpoints';
import { ResetProgressButton } from './reset-progress-button';

/** Progress hook for QuestionCards and "Show answer" reveals: each reports its key once answered or opened. */
const QuestionProgress = createContext<{ answer: (key: string) => void } | null>(null);
/** Manual checkpoints (Core v3.3): the page's plan, the completed checkpoint IDs and a toggle,
 *  read by the "Mark as done" ticks on pattern cards, at section ends and in the finish box. */
/** The lesson whose fold-out panels RememberedDetails records (lesson-view-state.ts). */
const LessonViewId = createContext<string | null>(null);
const CheckpointTicks = createContext<{ plan: CheckpointPlan; done: ReadonlySet<string>; toggle: (c: LessonCheckpoint) => void } | null>(null);
import { Link, useNavigate } from '@tanstack/react-router';
import { levelFoldId, setLessonFold } from '@/lib/lesson-fold';
import { readLessonView, saveLessonView, setLessonPanel } from '@/lib/lesson-view-state';
import { ArrowLeft, ArrowRight, BookText, Check, CheckCircle2, ChevronDown, ExternalLink, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { detailTrail } from '@/lib/detail-trail';
import { parseAnswerLines } from '@/lib/lesson-answer';
import { correctLessonChoices, lessonCharacterRefs, syllabusEntryFor, type PlanLine, type TopicExample, type TopicVocabItem, type LessonBlock, type LessonChoice, type LessonDocument, type LessonPreference, type LessonQuestion, type LessonSummary, type LessonVocabItem } from '@/lib/lessons';
import { LessonHeadword, LessonPairedLine, LessonPatternLine, LessonTerm, LessonText, LessonWord } from './lesson-text';
import { positionsOf, type LessonPosition } from '@/lib/lesson-curricula';
import type { Word } from '@/lib/mandarin';
import { WordIdentityPills } from './word-identity-pills';
import { wordInk } from '@/lib/card-ink';
import { SentenceExample } from './sentence-example';
import { LessonHintsGate, LessonHintsProvider } from './lesson-hints';
import { Switch } from '@/components/ui/switch';
import { useWorkspace } from './workspace';
import { displayDescription, displaySubtitle, displayTags } from '@/lib/lesson-header-copy';

/**
 * One study lesson page, rendered entirely from its JSON document (src/lib/lessons.ts),
 * so every lesson shares this template whatever its kind (character, word, phrase or
 * topic lesson; the headword box appears only when a headword is recorded).
 *
 * Inputs: `lesson` — the loaded document; `priority` / `onPriority` — the URL-backed
 * vocabulary priority filter (A/B/C or all). The Hanzi · Pinyin · EN buttons (shared FaceToggles)
 * are the remembered `lessonFaces` preference, apart from the grids' own; hidden pieces blur and
 * clear one at a time on click (revealClick). Local state: each practice card's revealed answer
 * (reset when the page is left). The
 * "Character hints" side switch is the remembered `lessonHints` preference (absent = on);
 * it drives LessonHintsProvider live (lesson-hints.tsx).
 *
 * Narrow layout (the page's own width ≤ 680px, the same threshold as its container
 * queries — a layout condition, never a device): the mobile prototype's design in the
 * site's styling. Sections become collapsible cards (the first open), the section list
 * becomes a sticky row of pills that opens and scrolls to its section, and the Pinyin /
 * Character hints controls float bottom-right (rendered outside .lesson-page, whose
 * container query makes it the containing block of fixed children). Wide layouts keep
 * the side list and always-open sections; Comfortable only enlarges text (styles.css).
 * The pill / side-list highlight follows the section under the sticky header.
 *
 * Sections follow the schema order and appear only when they carry content (disabled
 * sections, empty lists and editorial-only extensions are skipped). v2.6 selection
 * questions are graded only through their recorded correct_choice_ids; older and
 * open-ended questions reveal their recorded answer text without grading.
 *
 * Topic lessons (lesson.topic, schema v3) replace the character-lesson overview and
 * priority vocabulary with: key sentences (featured_example_ids), words with their own
 * examples, usage notes (grammar_points, each with its recorded example) and related words.
 * Each word's headword links to — and speaks with — the one Vocabulary record that shares
 * its recorded HSK entry number and headword (syllabusEntryFor); no match stays plain.
 * v3.1 topic lessons (topic.plan, sections.teaching_plan) instead follow the teaching path:
 * conversation, patterns, guided substitutions, reading, speaking, pitfalls/pronunciation,
 * applied checks and review, with the words as a collapsed word bank (no repeated source
 * examples) and the word-recall questions as an optional quiz.
 * Every v3 lesson also shows its learning objectives, and a lesson placed in a course shows
 * where it sits there (CoursePosition) with Previous/Next inside that level.
 */

const kindLabel: Record<LessonSummary['kind'], string> = { character: 'Character lesson', word: 'Word lesson', phrase: 'Phrase lesson', topic: 'Topic lesson' };
/** Kind label; general lessons with lesson_type "dialogue" read as conversation lessons. */
const lessonLabel = (summary: LessonSummary) => summary.kind === 'topic' && summary.lessonType === 'dialogue' ? 'Conversation lesson' : kindLabel[summary.kind];
const mappingLabel: Record<string, string> = { same_written_form: 'Same form in both scripts', one_to_one: 'One traditional form', context_dependent: 'Traditional form depends on context', multiple_targets: 'Several traditional forms' };
/** snake_case enum values read as plain words ("compositional_frequency_phrase" → "compositional frequency phrase"). */
const plain = (value: string) => value.replace(/_/g, ' ');

type SectionDef = { id: string; title: string; hint: string; body: ReactNode };

/** Progress section_key → the page section that renders it, for every lesson family (topic
 *  plans, general lessons, character lessons). Keys whose section is not on the page put
 *  their tick in the finish box (planCheckpoints), so no lesson is left uncompletable. */
const SECTION_KEYS: Record<string, string> = {
  dialogue: 'conversation', patterns: 'patterns', 'guided-building': 'build', reading: 'reading', speaking: 'speaking',
  pitfall: 'watch-out', pronunciation: 'watch-out', review: 'review', practice: 'practice',
  introduction: 'about', grammar: 'block-patterns',
  overview: 'overview', vocabulary: 'vocabulary', constructions: 'constructions', examples: 'examples', contrasts: 'contrasts',
  mistakes: 'mistakes', historical: 'historical', extensions: 'more',
};

/** Matches the `@container lesson-page (max-width: 680px)` rules in styles.css. Chosen so the
 *  side panel stays while the reading column beside it keeps roughly 440px or more. */
const NARROW_MAX = 680;
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** True while the element's own content width is at most NARROW_MAX (ResizeObserver; false where unavailable). */
function useNarrowLesson(ref: RefObject<HTMLElement | null>) {
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = (width: number) => setNarrow(width <= NARROW_MAX);
    update(el.clientWidth);
    const ro = new ResizeObserver(entries => { const e = entries[0]; if (e) update(e.contentRect.width); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return narrow;
}

/** Id of the last section whose top has passed below the sticky header (scroll position), or the first. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  const key = ids.join(' ');
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      let current = ids[0] ?? null;
      for (const id of ids) {
        const el = document.getElementById(`lesson-${id}`);
        if (el && el.getBoundingClientRect().top <= 150) current = id;
      }
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (frame) cancelAnimationFrame(frame); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return active;
}

export function LessonPage({ lesson, priority, onPriority }: { lesson: LessonDocument; priority: 'A' | 'B' | 'C' | undefined; onPriority: (value: 'A' | 'B' | 'C' | undefined) => void }) {
  const { summary, sections: S, headword, intro } = lesson;
  // Progress. Core v3.3 lessons record their own checkpoints (lesson.progress): the page maps
  // each to the question/reveal/speaking task it targets, or to a "Mark as done" tick, through
  // planCheckpoints once the sections are known (below). Older lessons keep page task keys:
  // every question plus, in topic plans, every "Show answer" reveal.
  const contract = lesson.progress;
  const targetCheckpoint = new Map((contract ?? []).flatMap(s => s.checkpoints.flatMap(c => c.targetId ? [[c.targetId, c] as const] : [])));
  const allQuestions = S.practice?.enabled ? S.practice.questions : [];
  const planTasks = lesson.topic?.plan;
  // Reveal keys: the recorded item ID when present (v3.3), else the older positional key.
  const buildKey = (x: { id: string }, i: number) => x.id || `build-${i + 1}`;
  const readingKey = (q: { id: string }, i: number) => q.id || `reading-${i + 1}`;
  const speakingKey = (t: { id: string }, i: number) => contract && t.id ? t.id : `speaking-${t.id || i + 1}`;
  const revealIds = planTasks ? [
    ...planTasks.guided_building.substitutions.map(buildKey),
    ...planTasks.reading.questions.map(readingKey),
    ...planTasks.speaking_tasks.map(speakingKey),
  ] : [];
  const requiredIds = [...allQuestions.map(q => q.id), ...revealIds];
  // Saved keys from before the contract → the item they stood for (for migrateLegacyKeys).
  const legacyTarget = new Map<string, string>(planTasks ? [
    ...planTasks.guided_building.substitutions.map((x, i) => [`build-${i + 1}`, x.id] as [string, string]),
    ...planTasks.reading.questions.map((q, i) => [`reading-${i + 1}`, q.id] as [string, string]),
    ...planTasks.speaking_tasks.map((t, i) => [`speaking-${t.id || i + 1}`, t.id] as [string, string]),
  ] : []);
  for (const q of allQuestions) legacyTarget.set(q.id, q.id);
  // Topic plans split questions: checkpoint lessons by the recorded optional flag (bonus quiz),
  // older lessons by the applied- prefix (the Review section's word recall quiz).
  const isOptionalQuestion = (q: LessonQuestion) => contract ? Boolean(targetCheckpoint.get(q.id)?.optional) : !q.id.startsWith('applied-');
  const reviewQuestion = (key: string) => Boolean(planTasks) && allQuestions.some(q => q.id === key && isOptionalQuestion(q));
  const required = useRef(new Set<string>()); required.current = new Set(requiredIds);
  const planRef = useRef<CheckpointPlan | null>(null);
  const progress = useRef({ answer: (k: string) => {
    const plan = planRef.current;
    if (plan) { const c = plan.auto.get(k); if (c) markQuestionAnswered(summary.id, c.id, c.optional); return; }
    if (required.current.has(k)) markQuestionAnswered(summary.id, k);
  } }).current;
  const progressEntry = useLessonProgress()[summary.id];
  // A reset remounts the lesson body, closing every reveal and clearing picked answers.
  const [round, setRound] = useState(0);
  // Every reset snapshots first and offers Undo in a toast for 10 seconds (designer's proposal).
  const undoToast = (message: string, snapshot: ReturnType<typeof snapshotLesson>) => toast(message, { duration: 10000, action: { label: 'Undo', onClick: () => restoreLesson(summary.id, snapshot) } });
  const restart = () => { const snapshot = snapshotLesson(summary.id); resetLesson(summary.id); saveLessonView(summary.id, 'panels', []); setRound(r => r + 1); undoToast('Lesson progress reset', snapshot); };
  const lessonDone = Boolean(progressEntry?.completed);
  // Complete lesson marks it done and returns to where it is listed: its course (the drawer
  // and its level are opened first so they show unfolded), or the topic view of its main topic.
  const navigate = useNavigate();
  const complete = () => {
    markLessonCompleted(summary.id);
    const position = positionsOf(summary.id)[0];
    // Open the course and the lesson's own level, so the learner lands on the path they left.
    if (position) { setLessonFold(position.course.id, true); setLessonFold(levelFoldId(position.course.id, position.section.id), true); void navigate({ to: '/lessons' }); }
    else void navigate({ to: '/lessons', search: summary.primaryCategory ? { view: 'topic', category: summary.primaryCategory.id } : { view: 'topic' } });
  };
  const { preferences, setPreferences, items } = useWorkspace();
  // Hanzi · Pinyin · EN (shared FaceToggles), remembered as the lesson's own choice, apart from
  // the grids' Hide setting. Hidden faces blur until hovered or focused: "translations" covers
  // English renderings of Chinese (sentence translations, word/term meanings) while instructions
  // and explanations stay readable; "hanzi" covers recorded Chinese lines and terms, not hanzi
  // quoted inside English prose.
  const faces = restoredFaceView(preferences.lessonFaces);
  const hidePinyin = !faces.pinyin, hideTranslations = !faces.translations, hideHanzi = !faces.hanzi;
  const topic = lesson.topic;
  // Exact Vocabulary records for this topic lesson's words (HSK entry number + headword).
  const recordFor = (item: TopicVocabItem): Word | null => syllabusEntryFor(item, items.flatMap(w => w.entry ? [{ id: w.id, simplified: w.entry.simplified, entryKind: w.entry.entryKind, hskVersion: w.entry.hskVersion, hsk_index: w.entry.hsk_index, word: w }] : []))?.word ?? null;
  const positions = positionsOf(summary.id);
  const pageRef = useRef<HTMLDivElement>(null);
  const narrow = useNarrowLesson(pageRef);
  const hintsOn = preferences.lessonHints !== false;
  const learnerExtensions = (S.extensions?.items ?? []).filter(item => item.visibility === 'learner' && item.blocks.length > 0);
  // A hint card's "Open full card" records its own Back step; start clean here so
  // a stale step from an earlier window never offers a wrong Back (as Practice does).
  useEffect(() => { detailTrail.clear(); }, []);
  const sourceById = new Map((S.sources?.items ?? []).map(s => [s.id, s]));

  const sections: SectionDef[] = [];
  const overview = S.overview;
  if (!topic && (overview || headword)) sections.push({ id: 'overview', title: 'At a glance', hint: 'Key facts and the meaning map', body: <>
    {overview?.core_takeaway && <p className="lesson-lead"><LessonText text={overview.core_takeaway}/></p>}
    <dl className="lesson-facts">
      {headword?.simplified && <div><dt>Simplified</dt><dd><LessonTerm hanzi={headword.simplified} pinyin={headword.pinyin}/></dd></div>}
      {headword?.traditional?.length ? <div><dt>Traditional</dt><dd className="lesson-fact-terms">{headword.traditional.map(t => <LessonTerm key={t.hanzi} hanzi={t.hanzi} pinyin={t.pinyin}/>)}</dd></div> : null}
      {headword?.mapping_type && <div><dt>Script forms</dt><dd>{mappingLabel[headword.mapping_type] ?? plain(headword.mapping_type)}</dd></div>}
      {headword?.readings?.length ? <div className="is-wide"><dt>Readings</dt><dd>{headword.readings.map(r => <p key={r.pinyin}><span className="pinyin">{r.pinyin}</span> · <LessonText text={r.context}/></p>)}</dd></div> : null}
      {overview?.independent_usage && <div className="is-wide"><dt>On its own</dt><dd><LessonText text={overview.independent_usage}/></dd></div>}
      {overview?.modern_roles?.length ? <div className="is-wide"><dt>Modern roles</dt><dd><ul className="lesson-chips">{overview.modern_roles.map(r => <li key={r}><LessonText text={r}/></li>)}</ul></dd></div> : null}
      {overview?.teaching_priority && <div className="is-wide"><dt>Teaching priority</dt><dd><LessonText text={overview.teaching_priority}/></dd></div>}
    </dl>
    {overview?.one_minute_explanation && <div className="lesson-card lesson-minute"><h3>In one minute</h3><p><LessonText text={overview.one_minute_explanation}/></p></div>}
    {overview?.meaning_map?.length ? <><h3 className="lesson-subheading">Reading and meaning map</h3><div className="lesson-grid">{overview.meaning_map.map(m => <div key={m.id} className="lesson-card">
      <div className="lesson-card-top"><span className="pinyin">{m.reading}</span><span className="lesson-register"><LessonText text={m.register}/></span></div>
      <p className="lesson-card-title"><LessonText text={m.function_en}/></p>
      {m.example && <LessonTerm hanzi={m.example.hanzi} pinyin={m.example.pinyin} meaning={m.example.meaning_en}/>}
      {m.evidence && <p className="lesson-footnote">{sourceById.get(m.evidence)?.title ?? m.evidence}</p>}
    </div>)}</div></> : null}
  </> });

  const plan = topic?.plan ?? null;
  if (topic && plan) {
    // v3.1 teaching path, in the generator's order (core/generate_lesson.py render_topic_v31).
    // The words' own source examples stay on their Vocabulary cards and are not repeated here.
    const p = plan;
    const questions = S.practice?.enabled ? S.practice.questions : [];
    const applied = questions.filter(q => !isOptionalQuestion(q));
    const recall = questions.filter(q => isOptionalQuestion(q));
    // Review words resolve only through a recorded syllabus entry ID on this lesson's own words.
    const byEntry = new Map(topic.items.flatMap(item => item.syllabus_refs.map(ref => [ref.entry_id, item] as const)));
    const reviewWords = p.review.entry_ids.flatMap(id => { const item = byEntry.get(id); return item ? [item] : []; });
    if (p.dialogue.turns.length) sections.push({ id: 'conversation', title: 'Conversation', hint: p.dialogue.title, body: <>
      {p.dialogue.context_en && <p className="lesson-note"><LessonText text={p.dialogue.context_en}/></p>}
      <DialogueTurns turns={p.dialogue.turns}/>
    </> });
    if (p.patterns.length) sections.push({ id: 'patterns', title: 'How the language works', hint: count(p.patterns.length, 'pattern'), body: <div className="lesson-stack">
      {p.patterns.map(pat => <div key={pat.id} className="lesson-card lesson-pattern">
        <p className="lesson-card-title"><LessonText text={pat.title}/></p>
        <p className="lesson-muted"><LessonText text={pat.explanation_en}/></p>
        {pat.formula_en && <p className="lesson-formula"><LessonText text={pat.formula_en}/></p>}
        <div className="lesson-stack">{pat.examples.map((e, i) => <PlanSentence key={i} line={e}/>)}</div>
        <CardTick target={pat.id}/>
      </div>)}
    </div> });
    if (p.guided_building.substitutions.length) sections.push({ id: 'build', title: 'Build new sentences', hint: count(p.guided_building.substitutions.length, 'change'), body: <>
      <p className="lesson-note"><LessonText text={p.guided_building.instruction_en}/></p>
      <div className="lesson-card lesson-task"><p className="lesson-task-label">Worked model</p><PlanSentence line={p.guided_building.model}/></div>
      <div className="lesson-stack">{p.guided_building.substitutions.map((x, i) => <div key={i} className="lesson-card lesson-task">
        <p className="lesson-card-title">Change {i + 1}: <LessonText text={x.cue_en}/></p>
        <Reveal label="Show a model answer" progressKey={buildKey(x, i)}><PlanSentence line={x.model_answer}/></Reveal>
      </div>)}</div>
    </> });
    if (p.reading.paragraphs.length) sections.push({ id: 'reading', title: 'Read for meaning', hint: p.reading.title, body: <>
      <p className="lesson-note">Read the passage, then answer in English or Mandarin.</p>
      <div className="lesson-stack">{p.reading.paragraphs.map((e, i) => <div key={i} className="lesson-card"><PlanSentence line={e}/></div>)}</div>
      <div className="lesson-stack">{p.reading.questions.map((q, i) => <div key={i} className="lesson-card lesson-task">
        <p className="lesson-card-title">{i + 1}. <LessonText text={q.prompt_en}/></p>
        <Reveal label="Show the answer" progressKey={readingKey(q, i)}><p><LessonText text={q.answer_en}/></p></Reveal>
      </div>)}</div>
    </> });
    if (p.speaking_tasks.length) sections.push({ id: 'speaking', title: 'Speak and personalise', hint: count(p.speaking_tasks.length, 'task'), body: <>
      <p className="lesson-note">Answer aloud before opening the model, and adapt it to your own life.</p>
      <div className="lesson-stack">{p.speaking_tasks.map((t, i) => <div key={t.id || i} className="lesson-card lesson-task">
        <p className="lesson-card-title">{i + 1}. <LessonText text={t.scenario_en}/></p>
        <Reveal label="Show one possible answer" progressKey={speakingKey(t, i)}><PlanSentence line={t.model_answer}/></Reveal>
      </div>)}</div>
    </> });
    if (p.common_pitfall || p.pronunciation_focus) sections.push({ id: 'watch-out', title: 'Watch out', hint: 'A common pitfall and pronunciation', body: <div className="lesson-grid">
      {p.common_pitfall && <div className="lesson-card"><h3>Common pitfall</h3><p><LessonText text={p.common_pitfall}/></p></div>}
      {p.pronunciation_focus && <div className="lesson-card"><h3>Pronunciation</h3><p><LessonText text={p.pronunciation_focus}/></p></div>}
    </div> });
    if (applied.length) sections.push({ id: 'practice', title: 'Check what you can do', hint: count(applied.length, 'question'), body: <div className="lesson-stack">{applied.map((q, i) => <QuestionCard key={q.id} question={q} index={i + 1}/>)}</div> });
    if (p.review.can_do.length || topic.items.length) sections.push({ id: 'review', title: 'Review', hint: 'What you can do now', body: <>
      {p.review.can_do.length > 0 && <ul className="lesson-objectives">{p.review.can_do.map(x => <li key={x}><LessonText text={x}/></li>)}</ul>}
      {reviewWords.length > 0 && <><h3 className="lesson-subheading">Words to review</h3><LessonFitGrid className="lesson-grid lesson-vocab-grid">{reviewWords.map(item => <WordBankCard key={item.id} item={item} record={recordFor(item)}/>)}</LessonFitGrid></>}
      {topic.items.length > 0 && <RememberedDetails panel="word-bank" className="lesson-details">
        <summary>Word bank ({topic.items.length}) — examples are on each Vocabulary card</summary>
        <LessonFitGrid className="lesson-grid lesson-vocab-grid">{topic.items.map(item => <WordBankCard key={item.id} item={item} record={recordFor(item)}/>)}</LessonFitGrid>
      </RememberedDetails>}
      {recall.length > 0 && <RememberedDetails panel="recall-quiz" className="lesson-details">
        <summary>Optional word recall quiz ({recall.length}){contract && (() => { const n = recall.filter(q => { const c = targetCheckpoint.get(q.id); return c && progressEntry?.bonus?.includes(c.id); }).length; return n > 0 ? ` · ${n} bonus done` : ''; })()}</summary>
        <div className="lesson-stack">{recall.map((q, i) => <QuestionCard key={q.id} question={q} index={i + 1}/>)}</div>
      </RememberedDetails>}
    </> });
  } else if (topic) {
    const byId = new Map(topic.items.flatMap(item => item.examples.map(e => [e.id, { example: e, item }] as const)));
    const featured = (Array.isArray((S as Record<string, unknown>)['featured_example_ids']) ? (S as Record<string, unknown>)['featured_example_ids'] as string[] : []).flatMap(id => { const hit = byId.get(id); return hit ? [hit] : []; });
    if (featured.length) sections.push({ id: 'key-sentences', title: 'Key sentences', hint: count(featured.length, 'sentence'), body: <div className="lesson-stack">
      {featured.map(({ example }) => <TopicSentence key={example.id} example={example}/>)}
    </div> });
    if (topic.items.length) sections.push({ id: 'vocabulary', title: 'Words and examples', hint: count(topic.items.length, 'word'), body: <>
      <p className="lesson-note">Each word links to its Vocabulary card. Listen, then read its example sentences.</p>
      <div className="lesson-stack">{topic.items.map(item => <TopicWordCard key={item.id} item={item} record={recordFor(item)}/>)}</div>
    </> });
    if (topic.grammar.length) sections.push({ id: 'grammar', title: 'How it is used', hint: count(topic.grammar.length, 'usage note'), body: <div className="lesson-stack">
      {topic.grammar.map(g => <div key={g.id} className="lesson-card">
        <p className="lesson-card-title"><LessonText text={g.title}/></p>
        <p className="lesson-muted"><LessonText text={g.explanation}/></p>
        {g.example && <SentenceExample sentence={g.example.hanzi} pinyin={g.example.pinyin} translation={g.example.english} heading=""/>}
      </div>)}
    </div> });
    if (topic.related.length) sections.push({ id: 'related', title: 'Related words', hint: count(topic.related.length, 'word'), body: <LessonFitGrid className="lesson-grid lesson-vocab-grid">
      {topic.related.map(item => { const record = recordFor(item); return <div key={item.id} className="lesson-card lesson-vocab lesson-bank-word"><div className="lesson-bank-top"><HeaderStrut/>{record && <WordIdentityPills word={record}/>}</div><LessonWord hanzi={item.hanzi} pinyin={item.pinyin} meaning={item.meaning_en} record={record} tile inkClass={wordInk(record ?? { hanzi: item.hanzi })}/></div>; })}
    </LessonFitGrid> });
  }

  // General lessons (e.g. Conversational Mandarin dialogue lessons): blocks in recorded order.
  // Consecutive explanations open the lesson as "About this lesson"; each other block is its own section.
  const blocks = S.blocks ?? [];
  // Only the leading run of explanations opens the lesson; a later one (e.g. a guided speaking
  // brief) is its own section, titled by the progress section that targets it.
  const firstOther = blocks.findIndex(b => b.kind !== 'explanation');
  const introBlocks = (firstOther < 0 ? blocks : blocks.slice(0, firstOther)).flatMap(b => b.kind === 'explanation' ? [b] : []);
  const laterNotes = (firstOther < 0 ? [] : blocks.slice(firstOther)).flatMap(b => b.kind === 'explanation' ? [b] : []);
  if (introBlocks.length) sections.push({ id: 'about', title: 'About this lesson', hint: 'What this lesson is based on', body: <>{introBlocks.map(b => <p key={b.id} className="lesson-note"><LessonText text={b.text}/></p>)}</> });
  for (const b of blocks) {
    if (b.kind === 'dialogue' && b.turns.length) sections.push({ id: `block-${b.id}`, title: b.title || 'Conversation', hint: count(b.turns.length, 'line'), body: <DialogueTurns turns={b.turns}/> });
  }
  const patterns = blocks.flatMap(b => b.kind === 'grammar_pattern' ? [b] : []);
  // A pattern card shows the formula, its function, then the example. When a file records the
  // example sentence itself as the formula (or the function verbatim as the teaching note), that
  // duplicate is shown once only — the recorded fields are untouched, only the repeat is hidden.
  if (patterns.length) sections.push({ id: 'block-patterns', title: 'Patterns', hint: count(patterns.length, 'pattern'), body: <div className="lesson-stack">{patterns.map(g => <div key={g.id} className="lesson-card lesson-pattern">
    {g.pattern_hanzi.trim() !== g.example.hanzi.trim() && <p className="lesson-pattern-line"><LessonPatternLine hanzi={g.pattern_hanzi} pinyin={g.pattern_pinyin}/></p>}
    <p className="lesson-card-title"><LessonText text={g.function_en}/></p>
    <PlanSentence line={g.example}/>
    {g.example.teaching_note && g.example.teaching_note.trim() !== g.function_en.trim() && <p className="lesson-teaching"><LessonText text={g.example.teaching_note}/></p>}
    <CardTick target={g.id}/>
  </div>)}</div> });
  for (const b of blocks) {
    if (b.kind === 'review_set' && b.items.length) sections.push({ id: `block-${b.id}`, title: 'Key expressions', hint: count(b.items.length, 'expression'), body: <LessonFitGrid className="lesson-grid lesson-vocab-grid">
      {b.items.map((item, i) => <KeyExpressionCard key={item.expression_id ?? `${item.hanzi}-${i}`} hanzi={item.hanzi} pinyin={item.pinyin} meaning={item.meaning_en} usageLabel={item.usage_label} usageNote={item.usage_note}/>)}
    </LessonFitGrid> });
  }
  for (const b of laterNotes) {
    const title = contract?.find(sec => sec.checkpoints.some(c => c.targetId === b.id))?.title || 'Notes';
    sections.push({ id: `block-${b.id}`, title, hint: 'Try it yourself', body: <p className="lesson-note"><LessonText text={b.text}/></p> });
  }

  const vocab = topic ? [] : S.vocabulary?.items ?? [];
  if (vocab.length) {
    const levels = (['A', 'B', 'C'] as const).filter(p => vocab.some(v => v.priority === p));
    const shown = priority ? vocab.filter(v => v.priority === priority) : vocab;
    sections.push({ id: 'vocabulary', title: 'Words to learn first', hint: count(vocab.length, 'word'), body: <>
      <p className="lesson-note">Learn these established words whole. Priority A, B and C is the lesson’s editorial order, not a frequency rank.</p>
      {levels.length > 1 && <div className="lesson-filter" role="group" aria-label="Filter words by priority">
        <Button size="sm" variant={priority ? 'outline' : 'default'} aria-pressed={!priority} onClick={() => onPriority(undefined)}>All {vocab.length}</Button>
        {levels.map(p => <Button key={p} size="sm" variant={priority === p ? 'default' : 'outline'} aria-pressed={priority === p} onClick={() => onPriority(p)}>Priority {p} · {vocab.filter(v => v.priority === p).length}</Button>)}
      </div>}
      <LessonFitGrid className="lesson-grid lesson-vocab-grid">{shown.map(v => <VocabCard key={v.id} item={v}/>)}</LessonFitGrid>
      {S.vocabulary?.notes && <p className="lesson-note"><LessonText text={S.vocabulary.notes}/></p>}
    </> });
  }

  if (S.constructions?.enabled && S.constructions.items.length) sections.push({ id: 'constructions', title: 'Patterns', hint: count(S.constructions.items.length, 'reusable construction'), body: <>
    <div className="lesson-stack">{S.constructions.items.map(c => <div key={c.id} className="lesson-card lesson-pattern">
      <div className="lesson-card-top"><span className="lesson-register">{plain(c.category)}</span><span className="lesson-register"><LessonText text={c.register}/></span></div>
      <p className="lesson-pattern-line"><LessonPatternLine hanzi={c.pattern_hanzi} pinyin={c.pattern_pinyin}/></p>
      <p className="lesson-card-title"><LessonText text={c.function_en}/></p>
      <LessonTerm hanzi={c.example.hanzi} pinyin={c.example.pinyin} meaning={c.example.meaning_en}/>
      {c.usage_note && <p className="lesson-muted"><LessonText text={c.usage_note}/></p>}
    </div>)}</div>
    {S.constructions.structural_note && <p className="lesson-note"><LessonText text={S.constructions.structural_note}/></p>}
  </> });

  if (S.examples?.items.length) sections.push({ id: 'examples', title: 'Example sentences', hint: count(S.examples.items.length, 'sentence'), body: <>
    {S.examples.default_provenance && <p className="lesson-note"><LessonText text={S.examples.default_provenance}/></p>}
    <div className="lesson-stack">{S.examples.items.map(e => <div key={e.id} className="lesson-card lesson-example">
      <div className="lesson-card-top"><strong className="lesson-card-title"><LessonText text={e.title}/></strong>{e.provenance && <span className="lesson-register">{plain(e.provenance)}</span>}</div>
      <SentenceExample sentence={e.hanzi} pinyin={e.pinyin} translation={e.english} heading=""/>
      {(e.context || e.register) && <p className="lesson-muted">{e.context && <LessonText text={e.context}/>}{e.context && e.register ? ' · ' : ''}{e.register && <LessonText text={e.register}/>}</p>}
      {e.teaching_note && <p className="lesson-teaching"><LessonText text={e.teaching_note}/></p>}
    </div>)}</div>
  </> });

  if (S.contrasts && (S.contrasts.items.length || S.contrasts.preference_vs_rule)) sections.push({ id: 'contrasts', title: 'Similar words and contrasts', hint: 'Easily confused neighbours', body: <>
    <div className="lesson-grid">{S.contrasts.items.map(c => <div key={c.id} className="lesson-card">
      <LessonTerm hanzi={c.hanzi} pinyin={c.pinyin} meaning={c.meaning_en} size="lg"/>
      <div className="lesson-example-term"><LessonTerm hanzi={c.example.hanzi} pinyin={c.example.pinyin} meaning={c.example.meaning_en}/></div>
      {c.usage && <p><LessonText text={c.usage}/></p>}
      {c.limitation && <p className="lesson-muted"><LessonText text={c.limitation}/></p>}
    </div>)}</div>
    {S.contrasts.preference_vs_rule && <PreferenceChart preference={S.contrasts.preference_vs_rule} sources={source => sourceById.get(source)?.title ?? source}/>}
  </> });

  if (S.mistakes?.items.length) sections.push({ id: 'mistakes', title: 'Common mistakes', hint: 'Wrong inferences to avoid', body: <div className="lesson-stack">{S.mistakes.items.map(m => <div key={m.id} className="lesson-card lesson-mistake">
    <p className="lesson-mistake-dont"><small>Avoid</small><span><LessonText text={m.incorrect_inference}/></span></p>
    <p className="lesson-mistake-do"><small>Instead</small><span><LessonText text={m.correction}/></span></p>
    {m.reason && <p className="lesson-muted"><LessonText text={m.reason}/></p>}
  </div>)}</div> });

  if (!plan && S.practice?.enabled && S.practice.questions.length) sections.push({ id: 'practice', title: 'Check yourself', hint: count(S.practice.questions.length, 'question'), body: <div className="lesson-stack">{S.practice.questions.map((q, i) => <QuestionCard key={q.id} question={q} index={i + 1}/>)}</div> });

  if (S.writing && (S.writing.mapping_note || S.writing.pronunciation_note || S.writing.pending_checks?.length)) sections.push({ id: 'writing', title: 'Forms and pronunciation', hint: 'Script forms and readings', body: <div className="lesson-grid">
    {S.writing.mapping_note && <div className="lesson-card"><h3>Forms</h3><p><LessonText text={S.writing.mapping_note}/></p></div>}
    {S.writing.pronunciation_note && <div className="lesson-card"><h3>Pronunciation</h3><p><LessonText text={S.writing.pronunciation_note}/></p></div>}
    {S.writing.pending_checks?.length ? <div className="lesson-card"><h3>Still to verify</h3><ul className="lesson-list">{S.writing.pending_checks.map(x => <li key={x}><LessonText text={x}/></li>)}</ul></div> : null}
  </div> });

  if (S.historical?.enabled && S.historical.items.length) sections.push({ id: 'historical', title: 'Classical Chinese (optional)', hint: 'Optional historical reference', body: <details className="lesson-details">
    <summary>Show the classical reference</summary>
    {S.historical.intro && <p className="lesson-note"><LessonText text={S.historical.intro}/></p>}
    {S.historical.items.map(h => <div key={h.id} className="lesson-card">
      <p className="lesson-pattern-line"><LessonPairedLine hanzi={h.hanzi} pinyin={h.pinyin}/></p>
      <p className="lesson-card-title lesson-translation"><LessonText text={h.translation_en}/></p>
      <p><LessonText text={h.function_en}/></p>
      <p className="lesson-muted"><LessonText text={h.explanation}/></p>
    </div>)}
    {S.historical.caution && <p className="lesson-caution"><LessonText text={S.historical.caution}/></p>}
  </details> });

  if (learnerExtensions.length) sections.push({ id: 'more', title: 'More from the lesson notes', hint: 'Supplementary notes', body: <>
    {S.extensions?.intro && <p className="lesson-note"><LessonText text={S.extensions.intro}/></p>}
    <div className="lesson-stack">{learnerExtensions.map(x => <div key={x.id} className="lesson-card">
      <h3><LessonText text={x.title}/></h3>
      {x.blocks.map((b, i) => <ExtensionBlock key={i} block={b}/>)}
      {x.verification_status && x.verification_status !== 'verified' && <p className="lesson-footnote">{plain(x.verification_status)}</p>}
    </div>)}</div>
  </> });

  if (S.checklist?.items.length) sections.push({ id: 'checklist', title: 'Review checklist', hint: 'Editorial checks', body: <ul className="lesson-list lesson-checklist">{S.checklist.items.map(c => <li key={c.id} className={c.passed ? 'is-passed' : ''}>{c.passed && <Check aria-label="Passed" size={14}/>}<LessonText text={c.label}/></li>)}</ul> });

  if (S.sources?.items.length) sections.push({ id: 'sources', title: 'Sources', hint: 'Where the claims come from', body: <>
    <div className="lesson-stack">{S.sources.items.map(s => <div key={s.id} className="lesson-card lesson-source">
      <p><LessonText text={s.claim}/></p>
      <p className="lesson-muted">{[s.author, s.title, s.publication].filter(Boolean).join(' · ')}</p>
      {s.scope_note && <p className="lesson-muted"><LessonText text={s.scope_note}/></p>}
      <p className="lesson-footnote">{plain(s.evidence_type)} · {plain(s.verification_status)}{s.url && <> · <a href={s.url} target="_blank" rel="noopener noreferrer">Open source<ExternalLink size={10} aria-hidden="true"/></a></>}</p>
    </div>)}</div>
    {S.sources.example_provenance && <p className="lesson-note"><LessonText text={S.sources.example_provenance}/></p>}
    {(S.sources.editorial_status || S.sources.licensing) && <p className="lesson-note">{[S.sources.editorial_status, S.sources.licensing].filter(Boolean).join(' ')}</p>}
  </> });

  const ids = sections.map(s => s.id);

  // Where each recorded checkpoint lives on this page (lesson-checkpoints.ts planCheckpoints).
  const checkpointPlan = contract ? planCheckpoints(contract, {
    sections: ids,
    interactive: new Map<string, string>([
      ...allQuestions.map(q => [q.id, planTasks ? (isOptionalQuestion(q) ? 'review' : 'practice') : 'practice'] as [string, string]),
      ...(planTasks ? [
        ...planTasks.guided_building.substitutions.flatMap(x => x.id ? [[x.id, 'build'] as [string, string]] : []),
        ...planTasks.reading.questions.flatMap(q => q.id ? [[q.id, 'reading'] as [string, string]] : []),
        ...planTasks.speaking_tasks.flatMap(t => t.id ? [[t.id, 'speaking'] as [string, string]] : []),
      ] : []),
    ]),
    cards: new Map<string, string>([
      ...(planTasks?.patterns ?? []).map(pt => [pt.id, 'patterns'] as [string, string]),
      ...patterns.map(g => [g.id, 'block-patterns'] as [string, string]),
    ]),
    blocks: new Map<string, string>(blocks.map(b => [b.id, b.kind === 'explanation' ? (introBlocks.includes(b) ? 'about' : `block-${b.id}`) : b.kind === 'grammar_pattern' ? 'block-patterns' : `block-${b.id}`])),
    sectionKeys: SECTION_KEYS,
  }) : null;
  planRef.current = checkpointPlan;
  const totalTasks = checkpointPlan ? checkpointPlan.required.length : requiredIds.length;
  useEffect(() => {
    const plan = planRef.current;
    markLessonOpened(summary.id, plan ? plan.required.length : requiredIds.length, plan ? keys => migrateLegacyKeys(keys, legacyTarget, plan) : undefined);
  }, [summary.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Per-section required task keys, for the left menu's "2/4" counts.
  const sectionTasks: Record<string, string[]> = {};
  if (checkpointPlan) for (const key of checkpointPlan.required) { const where = checkpointPlan.pageOf.get(key); if (where) (sectionTasks[where] ??= []).push(key); }
  else for (const key of requiredIds) {
    const section = key.startsWith('build-') ? 'build' : key.startsWith('reading-') ? 'reading' : key.startsWith('speaking-') ? 'speaking' : reviewQuestion(key) ? 'review' : 'practice';
    (sectionTasks[section] ??= []).push(key);
  }
  const answeredSet = new Set(progressEntry?.answered ?? []);
  const doneSet = new Set([...answeredSet, ...(progressEntry?.bonus ?? [])]);
  const ticks = checkpointPlan ? { plan: checkpointPlan, done: doneSet, toggle: (c: LessonCheckpoint) => { if (doneSet.has(c.id)) unmarkCheckpoint(summary.id, c.id); else markQuestionAnswered(summary.id, c.id, c.optional); } } : null;
  const minutes = summary.estimatedMinutes;
  // Narrow layout state: which collapsible sections are open (the first one to begin with).
  // Restored from this tab's saved view, so Back from a word's card shows the same sections
  // open (and scroll restoration lands where the learner was). Reading storage in the
  // initializer is hydration-safe here: openIds only affects markup once `narrow` is true,
  // which is false on the server and on the first client render alike.
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => {
    const saved = readLessonView(summary.id)?.sections.filter(id => ids.includes(id));
    return new Set(saved ?? ids.slice(0, 1));
  });
  useEffect(() => { saveLessonView(summary.id, 'sections', openIds); }, [summary.id, openIds]);
  const active = useActiveSection(ids);
  const toggle = (id: string) => setOpenIds(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  // Shared numbers for the sidebar card and the phone strip.
  const view = progressView(progressEntry, totalTasks);
  const numbers: ProgressNumbers = { done: Math.min(progressEntry?.answered.length ?? 0, view.tasks), total: view.tasks, fraction: view.fraction, state: view.state };
  const sectionLinks: SectionLink[] = sections.map(s => { const tasks = sectionTasks[s.id] ?? []; const done = tasks.filter(k => answeredSet.has(k)).length; return { id: s.id, title: s.title, done: lessonDone ? tasks.length : done, total: tasks.length, complete: tasks.length > 0 && (lessonDone || done === tasks.length) }; });
  const activeSection = sections.find(s => s.id === active) ?? null;
  // "Reset this section": every task key counted under the section in view (required and
  // bonus checkpoints for checkpoint lessons, the page's own keys for older ones).
  const sectionKeys = (id: string) => checkpointPlan ? [...checkpointPlan.pageOf].flatMap(([key, where]) => where === id ? [key] : []) : sectionTasks[id] ?? [];
  const activeKeys = active ? sectionKeys(active) : [];
  const resetSection = () => {
    if (!activeSection) return;
    const snapshot = snapshotLesson(summary.id);
    resetLessonTasks(summary.id, activeKeys);
    saveLessonView(summary.id, 'panels', []); // the remount closes every panel, so forget them too
    setRound(r => r + 1);
    undoToast(`“${activeSection.title}” reset`, snapshot);
  };
  const studyView: StudyView = faces;
  const setStudyView = (next: StudyView) => {
    // A new choice starts clean: pieces revealed under the previous one blur again.
    pageRef.current?.querySelectorAll(`[${REVEALED_ATTR}]`).forEach(el => el.removeAttribute(REVEALED_ATTR));
    setPreferences({ ...preferences, lessonFaces: next });
  };
  // Click-to-reveal (capture phase, before hints or links see the click): a click on a blurred
  // piece only clears that piece. A click on a revealed piece blurs it back unless it landed on
  // something interactive (a hint character, link or button), which then works as usual.
  const revealClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as Element | null;
    if (!target || (faces.hanzi && faces.pinyin && faces.translations)) return;
    const piece = blurredPieceAt(target, faces);
    if (!piece) return;
    if (!piece.hasAttribute(REVEALED_ATTR)) {
      piece.setAttribute(REVEALED_ATTR, '');
      event.preventDefault(); event.stopPropagation();
      return;
    }
    if (target.closest('a, button, [role="button"], input, label')) return;
    piece.removeAttribute(REVEALED_ATTR);
  };
  const setHints = (on: boolean) => setPreferences({ ...preferences, lessonHints: on });
  // Phone Sections sheet: open the collapsed section, then scroll to it once the sheet has closed.
  const jumpTo = (id: string) => {
    setOpenIds(current => current.has(id) ? current : new Set([...current, id]));
    // Scrolled by hand so the section starts just below the stuck strip (its sticky top + own
    // height), whatever the page's global scroll padding.
    window.setTimeout(() => {
      const el = document.getElementById(`lesson-${id}`);
      const strip = document.querySelector<HTMLElement>('.lesson-phone-strip');
      if (!el) return;
      const offset = strip ? (parseFloat(getComputedStyle(strip).top) || 0) + strip.offsetHeight + 8 : 0;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
    }, 320);
  };

  const subtitle = displaySubtitle(summary.subtitle);
  const description = displayDescription(summary.description);
  const tags = displayTags(summary.tags);

  const hintsToggle = <CharacterHintsToggle checked={hintsOn} onChange={setHints}/>;

  return <LessonViewId.Provider value={summary.id}><QuestionProgress.Provider value={progress}><CheckpointTicks.Provider value={ticks}><LessonHintsProvider enabled={hintsOn} backLabel={headword ? `Lesson (${headword.hanzi})` : 'Lesson'} characterRefs={lessonCharacterRefs[summary.id]}><div ref={pageRef} onClickCapture={revealClick} className={`lesson-page${hidePinyin ? ' lesson-hide-pinyin' : ''}${hideTranslations ? ' lesson-hide-translations' : ''}${hideHanzi ? ' lesson-hide-hanzi' : ''}${hintsOn ? ' has-hints' : ''}${narrow ? ' is-narrow' : ''}`}>
    {/* Back link + course position share one block: on narrow pages they flow as one line
        (back left, course/lesson number right) with Previous/Next below (CSS .lesson-top). */}
    <div className="lesson-top">
      <Link to="/lessons" className="lesson-back"><ArrowLeft size={14} aria-hidden="true"/>All lessons</Link>
      {positions.map(p => <CoursePosition key={p.placement.id} position={p} lessonTitle={summary.title}/>)}
    </div>
    <header className={`lesson-hero${headword ? ' has-headword' : ''}`}>
      {headword && <LessonHeadword hanzi={headword.hanzi} pinyin={headword.pinyin}/>}
      <div className="lesson-hero-copy">
        <div className="eyebrow"><BookText size={12} aria-hidden="true"/><span>{lessonLabel(summary).toUpperCase()}{summary.primaryCategory && <span className="lesson-eyebrow-category"> · {summary.primaryCategory.label.toUpperCase()}</span>}{minutes && <span className="lesson-eyebrow-time"> · ABOUT {minutes} MIN</span>}</span></div>
        <h1>{summary.title}</h1>
        {/* Header copy goes through lesson-header-copy.ts: listed boilerplate subtitles, source
            notes and course/level tags are hidden (never rewritten); the audience line is not
            shown because the course line above already names the course and level. */}
        {subtitle && <p className="lesson-subtitle"><LessonText text={subtitle}/></p>}
        {description && <p className="lesson-description"><LessonText text={description}/></p>}
        {tags.length > 0 && <ul className="lesson-chips">{tags.map(t => <li key={t}>{t.replace(/-/g, ' ')}</li>)}</ul>}
      </div>
    </header>
    {(intro.lesson_focus || intro.core_principle || intro.learning_priority || summary.objectives.length > 0) && <div className="lesson-intro">
      {summary.objectives.length > 0 && <div><strong>In this lesson you will</strong><ul className="lesson-objectives">{summary.objectives.map(o => <li key={o}><LessonText text={o}/></li>)}</ul></div>}
      {intro.lesson_focus && <p><strong>Focus</strong><LessonText text={intro.lesson_focus}/></p>}
      {intro.core_principle && <p><strong>Key idea</strong><LessonText text={intro.core_principle}/></p>}
      {intro.learning_priority && <p><strong>Study order</strong><LessonText text={intro.learning_priority}/></p>}
    </div>}
    <div className="lesson-layout">
      {/* Wide: a fixed-height sidebar in three blocks — progress card (pinned), the section
          list (the only part that scrolls) and the display controls (pinned). Narrow: the
          sticky strip with Sections / Settings sheets replaces it (lesson-controls.tsx). */}
      {narrow ? <PhoneLessonBar numbers={numbers} activeTitle={activeSection?.title ?? summary.title} sections={sectionLinks} activeId={active} onJump={jumpTo} view={studyView} onView={setStudyView} hints={hintsOn} onHints={setHints} onResetLesson={restart} section={activeSection && activeKeys.length ? { title: activeSection.title, done: activeKeys.filter(k => answeredSet.has(k) || (progressEntry?.bonus ?? []).includes(k)).length } : null} onResetSection={resetSection}/>
      : <nav className="lesson-toc" aria-label="Lesson sections">
        {totalTasks > 0 || progressEntry?.completed ? <SidebarProgress numbers={numbers} section={activeSection && activeKeys.length ? { title: activeSection.title, done: activeKeys.filter(k => answeredSet.has(k) || (progressEntry?.bonus ?? []).includes(k)).length } : null} onResetSection={resetSection} onResetLesson={restart}/> : null}
        <div className="lesson-toc-list">
          <span className="eyebrow">IN THIS LESSON</span>
          {/* In-page jump links only (hash anchors scroll within this one page). */}
          {sectionLinks.map(s => <a key={s.id} href={`#lesson-${s.id}`} data-section={s.id} aria-current={active === s.id ? 'true' : undefined}>{s.title}{s.total > 0 && <span className={`lesson-toc-count${s.complete ? ' is-done' : ''}`} aria-label={`${s.done} of ${s.total} done`}>{s.complete ? <Check aria-hidden="true"/> : `${s.done}/${s.total}`}</span>}</a>)}
        </div>
        <div className="lesson-toc-tools">
          <StudyToggles view={studyView} onChange={setStudyView}/>
          {hintsToggle}
        </div>
      </nav>}
      <div className="lesson-main" key={round}>
        {sections.map(s => {
          if (!narrow) return <section key={s.id} id={`lesson-${s.id}`} className="lesson-section" aria-labelledby={`lesson-${s.id}-title`}><h2 id={`lesson-${s.id}-title`}>{s.title}</h2>{s.body}<SectionTicks where={s.id}/></section>;
          const open = openIds.has(s.id);
          return <section key={s.id} id={`lesson-${s.id}`} className={`lesson-section is-collapsible${open ? ' is-open' : ''}`} aria-labelledby={`lesson-${s.id}-title`}>
            <h2 id={`lesson-${s.id}-title`}><button type="button" className="lesson-section-toggle" aria-expanded={open} aria-controls={`lesson-${s.id}-body`} onClick={() => toggle(s.id)}>
              <span><span className="lesson-section-title">{s.title}</span><small>{s.hint}</small></span>
              <ChevronDown size={18} aria-hidden="true"/>
            </button></h2>
            <div id={`lesson-${s.id}-body`} className="lesson-section-body" hidden={!open}>{s.body}<SectionTicks where={s.id}/></div>
          </section>;
        })}
        <LessonFinish entry={progressEntry} total={totalTasks} onComplete={complete} onReset={restart} next={positions[0]?.next}/>
        <ReportProvenance lesson={lesson}/>
      </div>
    </div>
  </div>
  </LessonHintsProvider></CheckpointTicks.Provider></QuestionProgress.Provider></LessonViewId.Provider>;
}

/** Where this lesson sits in one course: course and level, unit, "Lesson N of M", recorded
 *  prerequisites, and Previous/Next within the same level (only the manifest's order). */
function CoursePosition({ position: p, lessonTitle }: { position: LessonPosition; lessonTitle: string }) {
  // A unit named exactly like the lesson adds nothing, so the line skips it.
  const unit = p.unit.title.trim() === lessonTitle.trim() ? null : p.unit.title;
  // A prerequisite that is simply the Previous link below would be said twice, so it is listed once there.
  const before = p.placement.prerequisites.filter(x => x.id !== p.previous?.id);
  return <nav className="lesson-course-position" aria-label={`${p.course.title}: position`}>
    <div className="lesson-course-where">
      <Library size={14} aria-hidden="true"/>
      <span><Link to="/lessons">{p.section.title}</Link>{unit && <span className="lesson-course-unit"> · {unit}</span>} · <strong>Lesson {p.index} of {p.total}</strong></span>
    </div>
    {before.length > 0 && <p className="lesson-course-after">Before this: {before.map((s, i) => <span key={s.id}>{i > 0 && ', '}<Link to="/lessons/$lessonId" params={{ lessonId: s.id }}>{s.title}</Link></span>)}</p>}
    <div className="lesson-course-steps">
      {p.previous ? <Link to="/lessons/$lessonId" params={{ lessonId: p.previous.id }} className="lesson-course-step"><ArrowLeft size={14} aria-hidden="true"/><span><small>Previous:</small> {p.previous.title}</span></Link> : <span/>}
      {p.next && <Link to="/lessons/$lessonId" params={{ lessonId: p.next.id }} className="lesson-course-step is-next"><span><small>Next:</small> {p.next.title}</span><ArrowRight size={14} aria-hidden="true"/></Link>}
    </div>
  </nav>;
}

/** A teaching-plan sentence (hanzi, tone-marked pinyin, English) with the shared sentence
 *  renderer, so its hanzi carry hints/links and its speaker uses the common audio pipeline. */
function PlanSentence({ line }: { line: PlanLine }) {
  return <SentenceExample sentence={line.hanzi} pinyin={line.pinyin} translation={line.english} heading=""/>;
}

/** A dialogue: one row per turn with its speaker badge (A, B…) beside the shared sentence renderer. */
function DialogueTurns({ turns }: { turns: (PlanLine & { speaker: string })[] }) {
  return <div className="lesson-dialogue">{turns.map((t, i) => <div key={i} className="lesson-turn">
    <span className="lesson-turn-speaker" aria-label={`Speaker ${t.speaker}`}>{t.speaker}</span>
    <PlanSentence line={t}/>
  </div>)}</div>;
}

/** Hidden model answer the learner opens after trying first (native disclosure; state is the
 *  element's own). Opening it counts as doing the task: `progressKey` is reported once open.
 *  The handler checks currentTarget so a nested disclosure's toggle never counts for this one. */
function Reveal({ label, progressKey, children }: { label: string; progressKey?: string; children: ReactNode }) {
  const progressCtx = useContext(QuestionProgress);
  // Remembered by its task key (when it has one), so a revealed answer is still open on Back.
  return <RememberedDetails panel={progressKey ? `reveal:${progressKey}` : undefined} className="lesson-details lesson-reveal" onOpen={() => { if (progressKey) progressCtx?.answer(progressKey); }}><summary>{label}</summary>{children}</RememberedDetails>;
}

/** A native <details> whose open state is remembered for this lesson in this tab
 *  (lesson-view-state.ts), so leaving the lesson for a word card and coming Back reopens it.
 *  Inputs: `panel`, a key unique within the lesson (no key → an ordinary, unremembered
 *  disclosure); `onOpen`, called when the learner opens it. Starts closed on the server and
 *  first render, then reopens from storage before the first paint (no hydration mismatch). Only this
 *  element's own toggle counts (currentTarget), never a nested disclosure's. Restoring an
 *  open panel does not call onOpen, so a restore never counts as new work. */
function RememberedDetails({ panel, className, onOpen, children }: { panel?: string | undefined; className?: string; onOpen?: () => void; children: ReactNode }) {
  const lessonId = useContext(LessonViewId);
  const [open, setOpen] = useState(false);
  const restoring = useRef(false);
  // Layout effect: reopen before paint, so restored scroll lands on the same content.
  useLayoutEffect(() => {
    if (panel && lessonId && readLessonView(lessonId)?.panels.includes(panel)) { restoring.current = true; setOpen(true); }
  }, [panel, lessonId]);
  return <details className={className} open={open} onToggle={e => {
    if (e.target !== e.currentTarget) return;
    const now = e.currentTarget.open;
    setOpen(now);
    if (restoring.current) { restoring.current = false; return; }
    if (panel && lessonId) setLessonPanel(lessonId, panel, now);
    if (now) onOpen?.();
  }}>{children}</details>;
}

/** The numbers both progress displays show. Before the first read after mount (and on the
 *  server) there is no entry yet, so it reads 0 of the page's own task count. */
function progressView(entry: LessonProgressEntry | undefined, total: number) {
  const tasks = entry?.total ?? total;
  const { state, fraction } = entry ? lessonState(entry) : { state: 'not-started' as const, fraction: 0 };
  const done = Math.min(entry?.answered.length ?? 0, tasks);
  const label = state === 'done' ? null : `${done} of ${tasks} ${tasks === 1 ? 'task' : 'tasks'} done`;
  return { tasks, state, fraction, label };
}

/** One manual checkpoint: a toggle reading "Mark as done" (or the recorded label) / "Done".
 *  Optional checkpoints say Bonus. Pressing again unticks it. */
function CheckpointButton({ checkpoint: c }: { checkpoint: LessonCheckpoint }) {
  const ctx = useContext(CheckpointTicks);
  if (!ctx) return null;
  const done = ctx.done.has(c.id);
  const label = checkpointLabel(c);
  return <button type="button" className={`lesson-checkpoint${done ? ' is-done' : ''}`} aria-pressed={done} onClick={() => ctx.toggle(c)}>
    <span className="lesson-checkpoint-box" aria-hidden="true">{done && <Check/>}</span>
    <span>{label}{c.optional && <small> · bonus</small>}</span>
  </button>;
}

/** The "Mark as done" tick on one pattern card, when a checkpoint targets that card. */
function CardTick({ target }: { target: string }) {
  const c = useContext(CheckpointTicks)?.plan.card.get(target);
  return c ? <div className="lesson-checkpoints is-card"><CheckpointButton checkpoint={c}/></div> : null;
}

/** Manual checkpoints placed at the end of one page section (or the finish box: where="finish"). */
function SectionTicks({ where }: { where: string }) {
  const list = useContext(CheckpointTicks)?.plan.section.get(where) ?? [];
  if (!list.length) return null;
  return <div className="lesson-checkpoints" role="group" aria-label="Checklist">{list.map(c => <CheckpointButton key={c.id} checkpoint={c}/>)}</div>;
}

/** One confirm wording for every whole-lesson reset (sidebar menu, phone Settings, Start over,
 *  Practice this lesson again), each followed by the same Undo toast. */
const resetCopy = (total: number) => ({ title: `Reset all ${total} ${total === 1 ? 'task' : 'tasks'}?`, description: 'This clears your answers and progress for this lesson.' });

/** End-of-lesson box: "Complete lesson" marks it done without opening every task; once done
 *  it reads Lesson complete with, in a course, the next lesson as the main action and a
 *  secondary outline "Practice this lesson again" below it. */
function LessonFinish({ entry, total, onComplete, onReset, next }: { entry: LessonProgressEntry | undefined; total: number; onComplete: () => void; onReset: () => void; next: LessonSummary | null | undefined }) {
  const done = lessonState(entry).state === 'done' && Boolean(entry);
  return <div className={`lesson-finish${done ? ' is-done' : ''}`}>
    {done ? <>
      <p className="lesson-finish-title"><CheckCircle2 aria-hidden="true"/>Lesson complete</p>
      <div className="lesson-finish-actions is-stacked">
        {next && <Link to="/lessons/$lessonId" params={{ lessonId: next.id }} className="lesson-finish-next">Next: {next.title}<ArrowRight size={14} aria-hidden="true"/></Link>}
        <ResetProgressButton label="Practice this lesson again" {...resetCopy(entry?.total || total)} onReset={onReset}/>
      </div>
    </> : <>
      <p className="lesson-finish-title">Finished this lesson?</p>
      <SectionTicks where="finish"/>
      <div className="lesson-finish-actions"><Button type="button" onClick={onComplete}><CheckCircle2 aria-hidden="true"/>Complete lesson</Button></div>
    </>}
  </div>;
}

/** Compact word card for Words to review and the Word bank, a simplified Vocabulary grid card:
 *  top row with the record's part of speech and its own identity pills (HSK level/#, Radical),
 *  then the hanzi in a bordered box wearing the record's card ink, with pinyin + speaker and
 *  the translation to its right. No example sentences (those are on the Vocabulary card).
 *  Inputs: the lesson item and its exact Vocabulary record (null when none matched, which
 *  shows the lesson's own part of speech and no pills, so nothing is borrowed). */
/** Invisible, zero-width HSK pill at the start of a lesson card header: it gives every header
 *  the pill's exact height (in each display size), so cards with and without pills keep the
 *  hanzi box at the same place. */
function HeaderStrut() { return <span className="word-hsk-id lesson-bank-strut" aria-hidden="true">&nbsp;</span>; }

function WordBankCard({ item, record }: { item: TopicVocabItem; record: Word | null }) {
  const pos = record?.type || plain(item.primary_pos_id.replace(/[-_]/g, ' '));
  return <div className="lesson-card lesson-vocab lesson-bank-word">
    <div className="lesson-bank-top"><HeaderStrut/>{pos && <span className="lesson-register">{pos}</span>}{record && <WordIdentityPills word={record}/>}</div>
    <LessonWord hanzi={item.hanzi} pinyin={item.pinyin} meaning={item.meaning_en} record={record} tile inkClass={wordInk(record ?? { hanzi: item.hanzi })}/>
  </div>;
}

const styleLabel: Record<string, string> = { conversational: 'Conversational', written: 'Written' };
/** One recorded topic-lesson sentence with its style and teaching note. */
function TopicSentence({ example: e }: { example: TopicExample }) {
  return <div className="lesson-card lesson-example">
    {e.style && <div className="lesson-card-top"><span className="lesson-register">{styleLabel[e.style] ?? plain(e.style)}</span></div>}
    <SentenceExample sentence={e.hanzi} pinyin={e.pinyin} translation={e.english} heading=""/>
    {e.teaching_note && <p className="lesson-teaching"><LessonText text={e.teaching_note}/></p>}
  </div>;
}

/** A topic-lesson word: linked headword with the record's recording, its HSK entry number
 *  (shown only when the record matched), part of speech, and its recorded example sentences. */
function TopicWordCard({ item, record }: { item: TopicVocabItem; record: Word | null }) {
  const hsk = record?.entry?.hskLevel && record.entry.hsk_index ? `HSK ${record.entry.hskLevel} · #${record.entry.hsk_index}` : '';
  return <div className="lesson-card lesson-topic-word">
    <div className="lesson-card-top"><span className="lesson-register">{item.primary_pos_id.replace(/[-_]/g, ' ')}</span>{hsk && <span className="lesson-register is-hsk">{hsk}</span>}</div>
    <LessonWord hanzi={item.hanzi} pinyin={item.pinyin} meaning={item.meaning_en} record={record}/>
    {item.examples.length > 0 && <div className="lesson-topic-examples">{item.examples.map(e => <TopicSentence key={e.id} example={e}/>)}</div>}
  </div>;
}

/** A Key expressions card. Inputs: the recorded expression and its optional usage label/note.
 * When exactly one Vocabulary record has this exact headword, its HSK pill (the grid cards' own
 * wordHskPill) marks the whole expression as an entry; composite expressions wear a neutral
 * Expression pill instead. Hanzi colour stays uniform either way. The usage note sits below the
 * expression as text only: its alternative forms are never spoken — the speaker stays on the phrase. */
function KeyExpressionCard({ hanzi, pinyin, meaning, usageLabel, usageNote }: { hanzi: string; pinyin: string; meaning?: string | undefined; usageLabel?: string | undefined; usageNote?: string | undefined }) {
  const { items } = useWorkspace();
  const matches = items.filter(w => w.hanzi === hanzi);
  const hsk = matches.length === 1 ? wordHskPill(matches[0]!) : null;
  // Same layout as the word-bank/Vocabulary grid cards: a header row that always reserves its
  // height (Expression pill for composite expressions), then the hanzi box with pinyin and translation to its right.
  return <div className="lesson-card lesson-vocab lesson-bank-word">
    <div className="lesson-bank-top"><HeaderStrut/>{hsk ? <span className="word-hsk-id hsk-level-pill" title={hsk.title}>{hsk.label}</span> : <span className="word-hsk-id lesson-expression-pill" title="Expression built from words; not a single dictionary entry">Expression</span>}</div>
    <LessonWord hanzi={hanzi} pinyin={pinyin} meaning={meaning} tile/>
    {usageNote && <p className="lesson-usage-note">{usageLabel && <span className="lesson-usage-label">{usageLabel}</span>}<LessonText text={usageNote}/></p>}
  </div>;
}

function VocabCard({ item }: { item: LessonVocabItem }) {
  return <div className="lesson-card lesson-vocab lesson-bank-word">
    <div className="lesson-card-top"><span className="lesson-register">{item.part_of_speech}</span><span className={`lesson-priority is-${item.priority.toLowerCase()}`} title={`Editorial priority ${item.priority}`}>{item.priority}</span></div>
    <LessonWord hanzi={item.hanzi} pinyin={item.pinyin} meaning={item.meaning_en} tile/>
    {item.usage_note && <p className="lesson-muted"><LessonText text={item.usage_note}/></p>}
    <p className="lesson-footnote">{[item.register, plain(item.lexical_status), item.hsk_level ? `HSK ${item.hsk_level}` : ''].filter(Boolean).join(' · ')}</p>
  </div>;
}

/** A practice question. Inputs: the recorded question and its display number.
 * State: picked choice indexes, whether the answer is shown, and (multi-selection only)
 * whether the picks were checked. Grading happens only when correctLessonChoices resolves
 * the recorded correct_choice_ids; questions without valid IDs (legacy files, broken
 * references) keep the ungraded reveal so no answer is ever guessed from text.
 * Single selection grades on the first click; multi-selection toggles picks and grades on Check. */
function QuestionCard({ question, index }: { question: LessonQuestion; index: number }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const progressCtx = useContext(QuestionProgress);
  const progressKey = question.id;
  const correctChoices = correctLessonChoices(question);
  const graded = correctChoices.length > 0;
  const multi = graded && question.kind === 'multi_selection';
  const isCorrect = (i: number) => correctChoices.includes(question.choices[i]!);
  // Single selection: one click answers. Multi: answered once checked.
  const answered = graded && (multi ? checked : picked.length > 0);
  const right = answered && picked.length === correctChoices.length && picked.every(isCorrect);
  const choose = (i: number) => {
    if (!graded) { setPicked([i]); setOpen(true); return; }
    if (answered) return;
    if (multi) setPicked(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i]);
    else { setPicked([i]); setOpen(true); }
  };
  const check = () => { setChecked(true); setOpen(true); };
  useEffect(() => { if (answered || open) progressCtx?.answer(progressKey); }, [answered, open, progressCtx, progressKey]);
  const retry = () => { setPicked([]); setChecked(false); setOpen(false); };
  const choiceState = (i: number) => {
    const on = picked.includes(i);
    if (!answered && !(graded && open)) return on ? ' is-picked' : '';
    if (isCorrect(i)) return on ? ' is-correct' : ' is-answer';
    return on ? ' is-wrong' : ' is-dimmed';
  };
  const hint = !question.choices.length ? null
    : multi ? (!answered ? 'Pick every answer that fits, then check.' : null)
    : graded ? (!answered && !open ? 'Pick one.' : null)
    : (!picked.length && !open ? 'Pick one, then compare with the answer.' : null);
  // Character hints only once the question is answered or its answer shown, so a quick
  // card's meaning never gives the answer away.
  return <LessonHintsGate enabled={answered || open}><div className={`lesson-card lesson-question${open ? ' is-open' : ''}`}>
    <div className="lesson-card-top"><span className="lesson-register">Question {index} · {plain(question.kind)}</span></div>
    <p className="lesson-card-title"><LessonText text={question.prompt}/></p>
    {question.choices.length > 0 && <div className="lesson-choices" role="group" aria-label="Choices">{question.choices.map((c, i) => <button key={c.id ?? i} type="button" className={`lesson-choice${choiceState(i)}`} aria-pressed={picked.includes(i)} aria-disabled={answered || undefined} onClick={() => choose(i)}>
      <QuestionChoice choice={c} showMeaning={open || answered} inButton/>
    </button>)}</div>}
    {hint && <p className="lesson-muted">{hint}</p>}
    {answered && <p className={`lesson-verdict ${right ? 'is-right' : 'is-wrong'}`} role="status">{right ? 'Correct!' : multi ? 'Not quite. The correct answers are marked.' : 'Not quite. The correct answer is marked.'}</p>}
    <div className="lesson-question-actions">
      {multi && !answered && <Button size="sm" disabled={!picked.length} onClick={check}>Check</Button>}
      {answered ? <Button size="sm" variant="outline" onClick={retry}>Try again</Button>
        : <Button size="sm" variant="outline" className="lesson-answer-toggle" aria-expanded={open} onClick={() => setOpen(v => !v)}>{open ? 'Hide answer' : 'Show answer'}</Button>}
    </div>
    {(open || answered) && <div className="lesson-answer"><p className="lesson-answer-label">{graded ? 'Answer' : 'Model answer'}</p>{graded ? correctChoices.map(c => <p key={c.id} className="lesson-term"><QuestionChoice choice={c} showMeaning/></p>) : question.answer && <AnswerLines answer={question.answer}/>}{question.explanation && <p className="lesson-muted lesson-answer-note"><LessonText text={question.explanation}/></p>}</div>}
  </div></LessonHintsGate>;
}

/** A recorded free-text answer, line by line (parseAnswerLines): "A: 汉字 (pinyin) — English"
 *  turns get the conversation's speaker badge and sentence renderer; other lines stay verbatim. */
function AnswerLines({ answer }: { answer: string }) {
  const lines = parseAnswerLines(answer);
  return <div className="lesson-dialogue lesson-answer-lines">{lines.map((l, i) => l.kind === 'text'
    ? <p key={i} className="lesson-answer-text"><LessonText text={l.text}/></p>
    : l.speaker ? <div key={i} className="lesson-turn"><span className="lesson-turn-speaker" aria-label={`Speaker ${l.speaker}`}>{l.speaker}</span><PlanSentence line={l}/></div>
    : <PlanSentence key={i} line={l}/>)}</div>;
}

/** The same recorded choice content appears in the options and revealed answer;
 * v2.6 supports either plain text or a hanzi/pinyin pair. No text is inferred. */
function QuestionChoice({ choice, showMeaning, inButton = false }: { choice: LessonChoice; showMeaning: boolean; inButton?: boolean }) {
  // Inside a choice button the hanzi are not separate tab stops (the button already is one).
  return <>
    {choice.text ? <LessonText text={choice.text}/> : choice.hanzi ? <LessonPairedLine hanzi={choice.hanzi} pinyin={choice.pinyin} focusable={!inButton}/> : choice.pinyin && <span className="pinyin">{choice.pinyin}</span>}
    {showMeaning && choice.meaning_en && <small><LessonText text={choice.meaning_en}/></small>}
  </>;
}

/** Recorded corpus counts drawn as proportional bars; the numbers are printed beside each bar. */
function PreferenceChart({ preference, sources }: { preference: LessonPreference; sources: (id: string) => string }) {
  return <div className="lesson-card lesson-preference">
    <h3>Preference, not a rule</h3>
    {preference.data.categories.map(c => { const total = c.abstract + c.concrete; const share = total ? Math.round((c.abstract / total) * 100) : 0; return <div key={c.form_hanzi} className="lesson-bar-row">
      <span className="lesson-bar-label"><LessonPairedLine hanzi={c.form_hanzi} pinyin={c.form_pinyin}/></span>
      <span className="lesson-bar" title={`${total} occurrences`}><span className="lesson-bar-abstract" style={{ width: `${share}%` }}/></span>
      <span className="lesson-bar-count">{c.abstract} abstract · {c.concrete} concrete</span>
    </div>; })}
    <p><LessonText text={preference.statement}/></p>
    <p className="lesson-footnote">{preference.data.sample}{preference.source_ids?.length ? ` · ${preference.source_ids.map(sources).join(', ')}` : ''}</p>
  </div>;
}

function ExtensionBlock({ block }: { block: LessonBlock }) {
  switch (block.kind) {
    case 'paragraph': return <p><LessonText text={block.text}/></p>;
    case 'term': return <div className="lesson-extension-term"><LessonTerm hanzi={block.hanzi} pinyin={block.pinyin} meaning={block.meaning_en}/>{block.note && <p className="lesson-muted"><LessonText text={block.note}/></p>}</div>;
    case 'example': return <div className="lesson-extension-term"><SentenceExample sentence={block.hanzi} pinyin={block.pinyin} translation={block.english} heading=""/>{block.usage_note && <p className="lesson-muted"><LessonText text={block.usage_note}/></p>}</div>;
    case 'list': return <ul className="lesson-list">{block.items.map((x, i) => <li key={i}><LessonText text={x}/></li>)}</ul>;
    case 'table': return <div className="lesson-table-wrap"><table className="lesson-table"><thead><tr>{block.headers.map(h => <th key={h} scope="col"><LessonText text={h}/></th>)}</tr></thead><tbody>{block.rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c} data-label={block.headers[c]}><LessonText text={cell}/></td>)}</tr>)}</tbody></table></div>;
    default: return null;
  }
}

/** Editorial report intake (what the source report contained and where it went), collapsed under a footnote heading. */
function ReportProvenance({ lesson }: { lesson: LessonDocument }) {
  const { reports, material } = lesson.reportIntake;
  if (!reports.length && !material.length) return null;
  return <details className="lesson-details lesson-provenance">
    <summary>Report provenance</summary>
    {reports.map(r => <div key={r.id} className="lesson-provenance-report"><p><strong><LessonText text={r.title}/></strong></p><p className="lesson-muted">{[plain(r.source_type), r.source_locator, r.received_date].filter(Boolean).join(' · ')}</p>{r.notes && <p className="lesson-muted"><LessonText text={r.notes}/></p>}</div>)}
    {material.length > 0 && <div className="lesson-table-wrap"><table className="lesson-table"><thead><tr><th scope="col">Report part</th><th scope="col">Content</th><th scope="col">Handling</th></tr></thead><tbody>{material.map(m => <tr key={m.id}><td data-label="Report part">{m.source_location}</td><td data-label="Content"><LessonText text={m.content_summary}/></td><td data-label="Handling">{plain(m.handling)}{m.decision_note && <> · <LessonText text={m.decision_note}/></>}</td></tr>)}</tbody></table></div>}
  </details>;
}

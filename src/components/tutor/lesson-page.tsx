import { LessonFitGrid } from './lesson-fit-grid';
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { markLessonOpened, markQuestionAnswered } from '@/lib/lesson-progress';

/** Progress hook for QuestionCards: a card reports its id once answered or revealed. */
const QuestionProgress = createContext<{ answer: (key: string) => void } | null>(null);
import { Link } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, BookText, Check, ChevronDown, ExternalLink, EyeOff, Eye, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { detailTrail } from '@/lib/detail-trail';
import { correctLessonChoices, lessonCharacterRefs, syllabusEntryFor, type PlanLine, type TopicExample, type TopicVocabItem, type LessonBlock, type LessonChoice, type LessonDocument, type LessonPreference, type LessonQuestion, type LessonSummary, type LessonVocabItem } from '@/lib/lessons';
import { LessonHeadword, LessonPairedLine, LessonTerm, LessonText, LessonWord } from './lesson-text';
import { positionsOf, type LessonPosition } from '@/lib/lesson-curricula';
import type { Word } from '@/lib/mandarin';
import { SentenceExample } from './sentence-example';
import { LessonHintsGate, LessonHintsProvider } from './lesson-hints';
import { Switch } from '@/components/ui/switch';
import { useWorkspace } from './workspace';

/**
 * One study lesson page, rendered entirely from its JSON document (src/lib/lessons.ts),
 * so every lesson shares this template whatever its kind (character, word, phrase or
 * topic lesson; the headword box appears only when a headword is recorded).
 *
 * Inputs: `lesson` — the loaded document; `priority` / `onPriority` — the URL-backed
 * vocabulary priority filter (A/B/C or all). Local state: the "Hide hanzi", "Hide pinyin" and "Hide translations" study switches
 * and each practice card's revealed answer (both reset when the page is left). The
 * "Character hints" side switch is the remembered `lessonHints` preference (absent = on);
 * it drives LessonHintsProvider live (lesson-hints.tsx).
 *
 * Narrow layout (the page's own width ≤ 760px, the same threshold as its container
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

export function LessonStatusPill({ status }: { status: string }) {
  return status === 'draft' ? <span className="word-hsk-id lesson-draft-pill" title="Draft lesson: not reviewed yet">Draft</span> : null;
}

type SectionDef = { id: string; title: string; hint: string; body: ReactNode };

/** Matches the `@container lesson-page (max-width: 760px)` rules in styles.css. */
const NARROW_MAX = 760;
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
  // Progress counts the lesson's required questions (topic plans: the "Check what you can do"
  // set; the optional recall quiz still records answers but is not required), keyed by question id.
  const allQuestions = S.practice?.enabled ? S.practice.questions : [];
  const requiredIds = (lesson.topic?.plan ? allQuestions.filter(q => q.id.startsWith('applied-')) : allQuestions).map(q => q.id);
  const progress = useRef({ answer: (k: string) => markQuestionAnswered(summary.id, k) }).current;
  useEffect(() => { markLessonOpened(summary.id, requiredIds.length); }, [summary.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [hidePinyin, setHidePinyin] = useState(false);
  // "Hide translations": blurs English renderings of Chinese (sentence translations, word/term
  // meanings) until hovered or focused, like Hide pinyin; instructions and explanations stay readable.
  const [hideTranslations, setHideTranslations] = useState(false);
  // "Hide hanzi": blurs recorded Chinese lines and terms (not hanzi quoted inside English prose).
  const [hideHanzi, setHideHanzi] = useState(false);
  const { preferences, setPreferences, items } = useWorkspace();
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
    const applied = questions.filter(q => q.id.startsWith('applied-'));
    const recall = questions.filter(q => !q.id.startsWith('applied-'));
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
      </div>)}
    </div> });
    if (p.guided_building.substitutions.length) sections.push({ id: 'build', title: 'Build new sentences', hint: count(p.guided_building.substitutions.length, 'change'), body: <>
      <p className="lesson-note"><LessonText text={p.guided_building.instruction_en}/></p>
      <div className="lesson-card lesson-task"><p className="lesson-task-label">Worked model</p><PlanSentence line={p.guided_building.model}/></div>
      <div className="lesson-stack">{p.guided_building.substitutions.map((x, i) => <div key={i} className="lesson-card lesson-task">
        <p className="lesson-card-title">Change {i + 1}: <LessonText text={x.cue_en}/></p>
        <Reveal label="Show a model answer"><PlanSentence line={x.model_answer}/></Reveal>
      </div>)}</div>
    </> });
    if (p.reading.paragraphs.length) sections.push({ id: 'reading', title: 'Read for meaning', hint: p.reading.title, body: <>
      <p className="lesson-note">Read the passage, then answer in English or Mandarin.</p>
      <div className="lesson-stack">{p.reading.paragraphs.map((e, i) => <div key={i} className="lesson-card"><PlanSentence line={e}/></div>)}</div>
      <div className="lesson-stack">{p.reading.questions.map((q, i) => <div key={i} className="lesson-card lesson-task">
        <p className="lesson-card-title">{i + 1}. <LessonText text={q.prompt_en}/></p>
        <Reveal label="Show the answer"><p><LessonText text={q.answer_en}/></p></Reveal>
      </div>)}</div>
    </> });
    if (p.speaking_tasks.length) sections.push({ id: 'speaking', title: 'Speak and personalise', hint: count(p.speaking_tasks.length, 'task'), body: <>
      <p className="lesson-note">Answer aloud before opening the model, and adapt it to your own life.</p>
      <div className="lesson-stack">{p.speaking_tasks.map((t, i) => <div key={t.id || i} className="lesson-card lesson-task">
        <p className="lesson-card-title">{i + 1}. <LessonText text={t.scenario_en}/></p>
        <Reveal label="Show one possible answer"><PlanSentence line={t.model_answer}/></Reveal>
      </div>)}</div>
    </> });
    if (p.common_pitfall || p.pronunciation_focus) sections.push({ id: 'watch-out', title: 'Watch out', hint: 'A common pitfall and pronunciation', body: <div className="lesson-grid">
      {p.common_pitfall && <div className="lesson-card"><h3>Common pitfall</h3><p><LessonText text={p.common_pitfall}/></p></div>}
      {p.pronunciation_focus && <div className="lesson-card"><h3>Pronunciation</h3><p><LessonText text={p.pronunciation_focus}/></p></div>}
    </div> });
    if (applied.length) sections.push({ id: 'practice', title: 'Check what you can do', hint: count(applied.length, 'question'), body: <div className="lesson-stack">{applied.map((q, i) => <QuestionCard key={q.id} question={q} index={i + 1}/>)}</div> });
    if (p.review.can_do.length || topic.items.length) sections.push({ id: 'review', title: 'Review', hint: 'What you can do now', body: <>
      {p.review.can_do.length > 0 && <ul className="lesson-objectives">{p.review.can_do.map(x => <li key={x}><LessonText text={x}/></li>)}</ul>}
      {reviewWords.length > 0 && <><h3 className="lesson-subheading">Words to review</h3><LessonFitGrid className="lesson-grid lesson-vocab-grid">{reviewWords.map(item => <div key={item.id} className="lesson-card lesson-vocab"><LessonWord hanzi={item.hanzi} pinyin={item.pinyin} meaning={item.meaning_en} record={recordFor(item)}/></div>)}</LessonFitGrid></>}
      {topic.items.length > 0 && <details className="lesson-details">
        <summary>Word bank ({topic.items.length}) — examples are on each Vocabulary card</summary>
        <LessonFitGrid className="lesson-grid lesson-vocab-grid">{topic.items.map(item => <WordBankCard key={item.id} item={item} record={recordFor(item)}/>)}</LessonFitGrid>
      </details>}
      {recall.length > 0 && <details className="lesson-details">
        <summary>Optional word recall quiz ({recall.length})</summary>
        <div className="lesson-stack">{recall.map((q, i) => <QuestionCard key={q.id} question={q} index={i + 1}/>)}</div>
      </details>}
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
      {topic.related.map(item => <div key={item.id} className="lesson-card lesson-vocab"><LessonWord hanzi={item.hanzi} pinyin={item.pinyin} meaning={item.meaning_en} record={recordFor(item)}/></div>)}
    </LessonFitGrid> });
  }

  // General lessons (e.g. Conversational Mandarin dialogue lessons): blocks in recorded order.
  // Consecutive explanations open the lesson as "About this lesson"; each other block is its own section.
  const blocks = S.blocks ?? [];
  const introBlocks = blocks.flatMap(b => b.kind === 'explanation' ? [b] : []);
  if (introBlocks.length) sections.push({ id: 'about', title: 'About this lesson', hint: 'What this lesson is based on', body: <>{introBlocks.map(b => <p key={b.id} className="lesson-note"><LessonText text={b.text}/></p>)}</> });
  for (const b of blocks) {
    if (b.kind === 'dialogue' && b.turns.length) sections.push({ id: `block-${b.id}`, title: b.title || 'Conversation', hint: count(b.turns.length, 'line'), body: <DialogueTurns turns={b.turns}/> });
  }
  const patterns = blocks.flatMap(b => b.kind === 'grammar_pattern' ? [b] : []);
  if (patterns.length) sections.push({ id: 'block-patterns', title: 'Patterns', hint: count(patterns.length, 'pattern'), body: <div className="lesson-stack">{patterns.map(g => <div key={g.id} className="lesson-card lesson-pattern">
    <p className="lesson-pattern-line"><LessonPairedLine hanzi={g.pattern_hanzi} pinyin={g.pattern_pinyin}/></p>
    <p className="lesson-card-title"><LessonText text={g.function_en}/></p>
    <PlanSentence line={g.example}/>
    {g.example.teaching_note && <p className="lesson-teaching"><LessonText text={g.example.teaching_note}/></p>}
  </div>)}</div> });
  for (const b of blocks) {
    if (b.kind === 'review_set' && b.items.length) sections.push({ id: `block-${b.id}`, title: 'Key expressions', hint: count(b.items.length, 'expression'), body: <LessonFitGrid className="lesson-grid lesson-vocab-grid">
      {b.items.map((item, i) => <div key={`${item.hanzi}-${i}`} className="lesson-card lesson-vocab"><LessonWord hanzi={item.hanzi} pinyin={item.pinyin} meaning={item.meaning_en}/></div>)}
    </LessonFitGrid> });
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
      <p className="lesson-pattern-line"><LessonPairedLine hanzi={c.pattern_hanzi} pinyin={c.pattern_pinyin}/></p>
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
  // Narrow layout state: which collapsible sections are open (the first one to begin with).
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set(ids.slice(0, 1)));
  const active = useActiveSection(ids);
  const toc = useRef<HTMLElement>(null);
  // Keep the active pill in view inside the horizontally scrolling pill row (never scrolls the page).
  useEffect(() => {
    const nav = toc.current;
    const pill = nav?.querySelector<HTMLElement>(`a[data-section="${active}"]`);
    if (!narrow || !nav || !pill) return;
    if (pill.offsetLeft < nav.scrollLeft || pill.offsetLeft + pill.offsetWidth > nav.scrollLeft + nav.clientWidth) nav.scrollTo({ left: Math.max(0, pill.offsetLeft - 12), behavior: 'smooth' });
  }, [active, narrow]);
  const toggle = (id: string) => setOpenIds(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const pinyinToggle = <Button size="sm" variant="outline" className="lesson-pinyin-toggle" aria-pressed={hidePinyin} onClick={() => setHidePinyin(v => !v)}>{hidePinyin ? <Eye aria-hidden="true"/> : <EyeOff aria-hidden="true"/>}{hidePinyin ? 'Show pinyin' : 'Hide pinyin'}</Button>;
  const hanziToggle = <Button size="sm" variant="outline" className="lesson-pinyin-toggle" aria-pressed={hideHanzi} onClick={() => setHideHanzi(v => !v)}>{hideHanzi ? <Eye aria-hidden="true"/> : <EyeOff aria-hidden="true"/>}{hideHanzi ? 'Show hanzi' : 'Hide hanzi'}</Button>;
  const translationsToggle = <Button size="sm" variant="outline" className="lesson-pinyin-toggle" aria-pressed={hideTranslations} onClick={() => setHideTranslations(v => !v)}>{hideTranslations ? <Eye aria-hidden="true"/> : <EyeOff aria-hidden="true"/>}{hideTranslations ? 'Show translations' : 'Hide translations'}</Button>;
  // compact = the floating capsule's short label (its helper line is the label's title there).
  const hintsToggle = (compact: boolean) => <label className="lesson-hints-toggle" title="Hover a character for a ring; click or tap it for a quick card">
    <Switch checked={hintsOn} onCheckedChange={on => setPreferences({ ...preferences, lessonHints: on })} aria-label={compact ? 'Character hints' : undefined} aria-describedby={compact ? undefined : 'lesson-hints-help'}/>
    <span><strong>{compact ? 'Hints' : 'Character hints'}</strong>{!compact && <small id="lesson-hints-help">Hover or tap a character for a quick card</small>}</span>
  </label>;

  return <QuestionProgress.Provider value={progress}><LessonHintsProvider enabled={hintsOn} backLabel={headword ? `Lesson (${headword.hanzi})` : 'Lesson'} characterRefs={lessonCharacterRefs[summary.id]}><div ref={pageRef} className={`lesson-page${hidePinyin ? ' lesson-hide-pinyin' : ''}${hideTranslations ? ' lesson-hide-translations' : ''}${hideHanzi ? ' lesson-hide-hanzi' : ''}${hintsOn ? ' has-hints' : ''}${narrow ? ' is-narrow' : ''}`}>
    <Link to="/lessons" className="lesson-back"><ArrowLeft size={14} aria-hidden="true"/>All lessons</Link>
    {positions.map(p => <CoursePosition key={p.placement.id} position={p}/>)}
    <header className={`lesson-hero${headword ? ' has-headword' : ''}`}>
      {headword && <LessonHeadword hanzi={headword.hanzi} pinyin={headword.pinyin}/>}
      <div className="lesson-hero-copy">
        <div className="eyebrow"><BookText size={12} aria-hidden="true"/>{lessonLabel(summary).toUpperCase()}{summary.primaryCategory && <> · {summary.primaryCategory.label.toUpperCase()}</>}</div>
        <h1>{summary.title}<LessonStatusPill status={summary.status}/></h1>
        {summary.subtitle && <p className="lesson-subtitle"><LessonText text={summary.subtitle}/></p>}
        {summary.description && <p className="lesson-description"><LessonText text={summary.description}/></p>}
        <ul className="lesson-chips">{summary.audience && <li className="is-audience">{summary.audience}</li>}{summary.tags.map(t => <li key={t}>{t.replace(/-/g, ' ')}</li>)}</ul>
      </div>
    </header>
    {(intro.lesson_focus || intro.core_principle || intro.learning_priority || summary.objectives.length > 0) && <div className="lesson-intro">
      {summary.objectives.length > 0 && <div><strong>In this lesson you will</strong><ul className="lesson-objectives">{summary.objectives.map(o => <li key={o}><LessonText text={o}/></li>)}</ul></div>}
      {intro.lesson_focus && <p><strong>Focus</strong><LessonText text={intro.lesson_focus}/></p>}
      {intro.core_principle && <p><strong>Key idea</strong><LessonText text={intro.core_principle}/></p>}
      {intro.learning_priority && <p><strong>Study order</strong><LessonText text={intro.learning_priority}/></p>}
    </div>}
    <div className="lesson-layout">
      <nav ref={toc} className="lesson-toc" aria-label="Lesson sections">
        <span className="eyebrow">IN THIS LESSON</span>
        {/* In-page jump links only (hash anchors scroll within this one page). In the
            narrow layout a pill also opens its collapsed section before the jump. */}
        {sections.map(s => <a key={s.id} href={`#lesson-${s.id}`} data-section={s.id} aria-current={active === s.id ? 'true' : undefined} onClick={() => { if (narrow) setOpenIds(current => current.has(s.id) ? current : new Set([...current, s.id])); }}>{s.title}</a>)}
        {!narrow && hanziToggle}
        {!narrow && pinyinToggle}
        {!narrow && translationsToggle}
        {!narrow && hintsToggle(false)}
      </nav>
      <div className="lesson-main">
        {sections.map(s => {
          if (!narrow) return <section key={s.id} id={`lesson-${s.id}`} className="lesson-section" aria-labelledby={`lesson-${s.id}-title`}><h2 id={`lesson-${s.id}-title`}>{s.title}</h2>{s.body}</section>;
          const open = openIds.has(s.id);
          return <section key={s.id} id={`lesson-${s.id}`} className={`lesson-section is-collapsible${open ? ' is-open' : ''}`} aria-labelledby={`lesson-${s.id}-title`}>
            <h2 id={`lesson-${s.id}-title`}><button type="button" className="lesson-section-toggle" aria-expanded={open} aria-controls={`lesson-${s.id}-body`} onClick={() => toggle(s.id)}>
              <span><span className="lesson-section-title">{s.title}</span><small>{s.hint}</small></span>
              <ChevronDown size={18} aria-hidden="true"/>
            </button></h2>
            <div id={`lesson-${s.id}-body`} className="lesson-section-body" hidden={!open}>{s.body}</div>
          </section>;
        })}
        <ReportProvenance lesson={lesson}/>
        <p className="source-note">{lessonLabel(summary)} · {summary.status}{summary.dateReviewed ? ` · reviewed ${summary.dateReviewed}` : ''}{lesson.metadata.license_note ? ` · ${lesson.metadata.license_note}` : ''}</p>
      </div>
    </div>
  </div>
  {/* Floating study controls (narrow layout only), outside the page's container so they fix to the window. */}
  {narrow && <div className="lesson-float-tools" role="group" aria-label="Study controls">{hanziToggle}{pinyinToggle}{translationsToggle}{hintsToggle(true)}</div>}
  </LessonHintsProvider></QuestionProgress.Provider>;
}

/** Where this lesson sits in one course: course and level, unit, "Lesson N of M", recorded
 *  prerequisites, and Previous/Next within the same level (only the manifest's order). */
function CoursePosition({ position: p }: { position: LessonPosition }) {
  return <nav className="lesson-course-position" aria-label={`${p.course.title}: position`}>
    <div className="lesson-course-where">
      <Library size={14} aria-hidden="true"/>
      <span><Link to="/lessons">{p.section.title}</Link> · {p.unit.title} · <strong>Lesson {p.index} of {p.total}</strong></span>
    </div>
    {p.placement.prerequisites.length > 0 && <p className="lesson-course-after">Before this: {p.placement.prerequisites.map((s, i) => <span key={s.id}>{i > 0 && ', '}<Link to="/lessons/$lessonId" params={{ lessonId: s.id }}>{s.title}</Link></span>)}</p>}
    <div className="lesson-course-steps">
      {p.previous ? <Link to="/lessons/$lessonId" params={{ lessonId: p.previous.id }} className="lesson-course-step"><ArrowLeft size={14} aria-hidden="true"/><span><small>Previous</small>{p.previous.title}</span></Link> : <span/>}
      {p.next && <Link to="/lessons/$lessonId" params={{ lessonId: p.next.id }} className="lesson-course-step is-next"><span><small>Next</small>{p.next.title}</span><ArrowRight size={14} aria-hidden="true"/></Link>}
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

/** Hidden model answer the learner opens after trying first (native disclosure; state is the element's own). */
function Reveal({ label, children }: { label: string; children: ReactNode }) {
  return <details className="lesson-details lesson-reveal"><summary>{label}</summary>{children}</details>;
}

/** Compact word-bank entry: linked headword with its record's audio and HSK number, no example sentences. */
function WordBankCard({ item, record }: { item: TopicVocabItem; record: Word | null }) {
  const hsk = record?.entry?.hskLevel && record.entry.hsk_index ? `HSK ${record.entry.hskLevel} · #${record.entry.hsk_index}` : '';
  return <div className="lesson-card lesson-vocab lesson-bank-word">
    {hsk && <div className="lesson-card-top"><span className="lesson-register is-hsk">{hsk}</span></div>}
    <LessonWord hanzi={item.hanzi} pinyin={item.pinyin} meaning={item.meaning_en} record={record}/>
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

function VocabCard({ item }: { item: LessonVocabItem }) {
  return <div className="lesson-card lesson-vocab">
    <div className="lesson-card-top"><span className="lesson-register">{item.part_of_speech}</span><span className={`lesson-priority is-${item.priority.toLowerCase()}`} title={`Editorial priority ${item.priority}`}>{item.priority}</span></div>
    <LessonWord hanzi={item.hanzi} pinyin={item.pinyin} meaning={item.meaning_en}/>
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
    {(open || answered) && <div className="lesson-answer">{graded ? correctChoices.map(c => <p key={c.id} className="lesson-term"><QuestionChoice choice={c} showMeaning/></p>) : question.answer && <p><strong><LessonText text={question.answer}/></strong></p>}{question.explanation && <p className="lesson-muted"><LessonText text={question.explanation}/></p>}</div>}
  </div></LessonHintsGate>;
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

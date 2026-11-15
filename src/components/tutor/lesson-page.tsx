import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, BookText, Check, ExternalLink, EyeOff, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { correctLessonChoices, type LessonBlock, type LessonChoice, type LessonDocument, type LessonPreference, type LessonQuestion, type LessonSummary, type LessonVocabItem } from '@/lib/lessons';
import { LessonHanzi, LessonSpeaker, LessonTerm, LessonText } from './lesson-text';
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
 * vocabulary priority filter (A/B/C or all). Local state: the "Hide pinyin" study switch
 * and each practice card's revealed answer (both reset when the page is left). The
 * "Character hints" side switch is the remembered `lessonHints` preference (absent = on);
 * it drives LessonHintsProvider live (lesson-hints.tsx).
 *
 * Sections follow the schema order and appear only when they carry content (disabled
 * sections, empty lists and editorial-only extensions are skipped). v2.6 selection
 * questions are graded only through their recorded correct_choice_ids; older and
 * open-ended questions reveal their recorded answer text without grading.
 */

const kindLabel: Record<LessonSummary['kind'], string> = { character: 'Character lesson', word: 'Word lesson', phrase: 'Phrase lesson', topic: 'Topic lesson' };
const mappingLabel: Record<string, string> = { same_written_form: 'Same form in both scripts', one_to_one: 'One traditional form', context_dependent: 'Traditional form depends on context', multiple_targets: 'Several traditional forms' };
/** snake_case enum values read as plain words ("compositional_frequency_phrase" → "compositional frequency phrase"). */
const plain = (value: string) => value.replace(/_/g, ' ');

export function LessonStatusPill({ status }: { status: string }) {
  return status === 'draft' ? <span className="word-hsk-id lesson-draft-pill" title="Draft lesson: not reviewed yet">Draft</span> : null;
}

type SectionDef = { id: string; title: string; body: ReactNode };

export function LessonPage({ lesson, priority, onPriority }: { lesson: LessonDocument; priority: 'A' | 'B' | 'C' | undefined; onPriority: (value: 'A' | 'B' | 'C' | undefined) => void }) {
  const { summary, sections: S, headword, intro } = lesson;
  const [hidePinyin, setHidePinyin] = useState(false);
  const { preferences, setPreferences } = useWorkspace();
  const hintsOn = preferences.lessonHints !== false;
  const learnerExtensions = (S.extensions?.items ?? []).filter(item => item.visibility === 'learner' && item.blocks.length > 0);
  const sourceById = new Map((S.sources?.items ?? []).map(s => [s.id, s]));

  const sections: SectionDef[] = [];
  const overview = S.overview;
  if (overview || headword) sections.push({ id: 'overview', title: 'At a glance', body: <>
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

  const vocab = S.vocabulary?.items ?? [];
  if (vocab.length) {
    const levels = (['A', 'B', 'C'] as const).filter(p => vocab.some(v => v.priority === p));
    const shown = priority ? vocab.filter(v => v.priority === priority) : vocab;
    sections.push({ id: 'vocabulary', title: 'Words to learn first', body: <>
      <p className="lesson-note">Learn these established words whole. Priority A, B and C is the lesson’s editorial order, not a frequency rank.</p>
      {levels.length > 1 && <div className="lesson-filter" role="group" aria-label="Filter words by priority">
        <Button size="sm" variant={priority ? 'outline' : 'default'} aria-pressed={!priority} onClick={() => onPriority(undefined)}>All {vocab.length}</Button>
        {levels.map(p => <Button key={p} size="sm" variant={priority === p ? 'default' : 'outline'} aria-pressed={priority === p} onClick={() => onPriority(p)}>Priority {p} · {vocab.filter(v => v.priority === p).length}</Button>)}
      </div>}
      <div className="lesson-grid lesson-vocab-grid">{shown.map(v => <VocabCard key={v.id} item={v}/>)}</div>
      {S.vocabulary?.notes && <p className="lesson-note"><LessonText text={S.vocabulary.notes}/></p>}
    </> });
  }

  if (S.constructions?.enabled && S.constructions.items.length) sections.push({ id: 'constructions', title: 'Patterns', body: <>
    <div className="lesson-stack">{S.constructions.items.map(c => <div key={c.id} className="lesson-card lesson-pattern">
      <div className="lesson-card-top"><span className="lesson-register">{plain(c.category)}</span><span className="lesson-register"><LessonText text={c.register}/></span></div>
      <p className="lesson-pattern-line"><LessonHanzi hanzi={c.pattern_hanzi}/><span className="pinyin">{c.pattern_pinyin}</span></p>
      <p className="lesson-card-title"><LessonText text={c.function_en}/></p>
      <LessonTerm hanzi={c.example.hanzi} pinyin={c.example.pinyin} meaning={c.example.meaning_en}/>
      {c.usage_note && <p className="lesson-muted"><LessonText text={c.usage_note}/></p>}
    </div>)}</div>
    {S.constructions.structural_note && <p className="lesson-note"><LessonText text={S.constructions.structural_note}/></p>}
  </> });

  if (S.examples?.items.length) sections.push({ id: 'examples', title: 'Example sentences', body: <>
    {S.examples.default_provenance && <p className="lesson-note"><LessonText text={S.examples.default_provenance}/></p>}
    <div className="lesson-stack">{S.examples.items.map(e => <div key={e.id} className="lesson-card lesson-example">
      <div className="lesson-card-top"><strong className="lesson-card-title"><LessonText text={e.title}/></strong>{e.provenance && <span className="lesson-register">{plain(e.provenance)}</span>}</div>
      <SentenceExample sentence={e.hanzi} pinyin={e.pinyin} translation={e.english} heading=""/>
      {(e.context || e.register) && <p className="lesson-muted">{e.context && <LessonText text={e.context}/>}{e.context && e.register ? ' · ' : ''}{e.register && <LessonText text={e.register}/>}</p>}
      {e.teaching_note && <p className="lesson-teaching"><LessonText text={e.teaching_note}/></p>}
    </div>)}</div>
  </> });

  if (S.contrasts && (S.contrasts.items.length || S.contrasts.preference_vs_rule)) sections.push({ id: 'contrasts', title: 'Similar words and contrasts', body: <>
    <div className="lesson-grid">{S.contrasts.items.map(c => <div key={c.id} className="lesson-card">
      <LessonTerm hanzi={c.hanzi} pinyin={c.pinyin} meaning={c.meaning_en} size="lg"/>
      <div className="lesson-example-term"><LessonTerm hanzi={c.example.hanzi} pinyin={c.example.pinyin} meaning={c.example.meaning_en}/></div>
      {c.usage && <p><LessonText text={c.usage}/></p>}
      {c.limitation && <p className="lesson-muted"><LessonText text={c.limitation}/></p>}
    </div>)}</div>
    {S.contrasts.preference_vs_rule && <PreferenceChart preference={S.contrasts.preference_vs_rule} sources={source => sourceById.get(source)?.title ?? source}/>}
  </> });

  if (S.mistakes?.items.length) sections.push({ id: 'mistakes', title: 'Common mistakes', body: <div className="lesson-stack">{S.mistakes.items.map(m => <div key={m.id} className="lesson-card lesson-mistake">
    <p className="lesson-mistake-dont"><small>Avoid</small><span><LessonText text={m.incorrect_inference}/></span></p>
    <p className="lesson-mistake-do"><small>Instead</small><span><LessonText text={m.correction}/></span></p>
    {m.reason && <p className="lesson-muted"><LessonText text={m.reason}/></p>}
  </div>)}</div> });

  if (S.practice?.enabled && S.practice.questions.length) sections.push({ id: 'practice', title: 'Check yourself', body: <div className="lesson-stack">{S.practice.questions.map((q, i) => <QuestionCard key={q.id} question={q} index={i + 1}/>)}</div> });

  if (S.writing && (S.writing.mapping_note || S.writing.pronunciation_note || S.writing.pending_checks?.length)) sections.push({ id: 'writing', title: 'Forms and pronunciation', body: <div className="lesson-grid">
    {S.writing.mapping_note && <div className="lesson-card"><h3>Forms</h3><p><LessonText text={S.writing.mapping_note}/></p></div>}
    {S.writing.pronunciation_note && <div className="lesson-card"><h3>Pronunciation</h3><p><LessonText text={S.writing.pronunciation_note}/></p></div>}
    {S.writing.pending_checks?.length ? <div className="lesson-card"><h3>Still to verify</h3><ul className="lesson-list">{S.writing.pending_checks.map(x => <li key={x}><LessonText text={x}/></li>)}</ul></div> : null}
  </div> });

  if (S.historical?.enabled && S.historical.items.length) sections.push({ id: 'historical', title: 'Classical Chinese (optional)', body: <details className="lesson-details">
    <summary>Show the classical reference</summary>
    {S.historical.intro && <p className="lesson-note"><LessonText text={S.historical.intro}/></p>}
    {S.historical.items.map(h => <div key={h.id} className="lesson-card">
      <p className="lesson-pattern-line"><LessonHanzi hanzi={h.hanzi}/><span className="pinyin">{h.pinyin}</span></p>
      <p className="lesson-card-title"><LessonText text={h.translation_en}/></p>
      <p><LessonText text={h.function_en}/></p>
      <p className="lesson-muted"><LessonText text={h.explanation}/></p>
    </div>)}
    {S.historical.caution && <p className="lesson-caution"><LessonText text={S.historical.caution}/></p>}
  </details> });

  if (learnerExtensions.length) sections.push({ id: 'more', title: 'More from the lesson notes', body: <>
    {S.extensions?.intro && <p className="lesson-note"><LessonText text={S.extensions.intro}/></p>}
    <div className="lesson-stack">{learnerExtensions.map(x => <div key={x.id} className="lesson-card">
      <h3><LessonText text={x.title}/></h3>
      {x.blocks.map((b, i) => <ExtensionBlock key={i} block={b}/>)}
      {x.verification_status && x.verification_status !== 'verified' && <p className="lesson-footnote">{plain(x.verification_status)}</p>}
    </div>)}</div>
  </> });

  if (S.checklist?.items.length) sections.push({ id: 'checklist', title: 'Review checklist', body: <ul className="lesson-list lesson-checklist">{S.checklist.items.map(c => <li key={c.id} className={c.passed ? 'is-passed' : ''}>{c.passed && <Check aria-label="Passed" size={14}/>}<LessonText text={c.label}/></li>)}</ul> });

  if (S.sources?.items.length) sections.push({ id: 'sources', title: 'Sources', body: <>
    <div className="lesson-stack">{S.sources.items.map(s => <div key={s.id} className="lesson-card lesson-source">
      <p><LessonText text={s.claim}/></p>
      <p className="lesson-muted">{[s.author, s.title, s.publication].filter(Boolean).join(' · ')}</p>
      {s.scope_note && <p className="lesson-muted"><LessonText text={s.scope_note}/></p>}
      <p className="lesson-footnote">{plain(s.evidence_type)} · {plain(s.verification_status)}{s.url && <> · <a href={s.url} target="_blank" rel="noopener noreferrer">Open source<ExternalLink size={10} aria-hidden="true"/></a></>}</p>
    </div>)}</div>
    {S.sources.example_provenance && <p className="lesson-note"><LessonText text={S.sources.example_provenance}/></p>}
    {(S.sources.editorial_status || S.sources.licensing) && <p className="lesson-note">{[S.sources.editorial_status, S.sources.licensing].filter(Boolean).join(' ')}</p>}
  </> });

  return <LessonHintsProvider enabled={hintsOn}><div className={`lesson-page${hidePinyin ? ' lesson-hide-pinyin' : ''}${hintsOn ? ' has-hints' : ''}`}>
    <Link to="/lessons" className="lesson-back"><ArrowLeft size={14} aria-hidden="true"/>All lessons</Link>
    <header className={`lesson-hero${headword ? ' has-headword' : ''}`}>
      {headword && <div className="lesson-headword"><LessonHanzi hanzi={headword.hanzi} className="lesson-headword-glyph"/><span className="lesson-headword-reading"><span className="pinyin">{headword.pinyin}</span><LessonSpeaker hanzi={headword.hanzi} pinyin={headword.pinyin}/></span></div>}
      <div className="lesson-hero-copy">
        <div className="eyebrow"><BookText size={12} aria-hidden="true"/>{kindLabel[summary.kind].toUpperCase()}{summary.primaryCategory && <> · {summary.primaryCategory.label.toUpperCase()}</>}</div>
        <h1>{summary.title}<LessonStatusPill status={summary.status}/></h1>
        {summary.subtitle && <p className="lesson-subtitle"><LessonText text={summary.subtitle}/></p>}
        {summary.description && <p className="lesson-description"><LessonText text={summary.description}/></p>}
        <ul className="lesson-chips">{summary.audience && <li className="is-audience">{summary.audience}</li>}{summary.tags.map(t => <li key={t}>{t.replace(/-/g, ' ')}</li>)}</ul>
      </div>
    </header>
    {(intro.lesson_focus || intro.core_principle || intro.learning_priority) && <div className="lesson-intro">
      {intro.lesson_focus && <p><strong>Focus</strong><LessonText text={intro.lesson_focus}/></p>}
      {intro.core_principle && <p><strong>Key idea</strong><LessonText text={intro.core_principle}/></p>}
      {intro.learning_priority && <p><strong>Study order</strong><LessonText text={intro.learning_priority}/></p>}
    </div>}
    <div className="lesson-layout">
      <nav className="lesson-toc" aria-label="Lesson sections">
        <span className="eyebrow">IN THIS LESSON</span>
        {/* In-page jump links only (hash anchors scroll within this one page). */}
        {sections.map(s => <a key={s.id} href={`#lesson-${s.id}`}>{s.title}</a>)}
        <Button size="sm" variant="outline" className="lesson-pinyin-toggle" aria-pressed={hidePinyin} onClick={() => setHidePinyin(v => !v)}>{hidePinyin ? <Eye aria-hidden="true"/> : <EyeOff aria-hidden="true"/>}{hidePinyin ? 'Show pinyin' : 'Hide pinyin'}</Button>
        <label className="lesson-hints-toggle" title="Hover a character for a ring; click or tap it for a quick card">
          <Switch checked={hintsOn} onCheckedChange={on => setPreferences({ ...preferences, lessonHints: on })} aria-describedby="lesson-hints-help"/>
          <span><strong>Character hints</strong><small id="lesson-hints-help">Tap a character for a quick card</small></span>
        </label>
      </nav>
      <div className="lesson-main">
        {sections.map(s => <section key={s.id} id={`lesson-${s.id}`} className="lesson-section" aria-labelledby={`lesson-${s.id}-title`}><h2 id={`lesson-${s.id}-title`}>{s.title}</h2>{s.body}</section>)}
        <ReportProvenance lesson={lesson}/>
        <p className="source-note">{kindLabel[summary.kind]} · {summary.status}{summary.dateReviewed ? ` · reviewed ${summary.dateReviewed}` : ''}{lesson.metadata.license_note ? ` · ${lesson.metadata.license_note}` : ''}</p>
      </div>
    </div>
  </div></LessonHintsProvider>;
}

function VocabCard({ item }: { item: LessonVocabItem }) {
  return <div className="lesson-card lesson-vocab">
    <div className="lesson-card-top"><span className="lesson-register">{item.part_of_speech}</span><span className={`lesson-priority is-${item.priority.toLowerCase()}`} title={`Editorial priority ${item.priority}`}>{item.priority}</span></div>
    <LessonTerm hanzi={item.hanzi} pinyin={item.pinyin} meaning={item.meaning_en} size="lg"/>
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
    {choice.text ? <LessonText text={choice.text}/> : <>{choice.hanzi && <LessonHanzi hanzi={choice.hanzi} focusable={!inButton}/>}{choice.pinyin && <span className="pinyin">{choice.pinyin}</span>}</>}
    {showMeaning && choice.meaning_en && <small><LessonText text={choice.meaning_en}/></small>}
  </>;
}

/** Recorded corpus counts drawn as proportional bars; the numbers are printed beside each bar. */
function PreferenceChart({ preference, sources }: { preference: LessonPreference; sources: (id: string) => string }) {
  return <div className="lesson-card lesson-preference">
    <h3>Preference, not a rule</h3>
    {preference.data.categories.map(c => { const total = c.abstract + c.concrete; const share = total ? Math.round((c.abstract / total) * 100) : 0; return <div key={c.form_hanzi} className="lesson-bar-row">
      <span className="lesson-bar-label"><LessonHanzi hanzi={c.form_hanzi}/><span className="pinyin">{c.form_pinyin}</span></span>
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

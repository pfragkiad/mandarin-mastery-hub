import { useMemo, useState, type ReactNode } from "react";
import { openDetailsHint, practiceHint } from '@/lib/tile-hints';
import { FilterSelect } from './filter-select';
import { Link } from "@tanstack/react-router";
import { Play, RotateCcw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { libraryEntries } from "@/lib/character-library";
import { filterWords, vocabularyFacetOptions, vocabularyKind } from "@/lib/mandarin";
import { ALL_SUBTOPICS, inSubtopic, subtopicById, subtopicOptions } from "@/lib/vocabulary-subtopics";
import { lessonCourseIds, lessonDeckGroups, lessonDeckIds, lessonDeckTitle, type LessonDeckGroup } from "@/lib/flashcard-lessons";
import { libraryFilterOptions } from "@/lib/library-filter-options";
import { includeScript } from "@/lib/learning-preferences";
import { UNRANKED, usageGroupLabel, usageGroups, parseUsageGroup } from "@/lib/usage-frequency";
import {
  drawingKinds,
  drawingPool,
  drawingWordPool,
  shuffledDrawingDeck,
  type DrawingCard,
  type DrawingResult,
  type DrawingSearch,
} from "@/lib/drawing-game";
import { DraftFilterForm, FilterWideningToggle } from "./filter-form";
import { SavedFilterToggle } from "./saved-filter";
import { GameSetup, GameReady, deckSummary } from "./game-setup";
import { GameChoices, GameFilters, GameField, StrokeRangeControl } from "./game-controls";
import { TopicSelect } from "./topic-select";
import { formatStrokeRangeLabel } from "@/lib/stroke-range";
import { GamePlayBar, GameResults, MissedTick, ReviewReason, toggleSkipped, useRoundEnd } from "./game-round";
import { TileBookmark } from "./record-card-footer";
import { ExamplePronunciation } from "./example-pronunciation";
import { MeaningText } from "./meaning-text";
import { characterAudioRequest } from "@/lib/catalog-store";
import { ROUND_SIZES, mixedRound } from "@/lib/pinyin-round";
import { DrawingBoard } from "./drawing-board";
import { useWorkspace } from "./workspace";
import { useDrawingSession } from "./drawing-session";

const deckSizes = ROUND_SIZES; // shared with every game
export function DrawingGamePage({
  search,
  onSearch,
}: {
  search: DrawingSearch;
  onSearch: (search: DrawingSearch) => void;
}) {
  const { items, catalogVersion, preferences, saved, toggleSaved } = useWorkspace();
  const kind = search.kind ?? "Characters";
  const appliedFilters: DrawingSearch = {
    kind,
    collection: search.collection,
    subtopic: search.subtopic,
    level: search.level,
    pos: search.pos,
    course: search.course,
    lesson: search.lesson,
    strokes: search.strokes,
    usage: search.usage,
    saved: search.saved,
    usageUpTo: search.usageUpTo,
    strokesUpTo: search.strokesUpTo,
  };
  const activeFilters = Boolean(
    search.collection || search.subtopic || search.level || search.pos || search.course || search.lesson || search.strokes || search.usage || search.saved,
  );
  const [session, setSession] = useDrawingSession();
  const { deckSize, deck, answers, round, board } = session;
  const setDeckSize = (value: number | "all") => setSession((previous) => ({ ...previous, deckSize: value }));
  const entries = useMemo(() => (kind === "Words" ? [] : libraryEntries(kind)), [kind, catalogVersion]);
  const words = useMemo(() => (items ?? []).filter((word) => vocabularyKind(word) === "word"), [items]);
  // Setup dropdown choices, each narrowed by the other current (draft) picks so a
  // dropdown never offers a choice with no cards behind it. Words share the
  // libraries' vocabularyFacetOptions over the playable words (script preference
  // and Saved only included); glyph ranks/strokes follow the Glyphs library, which
  // narrows Characters, Components and Radicals alike.
  const lessonIdsFor = (draft: DrawingSearch) => {
    const draftKind = draft.kind ?? "Characters";
    if (draftKind !== "Characters" && draftKind !== "Words") return undefined;
    if (draft.lesson) return lessonDeckIds(draft.lesson, draftKind, words);
    return draft.course ? lessonCourseIds(draft.course, draftKind, words) : undefined;
  };
  const wordFacets = (draft: DrawingSearch) => {
    const inLesson = lessonIdsFor(draft);
    const draftSubtopic = draft.subtopic || ALL_SUBTOPICS;
    const kindItems = words.filter((word) => includeScript(word.script, preferences.includeTraditional) && (!draft.saved || saved.includes(word.id)) && (!inLesson || inLesson.has(word.id)));
    const facets = vocabularyFacetOptions(kindItems.filter((w) => inSubtopic(w, draftSubtopic)), { collection: draft.collection || "All collections", level: draft.level || "All levels", pos: draft.pos || "All types" });
    const topicFacets = vocabularyFacetOptions(kindItems, { collection: "All collections", level: draft.level || "All levels", pos: draft.pos || "All types" });
    const subtopics = subtopicOptions(filterWords(kindItems, "", "All collections", draft.level || "All levels", "All words", [], false, draft.pos || "All types"), "All collections", draftSubtopic);
    return { collections: topicFacets.collections, levels: facets.levels, pos: facets.pos, subtopics };
  };
  const glyphFacets = (draft: DrawingSearch, draftKind: Exclude<DrawingSearch["kind"], "Words" | undefined>) => {
    const inLesson = draftKind === "Characters" ? lessonIdsFor(draft) : undefined;
    const all = inLesson ? libraryEntries(draftKind).filter((entry) => inLesson.has(entry.id)) : libraryEntries(draftKind);
    const strokeFilter = draft.strokes ?? "";
    const options = libraryFilterOptions(all, draftKind, preferences.includeTraditional, draft.usage, strokeFilter, draft.usageUpTo === "1", draft.strokesUpTo === "1");
    // A current pick that no longer matches stays listed so the dropdown still shows it.
    const strokes = draft.strokes && !options.strokes.includes(Number(draft.strokes)) ? [...options.strokes, Number(draft.strokes)].sort((a, b) => a - b) : options.strokes;
    const ranks = usageGroups(draftKind).filter((group) => group.value === draft.usage || options.ranks.some((option) => option.value === group.value));
    return { strokes, ranks };
  };
  const lessonChoices = (draft: DrawingSearch): { courses: LessonDeckGroup[]; lessons: LessonDeckGroup[] } => {
    const draftKind = draft.kind ?? "Characters";
    if (draftKind !== "Characters" && draftKind !== "Words") return { courses: [], lessons: [] };
    const baseSearch: DrawingSearch = { ...draft, kind: draftKind, course: undefined, lesson: undefined };
    const others = new Set(
      (draftKind === "Words"
        ? drawingWordPool(words, baseSearch, preferences.includeTraditional, saved)
        : drawingPool(libraryEntries(draftKind), baseSearch, preferences.includeTraditional, saved)
      ).map((card) => card.id),
    );
    const withCards = (g: LessonDeckGroup) => ({ ...g, lessons: g.lessons.filter((l) => [...lessonDeckIds(l.id, draftKind, words)].some((id) => others.has(id))) });
    const courses = lessonDeckGroups().map(withCards).filter((g) => g.lessons.length);
    const stale = draft.course && !courses.some((g) => g.id === draft.course) ? lessonDeckGroups().find((g) => g.id === draft.course) : undefined;
    return { courses: stale ? [...courses, stale] : courses, lessons: draft.course ? courses.filter((g) => g.id === draft.course) : courses };
  };
  // Committed filters alone refresh the dependent menus, never slider or dropdown drafts.
  const appliedKey = JSON.stringify(appliedFilters);
  const setupChoices = useMemo(() => {
    const filters = JSON.parse(appliedKey) as DrawingSearch;
    const selectedKind = filters.kind ?? "Characters";
    return { facets: selectedKind === "Words" ? wordFacets(filters) : undefined,
      glyph: selectedKind === "Words" ? undefined : glyphFacets(filters, selectedKind), ...lessonChoices(filters) };
  }, [appliedKey, words, saved, catalogVersion, preferences.includeTraditional]);
  const pool = useMemo(
    () =>
      kind === "Words"
        ? drawingWordPool(words, search, preferences.includeTraditional, saved)
        : drawingPool(entries, search, preferences.includeTraditional, saved),
    [kind, words, entries, search, preferences.includeTraditional, saved],
  );
  const savedCount = useMemo(
    () =>
      kind === "Words"
        ? drawingWordPool(words, { ...search, saved: true }, preferences.includeTraditional, saved).length
        : drawingPool(entries, { ...search, saved: true }, preferences.includeTraditional, saved).length,
    [kind, words, entries, search, preferences.includeTraditional, saved],
  );
  const done = deck !== null && (session.ended === true || answers.length >= deck.length);
  const card = done ? undefined : deck?.[answers.length];
  const skipped = session.skipped ?? [];
  // The current card's answer as soon as it is drawn or passed (before Next card), keyed by round
  // and position so a later card never inherits it. Counter, progress and End confirmation use it.
  const [settled, setSettled] = useState<{ key: string; result: DrawingResult } | null>(null);
  const cardKey = `${round}:${answers.length}`;
  const pending = card && settled?.key === cardKey ? settled.result : undefined;
  const live = card && pending ? [...answers, { entry: card, result: pending }] : answers;
  const roundSize = deckSize === "all" ? pool.length : Math.min(deckSize, pool.length);
  const review = live
    .filter((answer) => answer.result === "passed" || answer.result === "guided")
    .map((answer) => answer.entry);
  const kept = review.filter((entry) => !skipped.includes(entry.id));
  // Why each card is on the review list: passed without drawing, or drawn with the guide/hints.
  const reasons = new Map(live.flatMap((answer) => (answer.result === "passed" || answer.result === "guided" ? [[answer.entry.id, answer.result] as const] : [])));
  const passedCount = answers.filter((answer) => answer.result === "passed").length;
  const guidedCount = answers.filter((answer) => answer.result === "guided").length;
  const correct = live.filter((answer) => answer.result === "correct").length;
  const unavailable = answers.filter((answer) => answer.result === "unavailable").length;
  const cardsUnit = (n: number) => `${n} ${n === 1 ? "card" : "cards"}`;
  // Play-bar summary of the settings a round is dealt with, e.g. "Characters · Top 100 · 10 cards".
  const settingsLabel = () => {
    const group = kind !== "Words" && search.usage ? usageGroups(kind).find((g) => g.value === search.usage) : undefined;
    const subtopicLabel = search.subtopic ? subtopicById(search.subtopic)?.label : undefined;
    const courseName = search.course ? lessonDeckGroups().find((g) => g.id === search.course)?.label ?? search.course : undefined;
    return [
      kind,
      search.saved ? "Saved" : "All",
      ...(kind === "Words" && search.collection ? [search.collection] : []),
      ...(kind === "Words" && subtopicLabel ? [subtopicLabel] : []),
      ...(kind === "Words" && search.level ? [search.level] : []),
      ...(kind === "Words" && search.pos ? [search.pos] : []),
      ...(courseName ? [courseName] : []),
      ...(search.lesson ? [lessonDeckTitle(search.lesson) ?? search.lesson] : []),
      // Only the rank range ("Rank 1–100"); the dropdown's coverage share would crowd the chip.
      ...(group ? [search.usageUpTo === '1' && group.value !== UNRANKED ? `Rank 1–${group.max.toLocaleString("en-US")}` : usageGroupLabel(group, kind as Exclude<typeof kind, "Words">, preferences.includeTraditional).split(" · ")[0]] : []),
      ...(search.strokes ? [formatStrokeRangeLabel(search.strokes, search.strokesUpTo === '1')] : []),
    ].join(" · ");
  };
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Deal a round from `records`: capped to the deck size, or every record for a review. */
  const deal = (records: DrawingCard[], size: number, isReview: boolean) => {
    setSettingsOpen(false);
    const dealt = shuffledDrawingDeck(records, size);
    setSession((previous) => ({
      ...previous,
      deck: dealt,
      answers: [],
      round: previous.round + 1,
      board: undefined,
      ended: false,
      skipped: [],
      isReview,
      label: isReview ? `Review · ${cardsUnit(dealt.length)}` : `${settingsLabel()} · ${cardsUnit(dealt.length)}`,
    }));
  };
  const start = (records: DrawingCard[], next = false) =>
    deal(records, next || deckSize === "all" ? records.length : deckSize, next);
  const changeSettings = () => {
    setSettingsOpen(false);
    setSession((previous) => ({ ...previous, deck: null, ended: false, board: undefined }));
  };
  const end = useRoundEnd({
    active: Boolean(card),
    answered: live.length,
    onFinish: () => {
      setSettingsOpen(false);
      // Ending keeps a card that was already answered but not yet moved past.
      setSession((previous) => ({ ...previous, answers: live, ended: true, board: undefined }));
    },
    onQuit: changeSettings,
  });
  // Filter changes affect the next deal; keep the current card and answers intact.
  const configure = (next: DrawingSearch) => {
    onSearch(next);
  };

  const setup = (action: ReactNode, summary: ReactNode) => (
    <GameSetup
          summary={summary}
          action={action}
          matchCount={pool.length}
          selection={settingsLabel()}
          preview={pool[0] && <><span className="pinyin">{pool[0].pinyin}</span><span className={`game-preview-hanzi ${kind === 'Radicals' ? 'card-ink-radical' : ''}`} lang="zh-CN">{pool[0].hanzi}</span></>}
          filters={
            <DraftFilterForm
              applied={appliedFilters}
              active={activeFilters}
              count={pool.length}
              showCount={false}
              resetLabel="Reset"
              onApply={configure}
              onClear={() => {
                const empty: DrawingSearch = {
                  kind,
                  collection: undefined,
                  level: undefined,
                  pos: undefined,
                  strokes: undefined,
                  usage: undefined,
                  saved: undefined,
                  usageUpTo: undefined,
                  strokesUpTo: undefined,
                };
                configure({ kind });
                return empty;
              }}
            >
              {({ draft, patch }) => {
                const draftKind = draft.kind ?? "Characters";
                const { facets, glyph, courses, lessons } = setupChoices;
                const draftSubtopic = draft.subtopic || ALL_SUBTOPICS;
                return (
                  <>
                    {/* Row 1: what to draw, plus collection / level / type for Words. */}
                    <div className="game-filter-row">
                    <div className="game-kind-groups">{['Glyphs', 'Vocabulary'].map(group => <GameChoices key={group} label={group} value={draftKind}
                      options={drawingKinds.filter(value => group === 'Glyphs' ? value !== 'Words' : value === 'Words').map(value => ({ value, label: value }))}
                      onChange={value => { const next = drawingKinds.find(k => k === value); if (next) configure({ kind: next, ...(draft.saved ? { saved: true } : {}) }); }}/>)}</div>
                    </div>
                    <GameFilters count={[draft.subtopic && draft.subtopic !== ALL_SUBTOPICS ? draft.subtopic : draft.collection, draft.level, draft.pos, draft.course, draft.lesson, draft.usage, draft.strokes, draft.saved].filter(Boolean).length}>
                    {courses.length > 0 && (
                      <>
                        <GameField label="Course"><FilterSelect
                          ariaLabel="Course"
                          value={draft.course ?? ""}
                          onValueChange={(v) => patch({ course: v || undefined, lesson: undefined })}
                          items={[{ value: "", label: "All courses" }, ...courses.map((g) => ({ value: g.id, label: g.label }))]}
                        /></GameField>
                        <GameField label="Lesson"><FilterSelect
                          ariaLabel="Lesson"
                          value={draft.lesson ?? ""}
                          onValueChange={(v) => patch({ lesson: v || undefined })}
                          items={[{ value: "", label: "All lessons" }, ...lessons.map((g) => ({ label: g.label, options: g.lessons.map((l) => ({ value: l.id, label: l.title, nested: true })) }))]}
                        /></GameField>
                      </>
                    )}
                    {draftKind === "Words" && (
                      <>
                        <GameField label="Topic"><TopicSelect
                          topics={facets?.collections ?? []}
                          subtopics={facets?.subtopics ?? []}
                          collection={draft.collection ?? ""}
                          subtopic={draftSubtopic}
                          allTopics=""
                          allSubtopics=""
                          onChange={(next) => patch({ collection: next.collection || undefined, subtopic: next.subtopic || undefined })}
                        /></GameField>
                        <GameField label="HSK level"><FilterSelect
                          ariaLabel="HSK level"
                          value={draft.level ?? ""}
                          onValueChange={(value) => patch({ level: value || undefined })}
                          items={[{ value: "", label: "All levels" }, ...(facets?.levels ?? []).map((value) => ({ value, label: value }))]}
                        /></GameField>
                        <GameField label="Part of speech"><FilterSelect
                          ariaLabel="Part of speech"
                          value={draft.pos ?? ""}
                          onValueChange={(value) => patch({ pos: value || undefined })}
                          items={[{ value: "", label: "All types" }, ...(facets?.pos ?? []).map((value) => ({ value, label: value }))]}
                        /></GameField>
                      </>
                    )}
                    {/* Exact rank and stroke groups; no new range semantics. */}
                    {draftKind !== "Words" && (
                      <span className="filter-field-row">
                        <GameField label="Frequency"><FilterSelect
                          ariaLabel="Frequency"
                          value={draft.usage ?? ""}
                          onValueChange={(value) => patch({ usage: parseUsageGroup(draftKind, value), usageUpTo: undefined })}
                          items={[{ value: "", label: "All ranks" }, ...(glyph?.ranks ?? []).map((group) => ({ value: group.value, label: usageGroupLabel(group, draftKind, preferences.includeTraditional), triggerLabel: group.label }))]}
                        /></GameField>
                        {draft.usage && draft.usage !== UNRANKED && (
                          <FilterWideningToggle
                            active={draft.usageUpTo === "1"}
                            onToggle={() => patch({ usageUpTo: draft.usageUpTo ? undefined : "1" })}
                            label="+ lower ranks"
                            title="Also include every more frequent rank above the selected group"
                          />
                        )}
                      </span>
                    )}
                    {draftKind !== "Words" && (
                      <StrokeRangeControl
                        value={draft.strokes ?? ""}
                        strokesUpTo={draft.strokesUpTo === "1"}
                        onChange={(value) => patch({ strokes: value || undefined, strokesUpTo: undefined })}
                      />
                    )}
                    {/* Saved-only: the libraries' bookmark + count toggle, last in the row; part of the auto-applied draft. */}
                    <SavedFilterToggle
                      labelled
                      on={Boolean(draft.saved)}
                      count={savedCount}
                      noun="cards"
                      onToggle={() => patch({ saved: draft.saved ? undefined : true })}
                    />
                    </GameFilters>
                  </>
                );
              }}
            </DraftFilterForm>
          }
        >
          <GameChoices label="Cards" value={String(deckSize)} onChange={value => setDeckSize(value === 'all' ? 'all' : Number(value))}
            options={[...deckSizes.map(n => ({ value: String(n), label: String(n) })), { value: 'all', label: 'All' }]}/>
        </GameSetup>
  );
  return (
    <div className="page-enter game-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">RECALL · WRITE · REMEMBER</div>
          <h1>Drawing game</h1>
        </div>
        <span className="heading-hanzi">
          写<span>xiě</span>
        </span>
      </div>
      {/* Game dropdowns apply immediately: filters only shape the next deal, never the active round. */}
      {!deck && (
        <>
          {setup(
            <Button disabled={!pool.length} onClick={() => start(pool)} aria-label={`Start · ${cardsUnit(roundSize)}`}>
              <Play />
              Start
            </Button>,
            catalogVersion ? deckSummary(roundSize, pool.length) : undefined,
          )}
          <GameReady available={pool.length > 0} loading={!catalogVersion} />
        </>
      )}
      {deck && !done && (
        <section className="game-play" aria-label="Game">
          <GamePlayBar
            summary={session.label}
            settingsOpen={settingsOpen}
            onToggleSettings={() => setSettingsOpen((open) => !open)}
            onRestart={() =>
              session.isReview ? start([...new Map(deck.map((c) => [c.id, c])).values()], true) : start(pool)
            }
            restartDisabled={!session.isReview && !pool.length}
            restartLabel="New round"
            end={end}
          />
          {settingsOpen &&
            setup(
              <Button disabled={!pool.length} onClick={() => start(pool)} aria-label={`Restart · ${cardsUnit(roundSize)}`}>
                <RotateCcw />
                Restart with these
              </Button>,
              <>Changes apply to the next round · {deckSummary(roundSize, pool.length)}</>,
            )}
          {card && (
            <div className="flash-stage drawing-stage">
              <div className="flash-meta">
                <span>
                  Card {answers.length + 1} of {deck?.length}
                </span>
                <span>
                  {correct} correct · {review.length} to review
                </span>
              </div>
              <progress
                className="drawing-progress"
                value={live.length}
                max={deck?.length ?? 1}
                aria-label="Round progress"
              />
              <DrawingBoard
                key={`${round}:${card.id}`}
                entry={card}
                last={answers.length + 1 >= deck.length}
                restored={board}
                onSettle={(result) => setSettled({ key: cardKey, result })}
                onPractice={(snapshot) => setSession((previous) => ({ ...previous, board: snapshot }))}
                onFinish={(result) =>
                  setSession((previous) => ({
                    ...previous,
                    board: undefined,
                    answers: [...previous.answers, { entry: card, result }],
                  }))
                }
              />
              <p className="game-play-keys">{answers.length + 1 >= deck.length ? "Enter see results" : "Enter next card"} · Esc ends the round</p>
            </div>
          )}
        </section>
      )}
      {done && deck && (
        <GameResults
          eyebrow={session.isReview ? "Review complete" : session.ended ? "Session ended" : "Session complete"}
          score={correct}
          total={answers.length - unavailable}
          unit="drawn correctly"
          sub={
            <>
              {answers.length} of {deck.length} played
              {passedCount ? ` · ${passedCount} passed` : ""}
              {guidedCount ? ` · ${guidedCount} needed hints` : ""}
              {unavailable ? ` · ${unavailable} without writing data` : ""}
            </>
          }
          listTitle="To review"
          listKind="drawn"
          hasList={review.length > 0}
          empty={answers.length ? "Every card drawn — well done." : "No cards answered in this round."}
          actions={
            <>
              {review.length > 0 && (
                <Button onClick={() => start(kept, true)} disabled={!kept.length}>
                  <Target />
                  Review these ({kept.length})
                </Button>
              )}
              <Button
                variant={review.length ? "outline" : "default"}
                disabled={!pool.length && !kept.length}
                onClick={() => deal(mixedRound(pool, deckSize === "all" ? pool.length : deckSize, kept), Number.MAX_SAFE_INTEGER, false)}
              >
                <Play />
                {kept.length ? "New round + these" : "New round"}
              </Button>
              <Button variant="ghost" onClick={changeSettings}>
                Change settings
              </Button>
            </>
          }
          note={review.length > 0 && "Cards you draw correctly in a review round drop off the list."}
        >
          {review.map((entry) => {
            const prompt = entry.word ?? entry;
            const request = { ...characterAudioRequest(prompt.hanzi, prompt.pinyin), audio: entry.word?.audio ?? null };
            return (
              <MissedTick
                key={entry.id}
                label={prompt.hanzi}
                kept={!skipped.includes(entry.id)}
                onToggle={() => setSession((previous) => ({ ...previous, skipped: toggleSkipped(previous.skipped ?? [], entry.id) }))}
              >
                {entry.word ? (
                  <Link
                    to="/vocabulary"
                    search={{ tab: "word", word: entry.id }}
                    className="game-missed-hanzi"
                    lang="zh-CN"
                    title={openDetailsHint(entry.word.hanzi, "word")}
                  >
                    {entry.word.hanzi}
                  </Link>
                ) : (
                  <Link
                    to="/strokes"
                    search={{
                      character: entry.hanzi,
                      ...(entry.radicalVariant ? { family: entry.kangxiIndex, variant: entry.radicalVariant } : {}),
                    }}
                    className={`game-missed-hanzi${entry.script === "Traditional" ? " traditional-character" : ""}`}
                    lang="zh-CN"
                    title={practiceHint(entry.hanzi)}
                  >
                    {entry.hanzi}
                  </Link>
                )}
                <span className="game-missed-reading example-pinyin-row">
                  <span className="pinyin">{prompt.pinyin}</span>
                  <ExamplePronunciation request={request} label={prompt.hanzi} />
                </span>
                <span className="game-missed-note">
                  {entry.word ? <>Drew <span lang="zh-CN">{entry.hanzi}</span> · </> : null}
                  <MeaningText text={prompt.meaning} />
                </span>
                <ReviewReason reason={reasons.get(entry.id) ?? "passed"} />
                <TileBookmark hanzi={prompt.hanzi} bookmarked={saved.includes(entry.id)} onBookmark={() => toggleSaved(entry.id)} />
              </MissedTick>
            );
          })}
        </GameResults>
      )}
    </div>
  );
}

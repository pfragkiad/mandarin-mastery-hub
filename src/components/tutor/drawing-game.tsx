import { useMemo, useState, type ReactNode } from "react";
import { openDetailsHint, practiceHint } from '@/lib/tile-hints';
import { Link } from "@tanstack/react-router";
import { Play, RotateCcw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { libraryEntries } from "@/lib/character-library";
import { partOfSpeechOptions, vocabularyKind } from "@/lib/mandarin";
import { usageGroupLabel, usageGroups, parseUsageGroup } from "@/lib/usage-frequency";
import {
  drawingKinds,
  drawingPool,
  drawingWordPool,
  shuffledDrawingDeck,
  type DrawingCard,
  type DrawingResult,
  type DrawingSearch,
} from "@/lib/drawing-game";
import { DraftFilterForm } from "./filter-form";
import { GameSetup, GameReady, deckSummary } from "./game-setup";
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
    level: search.level,
    pos: search.pos,
    strokes: search.strokes,
    usage: search.usage,
    saved: search.saved,
  };
  const activeFilters = Boolean(
    search.collection || search.level || search.pos || search.strokes || search.usage || search.saved,
  );
  const [session, setSession] = useDrawingSession();
  const { deckSize, deck, answers, round, board } = session;
  const setDeckSize = (value: number | "all") => setSession((previous) => ({ ...previous, deckSize: value }));
  const entries = useMemo(() => (kind === "Words" ? [] : libraryEntries(kind)), [kind, catalogVersion]);
  const words = useMemo(() => (items ?? []).filter((word) => vocabularyKind(word) === "word"), [items]);
  const collections = [...new Set(words.map((word) => word.collection))].sort((a, b) => a.localeCompare(b));
  const posOptions = partOfSpeechOptions(words);
  const levels = [...new Set(words.map((word) => word.level))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
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
    return [
      kind,
      search.saved ? "Saved" : "All",
      ...(kind === "Words" && search.collection ? [search.collection] : []),
      ...(kind === "Words" && search.level ? [search.level] : []),
      ...(kind === "Words" && search.pos ? [search.pos] : []),
      // Only the rank range ("Rank 1–100"); the dropdown's coverage share would crowd the chip.
      ...(group ? [usageGroupLabel(group, kind as Exclude<typeof kind, "Words">, preferences.includeTraditional).split(" · ")[0]] : []),
      ...(search.strokes ? [`${search.strokes} ${search.strokes === "1" ? "stroke" : "strokes"}`] : []),
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
          filters={
            <DraftFilterForm
              applied={appliedFilters}
              active={activeFilters}
              count={pool.length}
              showCount={false}
              autoApply
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
                };
                configure({ kind });
                return empty;
              }}
            >
              {({ draft, patch, setDraft }) => {
                const draftKind = draft.kind ?? "Characters";
                const filtered = draftKind === "Radicals" || draftKind === "Components";
                return (
                  <>
                    <select
                      className="filter-select"
                      aria-label="Drawing category"
                      value={draftKind}
                      onChange={(event) => {
                        const next = drawingKinds.find((value) => value === event.target.value);
                        if (next) setDraft({ kind: next, ...(draft.saved ? { saved: true } : {}) });
                      }}
                    >
                      {drawingKinds.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                    <div className="vocabulary-saved-filter" role="group" aria-label="Saved cards">
                      <Button
                        type="button"
                        variant="ghost"
                        className={!draft.saved ? "selected" : ""}
                        aria-pressed={!draft.saved}
                        onClick={() => patch({ saved: undefined })}
                      >
                        All
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className={draft.saved ? "selected" : ""}
                        aria-pressed={Boolean(draft.saved)}
                        onClick={() => patch({ saved: true })}
                      >
                        Saved<span className="catalog-tab-count">{savedCount}</span>
                      </Button>
                    </div>
                    {draftKind === "Words" && (
                      <>
                        <select
                          className="filter-select"
                          aria-label="Collection"
                          value={draft.collection ?? ""}
                          onChange={(event) => patch({ collection: event.target.value || undefined })}
                        >
                          <option value="">All collections</option>
                          {collections.map((value) => (
                            <option key={value}>{value}</option>
                          ))}
                        </select>
                        <select
                          className="filter-select"
                          aria-label="HSK level"
                          value={draft.level ?? ""}
                          onChange={(event) => patch({ level: event.target.value || undefined })}
                        >
                          <option value="">All levels</option>
                          {levels.map((value) => (
                            <option key={value}>{value}</option>
                          ))}
                        </select>
                        <select
                          className="filter-select"
                          aria-label="Part of speech"
                          value={draft.pos ?? ""}
                          onChange={(event) => patch({ pos: event.target.value || undefined })}
                        >
                          <option value="">All types</option>
                          {posOptions.map((value) => (
                            <option key={value}>{value}</option>
                          ))}
                        </select>
                      </>
                    )}
                    {draftKind !== "Words" && (
                      <select
                        className="filter-select"
                        aria-label="Frequency"
                        value={draft.usage ?? ""}
                        onChange={(event) => patch({ usage: parseUsageGroup(draftKind, event.target.value) })}
                      >
                        <option value="">All ranks</option>
                        {usageGroups(draftKind).map((group) => (
                          <option key={group.value} value={group.value}>
                            {usageGroupLabel(group, draftKind, preferences.includeTraditional)}
                          </option>
                        ))}
                      </select>
                    )}
                    {filtered && (
                      <select
                        className="filter-select"
                        aria-label="Stroke count"
                        value={draft.strokes ?? ""}
                        onChange={(event) => patch({ strokes: event.target.value || undefined })}
                      >
                        <option value="">All stroke counts</option>
                        {[
                          ...new Set(
                            libraryEntries(draftKind).flatMap((entry) => (entry.strokes ? [entry.strokes] : [])),
                          ),
                        ]
                          .sort((a, b) => a - b)
                          .map((value) => (
                            <option key={value} value={value}>
                              {value} {value === 1 ? "stroke" : "strokes"}
                            </option>
                          ))}
                      </select>
                    )}
                  </>
                );
              }}
            </DraftFilterForm>
          }
        >
          <select
            className="filter-select"
            aria-label="Deck size"
            value={String(deckSize)}
            onChange={(event) => {
              setDeckSize(event.target.value === "all" ? "all" : Number(event.target.value));
            }}
          >
            {deckSizes.map((n) => (
              <option key={n} value={n}>
                {n} cards
              </option>
            ))}
            <option value="all">All cards</option>
          </select>
        </GameSetup>
  );
  return (
    <div className="page-enter">
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
              <p className="game-play-keys">Enter next card · Esc ends the round</p>
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

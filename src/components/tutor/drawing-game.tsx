import { useMemo } from "react";
import { openDetailsHint, practiceHint } from '@/lib/tile-hints';
import { Link } from "@tanstack/react-router";
import { ArrowRight, Bookmark, Check, Play, RotateCcw } from "lucide-react";
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
  type DrawingSearch,
} from "@/lib/drawing-game";
import { DraftFilterForm } from "./filter-form";
import { GameSetup, GameReady } from "./game-setup";
import { DrawingBoard } from "./drawing-board";
import { useWorkspace } from "./workspace";
import { useDrawingSession } from "./drawing-session";

const deckSizes = [5, 10, 15, 20, 30, 40, 50] as const;
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
  const card = deck?.[answers.length];
  const done = deck !== null && !card;
  const roundSize = deckSize === "all" ? pool.length : Math.min(deckSize, pool.length);
  const review = answers
    .filter((answer) => answer.result === "passed" || answer.result === "guided")
    .map((answer) => answer.entry);
  const unsavedReview = review.filter((entry) => !saved.includes(entry.id));
  const correct = answers.filter((answer) => answer.result === "correct").length;
  const unavailable = answers.filter((answer) => answer.result === "unavailable").length;
  const start = (records: DrawingCard[], next = false) =>
    setSession((previous) => ({
      ...previous,
      deck: shuffledDrawingDeck(records, next || deckSize === "all" ? records.length : deckSize),
      answers: [],
      round: previous.round + 1,
      board: undefined,
    }));
  // Filter changes affect the next deal; keep the current card and answers intact.
  const configure = (next: DrawingSearch) => {
    onSearch(next);
  };

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
      <GameSetup
        filters={
          <DraftFilterForm
            applied={appliedFilters}
            active={activeFilters}
            count={pool.length}
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
        <div className="flash-start">
          <Button disabled={!pool.length} onClick={() => start(pool)}>
            {deck ? <RotateCcw /> : <Play />}
            {deck ? "New round" : "Start"} · {roundSize} {roundSize === 1 ? "card" : "cards"}
          </Button>
        </div>
      </GameSetup>
      {!deck && <GameReady available={pool.length > 0} loading={!catalogVersion} />}
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
            value={answers.length}
            max={deck?.length ?? 1}
            aria-label="Round progress"
          />
          <DrawingBoard
            key={`${round}:${card.id}`}
            entry={card}
            restored={board}
            onPractice={(snapshot) => setSession((previous) => ({ ...previous, board: snapshot }))}
            onFinish={(result) =>
              setSession((previous) => ({
                ...previous,
                board: undefined,
                answers: [...previous.answers, { entry: card, result }],
              }))
            }
          />
        </div>
      )}
      {done && (
        <div className="flash-stage">
          <section className="drawing-results">
            <span className="eyebrow">ROUND COMPLETE</span>
            <strong>
              {correct} / {answers.length - unavailable}
            </strong>
            <p>
              {correct} correct · {review.length} to review{unavailable ? ` · ${unavailable} without writing data` : ""}
            </p>
            {review.length > 0 && (
              <div className="flash-missed">
                {review.map((entry) =>
                  entry.word ? (
                    <Link
                      key={entry.id}
                      to="/vocabulary"
                      search={{ tab: "word", word: entry.id }}
                      title={openDetailsHint(entry.word.hanzi, 'word')}
                    >
                      <span lang="zh-CN">{entry.word.hanzi}</span>
                      <small>
                        {entry.word.pinyin} · {entry.hanzi}
                      </small>
                    </Link>
                  ) : (
                    <Link
                      key={entry.id}
                      to="/strokes"
                      search={{
                        character: entry.hanzi,
                        ...(entry.radicalVariant ? { family: entry.kangxiIndex, variant: entry.radicalVariant } : {}),
                      }}
                      title={practiceHint(entry.hanzi)}
                    >
                      <span lang="zh-CN">{entry.hanzi}</span>
                      <small>{entry.pinyin}</small>
                    </Link>
                  ),
                )}
              </div>
            )}
            {review.length > 0 && (
              <div className="flex justify-center mb-4">
                <Button
                  variant="outline"
                  disabled={!unsavedReview.length}
                  onClick={() => unsavedReview.forEach((entry) => toggleSaved(entry.id))}
                >
                  {unsavedReview.length ? <Bookmark /> : <Check />}
                  {unsavedReview.length
                    ? `Save ${unsavedReview.length} unknown ${unsavedReview.length === 1 ? "card" : "cards"}`
                    : "Unknown cards saved"}
                </Button>
              </div>
            )}
            {review.length > 0 && !unsavedReview.length && (
              <p className="text-center mb-4" role="status">
                Bookmarked in Saved for this session.
              </p>
            )}
            <div className="drawing-actions">
              {review.length > 0 && (
                <Button onClick={() => start(review, true)}>
                  <RotateCcw />
                  Review cards
                </Button>
              )}
              <Button variant="outline" onClick={() => start(pool)}>
                New round
                <ArrowRight />
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

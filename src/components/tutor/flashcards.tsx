import { SavedFilterToggle } from './saved-filter';
import { DraftFilterForm, FilterWideningToggle } from './filter-form';
import { FilterSelect } from './filter-select';
import { TopicSelect } from './topic-select';
import { openDetailsHint } from '@/lib/tile-hints';
import { GameSetup, GameReady, deckSummary } from './game-setup';
import { GameChoices, GameFilters, GameField } from './game-controls';
import { GamePlayBar, GameResults, MissedTick, toggleSkipped, useRoundEnd } from './game-round';
import { ExamplePronunciation } from './example-pronunciation';
import { TileBookmark } from './record-card-footer';
import { ROUND_SIZES, mixedRound } from '@/lib/pinyin-round';
import { MeaningText } from './meaning-text';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFlashcardSession, type FlashCard } from './flashcard-session';
import { DetailsIcon } from './practice-icons';
import { detailTrail } from '@/lib/detail-trail';
import { RotateCcw, Volume2, Check, X, Play, Target, BookText } from 'lucide-react';
import { cardLessons, lessonCourseIds, lessonDeckGroups, lessonDeckIds, lessonDeckKind, lessonDeckTitle, type LessonDeckGroup } from '@/lib/flashcard-lessons';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { includeScript } from '@/lib/learning-preferences';
import { collections as allCollections, filterWords, matchesTopic, partOfSpeechList, vocabularyFacetOptions, vocabularyKind, type Word } from '@/lib/mandarin';
import { ALL_IDIOM_BANDS, filterIdioms, loadIdioms, type IdiomRankClass } from '@/lib/idioms';
import { ALL_SUBTOPICS, inSubtopic, subtopicById, subtopicOptions } from '@/lib/vocabulary-subtopics';
import { libraryFilterOptions } from '@/lib/library-filter-options';
import { DEFAULT_FLASHCARD_KIND, flashcardKindLabel, flashcardKinds, flashcardVocabularyKind } from '@/lib/flashcard-filters';
import { matchesPhraseStyle } from '@/lib/data-contract';
import { audioCandidates, playPronunciation } from '@/lib/audio';
import { characterAudioRequest } from '@/lib/catalog-store';
import { MultiReadingSpeakers, isMultiReading } from './reading-speakers';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { referenceCatalog, libraryEntries, savedGlyphEntry, savedGlyphDestination, type LibraryEntry, type LibraryKind, type ReferenceKind } from '@/lib/character-library';
import { cardMeaning } from '@/lib/glyph-presentation';
import { characterMeaning } from '@/lib/vocabulary-meaning';
import { useWorkspace } from './workspace';
import { UNRANKED, usageGroupLabel, usageGroups, usageRank, usageRankMatches, parseUsageGroup } from '@/lib/usage-frequency';

type Card = FlashCard;
const libraryKinds: Record<ReferenceKind, LibraryKind> = { Radical: 'Radicals', Component: 'Components', Character: 'Characters' };
const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = b[i] as T; b[i] = b[j] as T; b[j] = t; } return b; };

const deckSizes = ROUND_SIZES; // shared with every game

/** `category` is a flashcardKinds value (glyph kind or Words/Phrases); `collection` narrows vocabulary ('' = all collections). */
export type FlashcardFilters = { category: string; collection?: string | undefined; subtopic?: string | undefined; level: string; pos: string; usage: string; strokes?: string | undefined; saved?: boolean | undefined; /** '1' widens the rank group to rank 1..group end ("include lower ranks"). */ usageUpTo?: '1' | undefined; /** '1' widens the stroke count to 1..count ("include fewer strokes"). */ strokesUpTo?: '1' | undefined; /** Phrases only: recorded sentence style (Conversational / Written / Unclassified); empty = all styles. */ style?: string | undefined; /** Characters only: a course ID; the deck keeps only the cards that course's lessons record (flashcard-lessons.ts). */ course?: string | undefined; /** Characters only: a lesson ID; the deck keeps only the cards that lesson records. */ lesson?: string | undefined };
/** Last answer → results: the bar's 0.3s fill to 100% plus a short hold before the switch. */
const FINISH_PAUSE_MS = 450;
const idiomBandRangeLabel = (band: IdiomRankClass) => `${band.from.toLocaleString('en-US')}–${band.to.toLocaleString('en-US')}`;

export function FlashcardsPage({ category: controlledCategory, collection: controlledCollection, subtopic: controlledSubtopic, level: controlledLevel, pos: controlledPos, usage: controlledUsage, strokes: controlledStrokes, saved: controlledSaved, usageUpTo: controlledUsageUpTo, strokesUpTo: controlledStrokesUpTo, style: controlledStyle, course: controlledCourse, lesson: controlledLesson, onFiltersChange }: Partial<FlashcardFilters> & { onFiltersChange?: (filters: FlashcardFilters) => void } = {}) {
  const { items, preferences, saved, toggleSaved, catalogVersion } = useWorkspace();
  const [idiomWords, setIdiomWords] = useState<Word[]>([]);
  const [idiomRankClasses, setIdiomRankClasses] = useState<IdiomRankClass[]>([]);
  const [localFilters, setLocalFilters] = useState<FlashcardFilters>({ category: DEFAULT_FLASHCARD_KIND, collection: '', level: 'All levels', pos: 'All types', usage: '', strokes: '' });
  const applied: FlashcardFilters = { category: controlledCategory ?? localFilters.category, collection: controlledCollection ?? localFilters.collection ?? '', subtopic: controlledSubtopic ?? localFilters.subtopic ?? '', level: controlledLevel ?? localFilters.level, pos: controlledPos ?? localFilters.pos, usage: controlledUsage ?? localFilters.usage, strokes: controlledStrokes ?? localFilters.strokes, saved: controlledSaved ?? localFilters.saved, usageUpTo: controlledUsageUpTo ?? localFilters.usageUpTo, strokesUpTo: controlledStrokesUpTo ?? localFilters.strokesUpTo, style: controlledStyle ?? localFilters.style, course: controlledCourse ?? localFilters.course, lesson: controlledLesson ?? localFilters.lesson };
  const { category, level, pos, usage, strokes, usageUpTo, strokesUpTo } = applied;
  useEffect(() => {
    if (category !== 'Idioms' || idiomWords.length) return;
    let cancelled = false;
    void loadIdioms().then(({ dataset, words }) => {
      if (cancelled) return;
      setIdiomWords(words);
      setIdiomRankClasses(dataset.rankClasses);
    });
    return () => { cancelled = true; };
  }, [category, idiomWords.length]);
  // Style only narrows the Phrases deck; a stale value never empties another kind.
  const style = flashcardVocabularyKind(category) === 'phrase' ? applied.style ?? '' : '';
  const collection = applied.collection ?? '';
  const subtopic = applied.subtopic ?? '';
  // The Course → Lesson pair belongs to the kinds that have lesson decks (Characters and
  // Words); a stale value from another kind never empties its deck.
  const course = lessonDeckKind(category) ? applied.course ?? '' : '';
  const lesson = lessonDeckKind(category) ? applied.lesson ?? '' : '';
  const courseLabel = (id: string) => lessonDeckGroups().find(g => g.id === id)?.label ?? id;
  const savedOnly = Boolean(applied.saved);
  const activeFilters = Boolean(collection || subtopic || level !== 'All levels' || pos !== 'All types' || style || usage || strokes || savedOnly || course || lesson);
  const configure = (filters: FlashcardFilters) => { setLocalFilters(filters); onFiltersChange?.(filters); };
  // The round lives in root session state so opening a card's Details and pressing
  // Back resumes the same card (still turned over) instead of a fresh setup.
  const [session, setSession] = useFlashcardSession();
  const { direction, showFrontPinyin, deckSize, deck, index, flipped, missed, repeat, round } = session;
  const patch = (next: Partial<typeof session>) => setSession(s => ({ ...s, ...next }));
  // Coming back from details ends that details-Back step, so a later details window
  // opened from a library grid never offers a stale "Back to Flashcards".
  useEffect(() => { detailTrail.clear(); }, []);
  // Details for the exact record (vocabulary entry or library glyph, incl. saved
  // radical variants). Back in the details window returns here via history.
  const detailsFor = (c: Card) => c.libraryKind
    ? { to: '/characters' as const, search: c.radicalVariant ? savedGlyphDestination(c as LibraryEntry) : { tab: c.libraryKind, id: c.id } }
    : { to: '/vocabulary' as const, search: { word: c.id, tab: vocabularyKind(c as unknown as Word) } };
  const rememberReturn = () => detailTrail.replace({ label: 'Flashcards', href: window.location.href });
  // Exact card IDs the lesson pick records for a kind: an exact lesson wins over its course,
  // and a course takes the union of its lessons' decks. Kinds without the picker, and drafts
  // with neither picked, have none (undefined = no lesson narrowing).
  const lessonIds = (draft: FlashcardFilters) => {
    const kind = lessonDeckKind(draft.category);
    if (!kind) return undefined;
    if (draft.lesson) return lessonDeckIds(draft.lesson, kind, items);
    return draft.course ? lessonCourseIds(draft.course, kind, items) : undefined;
  };
  // Topic / level / type / style options come from the records of the chosen
  // vocabulary kind (Words or Phrases) under the draft's Saved-only choice, and each
  // dropdown is narrowed by the other current picks (shared vocabularyFacetOptions),
  // so a dropdown never offers a choice with no cards behind it.
  const vocabularyFacets = (draft: FlashcardFilters) => {
    const vocabKind = flashcardVocabularyKind(draft.category);
    const draftSubtopic = draft.subtopic || ALL_SUBTOPICS;
    if (vocabKind === 'idiom') {
      const draftTopic = draft.collection || 'All collections';
      const idiomPool = filterIdioms(idiomWords, idiomRankClasses, '', draft.usage || ALL_IDIOM_BANDS, draft.saved ? 'Saved words' : 'All words', saved, false, false, draft.usageUpTo === '1');
      const idiomTopics = allCollections.filter(c => c !== 'All collections' && (c === draftTopic || idiomPool.some(w => w.collection === c || w.collections?.includes(c))));
      const idiomSubtopics = subtopicOptions(filterIdioms(idiomWords, idiomRankClasses, '', draft.usage || ALL_IDIOM_BANDS, draft.saved ? 'Saved words' : 'All words', saved, false, false, draft.usageUpTo === '1'), 'All collections', draftSubtopic);
      return { styles: [] as string[], collections: idiomTopics, levels: [] as string[], posOptions: [] as string[], subtopics: idiomSubtopics };
    }
    const inLesson = lessonIds(draft);
    const kindItems = vocabKind ? items.filter(w => vocabularyKind(w) === vocabKind && (!draft.saved || saved.includes(w.id)) && (!inLesson || inLesson.has(w.id))) : [];
    const facets = vocabularyFacetOptions(kindItems.filter(w => inSubtopic(w, draftSubtopic)), { collection: draft.collection || 'All collections', level: draft.level ?? 'All levels', pos: draft.pos ?? 'All types', style: vocabKind === 'phrase' ? draft.style : undefined });
    const topicFacets = vocabularyFacetOptions(kindItems, { collection: 'All collections', level: draft.level, pos: draft.pos, style: vocabKind === 'phrase' ? draft.style : undefined });
    const subtopics = subtopicOptions(filterWords(kindItems, '', 'All collections', draft.level ?? 'All levels', 'All words', [], false, draft.pos ?? 'All types').filter(w => matchesPhraseStyle(w.entry, vocabKind === 'phrase' ? draft.style : undefined)), 'All collections', draftSubtopic);
    return { styles: vocabKind === 'phrase' && kindItems.length ? facets.styles : [], collections: topicFacets.collections, levels: facets.levels, posOptions: facets.pos, subtopics };
  };
  // Glyph decks: rank groups and stroke counts narrow each other the same way the
  // Glyphs library does, for Characters, Components and Radicals alike.
  const glyphFacets = (draft: FlashcardFilters, refKind: LibraryKind) => {
    const inLesson = refKind === 'Characters' ? lessonIds(draft) : undefined;
    const entries = inLesson ? libraryEntries(refKind).filter(entry => inLesson.has(entry.id)) : libraryEntries(refKind);
    const allStrokes = [...new Set(entries.flatMap(entry => entry.strokes ? [entry.strokes] : []))].sort((a, b) => a - b);
    if (refKind !== 'Characters' && refKind !== 'Components' && refKind !== 'Radicals') return { strokes: allStrokes, ranks: usageGroups(refKind) };
    const options = libraryFilterOptions(entries, refKind, preferences.includeTraditional, parseUsageGroup(refKind, draft.usage), draft.strokes ?? '', draft.usageUpTo === '1', draft.strokesUpTo === '1');
    const current = parseUsageGroup(refKind, draft.usage);
    const strokes = draft.strokes && !options.strokes.includes(Number(draft.strokes)) ? [...options.strokes, Number(draft.strokes)].sort((a, b) => a - b) : options.strokes;
    const ranks = current && !options.ranks.some(g => g.value === current) ? usageGroups(refKind).filter(g => g.value === current || options.ranks.some(o => o.value === g.value)) : options.ranks;
    return { strokes, ranks };
  };
  const isReference = category.startsWith('Ref:');

  // Deck pool for a set of filters; `savedFilter` narrows it to bookmarked records, like the
  // Drawing game's All/Saved switch. Saved radical variants join the Radicals pool.
  // Taking the filters as an argument lets the Lesson dropdown test each lesson against
  // the other current picks, so it never offers a lesson with no cards behind it.
  const poolFor = (f: FlashcardFilters, savedFilter: boolean): Card[] => {
    const fStyle = flashcardVocabularyKind(f.category) === 'phrase' ? f.style ?? '' : '';
    const referenceCards = (kind: ReferenceKind) => {
      const reference = referenceCatalog.find(c => c.kind === kind);
      if (!reference) return [];
      const libraryKind = libraryKinds[reference.kind];
      return reference.entries.filter(row => includeScript(row[4], preferences.includeTraditional)).map(([hanzi, pinyin, meaning, , script]) => ({ id: `${libraryKind}:${hanzi}`, libraryKind, hanzi, pinyin, meaning: (libraryKind === 'Characters' ? characterMeaning : cardMeaning)(hanzi, pinyin, meaning), ...(script ? { script } : {}) }));
    };
    let base: Card[];
    if (f.category.startsWith('Ref:')) {
      const refKind = libraryKinds[f.category.slice(4) as ReferenceKind];
      const group = refKind ? parseUsageGroup(refKind, f.usage) : undefined;
      const kangxi = new Map(refKind === 'Radicals' ? referenceCatalog.find(c => c.kind === 'Radical')?.entries.map(row => [row[0], Number((row[3] ?? "").match(/\bRadical #(\d+)\b/i)?.[1]) || undefined] as const) ?? [] : []);
      // Stroke counts come from the library's exact records; a card without a
      // recorded count never matches a stroke filter (fail closed).
      const strokeMap = new Map(refKind ? libraryEntries(refKind).map(entry => [entry.hanzi, entry.strokes] as const) : []);
      const maxStrokes = f.strokesUpTo === '1' && f.strokes ? Number(f.strokes) : null;
      base = referenceCards(f.category.slice(4) as ReferenceKind)
        .filter(card => !group || !refKind || usageRankMatches(refKind, usageRank({ ...card, ...(kangxi.get(card.hanzi) ? { kangxiIndex: kangxi.get(card.hanzi) as number } : {}) }, refKind, preferences.includeTraditional), group, f.usageUpTo === '1'))
        .filter(card => !f.strokes || (maxStrokes !== null ? (strokeMap.get(card.hanzi) ?? Infinity) <= maxStrokes : strokeMap.get(card.hanzi) === Number(f.strokes)));
      if (savedFilter && refKind === 'Radicals') base = [...base, ...saved.flatMap(id => { const entry = id.includes(':variant:') ? savedGlyphEntry(id) : undefined; return entry && includeScript(entry.script, preferences.includeTraditional) ? [{ ...entry, libraryKind: 'Radicals' as const }] : []; })];
    } else {
      const vocabKind = flashcardVocabularyKind(f.category);
      if (vocabKind === 'idiom') {
        base = filterIdioms(idiomWords, idiomRankClasses, '', f.usage || ALL_IDIOM_BANDS, 'All words', [], false, false, f.usageUpTo === '1', f.collection || 'All collections', f.subtopic || ALL_SUBTOPICS);
      } else {
        base = items.filter(w => vocabularyKind(w) === vocabKind && matchesTopic(w, f.collection || '') && inSubtopic(w, f.subtopic || ALL_SUBTOPICS) && (f.level === 'All levels' || w.level === f.level) && (f.pos === 'All types' || partOfSpeechList(w).includes(f.pos)) && matchesPhraseStyle(w.entry, fStyle));
      }
    }
    const inLesson = lessonIds(f);
    if (inLesson) base = base.filter(card => inLesson.has(card.id));
    return savedFilter ? base.filter(card => saved.includes(card.id)) : base;
  };
  const poolDeps = [items, idiomWords, idiomRankClasses, category, collection, subtopic, level, pos, savedOnly, saved, usage, strokes, usageUpTo, strokesUpTo, style, course, lesson, preferences.includeTraditional, catalogVersion];
  const pool = useMemo(() => poolFor({ ...applied, style, course, lesson }, savedOnly), poolDeps);
  // Count shown on the Saved half of the All/Saved switch: bookmarks in this category.
  const savedCount = useMemo(() => poolFor({ ...applied, style, course, lesson }, true).length, poolDeps);
  // Course and lesson choices for a draft: only those with at least one card under the
  // draft's other picks (the deck without the lesson pick decides what counts as a card, so
  // a course or lesson is never dropped for a narrowing it does not cause). The lesson list
  // follows the Course pick, so the pair reads course → lesson.
  const lessonChoices = (draft: FlashcardFilters): { courses: LessonDeckGroup[]; lessons: LessonDeckGroup[] } => {
    const kind = lessonDeckKind(draft.category);
    if (!kind) return { courses: [], lessons: [] };
    const others = new Set(poolFor({ ...draft, course: undefined, lesson: undefined }, Boolean(draft.saved)).map(card => card.id));
    const withCards = (g: LessonDeckGroup) => ({ ...g, lessons: g.lessons.filter(l => [...lessonDeckIds(l.id, kind, items)].some(id => others.has(id))) });
    const courses = lessonDeckGroups().map(withCards).filter(g => g.lessons.length);
    // A course picked earlier stays listed even when the other picks left it empty, so the
    // dropdown never silently drops the value the bar is showing.
    const stale = draft.course && !courses.some(g => g.id === draft.course) ? lessonDeckGroups().find(g => g.id === draft.course) : undefined;
    return { courses: stale ? [...courses, stale] : courses, lessons: draft.course ? courses.filter(g => g.id === draft.course) : courses };
  };

  const roundSize = deckSize === 'all' ? pool.length : Math.min(deckSize, pool.length);
  const cardsUnit = (n: number) => `${n} ${n === 1 ? 'card' : 'cards'}`;
  // Play-bar summary of the settings a round is dealt with, e.g. "All vocabulary · Chinese → English · 10 cards".
  const settingsLabel = () => {
    const refKind = isReference ? libraryKinds[category.slice(4) as ReferenceKind] : undefined;
    const group = refKind ? parseUsageGroup(refKind, usage) : undefined;
    const groupInfo = refKind && group ? usageGroups(refKind).find(g => g.value === group) : undefined;
    const idiomBand = category === 'Idioms' && usage ? idiomRankClasses.find(c => c.id === usage) : undefined;
    const subtopicLabel = subtopic ? subtopicById(subtopic)?.label ?? subtopic : '';
    const parts = [...(savedOnly ? ['Saved'] : []), flashcardKindLabel(category), ...(!isReference && collection ? [collection] : []), ...(!isReference && subtopicLabel ? [subtopicLabel] : []), ...(!isReference && level !== 'All levels' ? [level] : []), ...(!isReference && pos !== 'All types' ? [pos] : []), ...(style ? [style] : []), ...(course ? [courseLabel(course)] : []), ...(lesson ? [lessonDeckTitle(lesson) ?? lesson] : []), ...(idiomBand ? [usageUpTo === '1' ? `Rank 1–${idiomBand.to.toLocaleString('en-US')}` : `Rank ${idiomBandRangeLabel(idiomBand)}`] : []), ...(refKind && groupInfo ? [usageUpTo === '1' && groupInfo.value !== UNRANKED ? `Rank 1–${groupInfo.max.toLocaleString('en-US')}` : usageGroupLabel(groupInfo, refKind, preferences.includeTraditional)] : []), ...(refKind && strokes ? [strokesUpTo === '1' ? `Up to ${strokes} ${strokes === '1' ? 'stroke' : 'strokes'}` : `${strokes} ${strokes === '1' ? 'stroke' : 'strokes'}`] : []), direction === 'zh' ? 'Chinese → English' : 'English → Chinese'];
    return parts.join(' · ');
  };
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Deal a round: a fresh deck from `cards` (capped to the deck size) or, for a review, every card in `cards`. */
  const deal = (dealt: Card[], isReview: boolean) => {
    setSettingsOpen(false);
    setSession(s => ({ ...s, round: isReview ? s.round + 1 : 1, total: dealt.length, deck: dealt, index: 0, flipped: false, missed: [], ended: false, skipped: [], isReview, label: isReview ? `Review · ${cardsUnit(dealt.length)}` : `${settingsLabel()} · ${cardsUnit(dealt.length)}` }));
  };
  const start = (cards: Card[], next = false) => deal(next ? shuffle(cards) : shuffle(cards).slice(0, deckSize === 'all' ? cards.length : deckSize), next);
  // Last-card pause: the answer counts at once (counter and results agree), the bar fills
  // to 100% and holds briefly before the results replace the card, so a round never feels cut off.
  const [finishing, setFinishing] = useState(false);
  const answer = (known: boolean) => {
    if (!deck || finishing) return;
    const current = deck[index];
    // In "repeat" mode a missed card goes back in the deck, so only then is the last card not final.
    if (index === deck.length - 1 && !(repeat && !known)) {
      setFinishing(true);
      setSession(s => ({ ...s, missed: !known && current ? [...s.missed, current] : s.missed }));
      setTimeout(() => { setSession(s => ({ ...s, flipped: false, index: s.index + 1 })); setFinishing(false); }, FINISH_PAUSE_MS);
      return;
    }
    setSession(s => ({ ...s, flipped: false, missed: !known && current ? [...s.missed, current] : s.missed }));
    // Advance after the flip-back starts; a repeated miss goes to the end of the deck.
    setTimeout(() => setSession(s => ({ ...s, deck: repeat && !known && current && s.deck ? [...s.deck, current] : s.deck, index: s.index + 1 })), 150);
  };
  const done = Boolean(deck && (index >= deck.length || session.ended));
  const card = done ? undefined : deck?.[index];
  // Flag the final card (multi-card decks only) so the switch to results never surprises.
  const lastCard = Boolean(card && deck && deck.length > 1 && index === deck.length - 1);
  const request = { ...characterAudioRequest(card?.hanzi ?? '', card?.pinyin), audio: card?.audio ?? null };
  const source = audioCandidates(request)[0]?.label;
  const audioAvailable = usePronunciationAvailability(audioCandidates(request).some(candidate => candidate.kind === 'recording'), card?.pinyin);

  const uniqueMissed = [...new Map(missed.map(m => [m.id, m])).values()];
  const kept = uniqueMissed.filter(m => !session.skipped.includes(m.id));
  const uniqueDeck = deck ? [...new Map(deck.map(c => [c.id, c])).values()] : [];
  // Cards answered at least once (an early End leaves the rest unanswered).
  const reviewed = deck ? new Set(deck.slice(0, index).map(c => c.id)).size : 0;
  const changeSettings = () => { setSettingsOpen(false); patch({ deck: null, ended: false, flipped: false }); };
  const end = useRoundEnd({ active: Boolean(card), answered: index, onFinish: () => { setSettingsOpen(false); patch({ ended: true, flipped: false }); }, onQuit: changeSettings });
  // Keys while a card is showing: Space flips, ← still learning, → I knew it (after flipping).
  // Esc is useRoundEnd's; while "End now?" is open its own buttons take the keys.
  const keys = useRef({ card, flipped, confirming: end.confirming, answer });
  keys.current = { card, flipped, confirming: end.confirming, answer };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const { card: shown, flipped: turned, confirming, answer: mark } = keys.current;
      if (!shown || confirming || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(input|textarea|select|button|a)$/i.test(target.tagName))) return;
      if (event.key === ' ') { event.preventDefault(); setSession(s => ({ ...s, flipped: !s.flipped })); }
      else if (event.key === 'ArrowLeft' && turned) { event.preventDefault(); mark(false); }
      else if (event.key === 'ArrowRight' && turned) { event.preventDefault(); mark(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSession]);
  const setup = (action: ReactNode, summary: ReactNode) => <>
      <GameSetup summary={summary} action={action} matchCount={pool.length} selection={settingsLabel()}
        preview={pool[0] && <><span className="pinyin">{pool[0].pinyin}</span><span className={`game-preview-hanzi ${category === 'Radicals' || category === 'Ref:Radical' ? 'card-ink-radical' : ''}`} lang="zh-CN">{pool[0].hanzi}</span></>} filters={<DraftFilterForm applied={applied} active={activeFilters} count={pool.length} showCount={false} autoApply onApply={configure} onClear={() => { const empty: FlashcardFilters = { category, collection: '', subtopic: '', level: 'All levels', pos: 'All types', usage: '', strokes: '' }; configure(empty); return empty; }}>{({ draft, patch }) => { const draftReference = draft.category.startsWith('Ref:'); const draftIdiom = draft.category === 'Idioms'; const draftRefKind = draftReference ? libraryKinds[draft.category.slice(4) as ReferenceKind] : undefined; const facets = vocabularyFacets(draft); const glyph = draftRefKind ? glyphFacets(draft, draftRefKind) : undefined; const { courses, lessons } = lessonChoices(draft); const draftSubtopic = draft.subtopic || ALL_SUBTOPICS; return <>
        {/* Row 1: what kind of card; for Characters the course and the lesson that follows
            it, beside Topic; then the vocabulary collection / level / type. */}
        <div className="game-filter-row">
          <div className="game-kind-groups">{['Glyphs', 'Vocabulary'].map(group => <GameChoices key={group} label={group} value={draft.category}
            options={flashcardKinds.filter(k => group === 'Glyphs' ? k.value.startsWith('Ref:') : !k.value.startsWith('Ref:')).map(k => ({ value: k.value, label: k.label }))}
            onChange={category => patch({ category, collection: '', subtopic: '', level: 'All levels', pos: 'All types', usage: '', usageUpTo: undefined, strokes: '', strokesUpTo: undefined, style: undefined, course: undefined, lesson: undefined })}/>)}</div>
        </div>
        <GameFilters count={[draft.subtopic && draft.subtopic !== ALL_SUBTOPICS ? draft.subtopic : draft.collection && draft.collection !== 'All collections' ? draft.collection : '', draft.level !== 'All levels' && draft.level, draft.pos !== 'All types' && draft.pos, draft.style !== 'All styles' && draft.style, draft.usage !== ALL_IDIOM_BANDS && draft.usage, draft.strokes, draft.course, draft.lesson, draft.saved].filter(Boolean).length}>
          {/* Characters only: the course narrows the lesson list, and both narrow the deck.
              "All courses" / "All lessons" leave the deck unfiltered by lesson. */}
          {courses.length > 0 && <>
            <GameField label="Course"><FilterSelect ariaLabel="Course" value={draft.course ?? ''} onValueChange={v => patch({ course: v || undefined, lesson: undefined })} items={[{ value: '', label: 'All courses' }, ...courses.map(g => ({ value: g.id, label: g.label }))]} /></GameField>
            <GameField label="Lesson"><FilterSelect ariaLabel="Lesson" value={draft.lesson ?? ''} onValueChange={v => patch({ lesson: v || undefined })} items={[{ value: '', label: 'All lessons' }, ...lessons.map(g => ({ label: g.label, options: g.lessons.map(l => ({ value: l.id, label: l.title })) }))]} /></GameField>
          </>}
          {!draftReference && <>
            <GameField label="Topic"><TopicSelect topics={facets.collections} subtopics={facets.subtopics} collection={draft.collection || ''} subtopic={draftSubtopic} allTopics="" allSubtopics="" onChange={patch}/></GameField>
            {facets.levels.length > 0 && <GameField label="HSK level"><FilterSelect ariaLabel="HSK level" value={draft.level} onValueChange={level => patch({ level })} items={[{ value: 'All levels', label: 'All levels' }, ...facets.levels.map(l => ({ value: l, label: l }))]} /></GameField>}
            {facets.posOptions.length > 0 && <GameField label="Part of speech"><FilterSelect ariaLabel="Part of speech" value={draft.pos} onValueChange={pos => patch({ pos })} items={[{ value: 'All types', label: 'All types' }, ...facets.posOptions.map(p => ({ value: p, label: p }))]} /></GameField>}
            {/* Phrases only: the same Sentence style choice as the Phrases library. */}
            {facets.styles.length > 0 && <GameField label="Sentence style"><FilterSelect ariaLabel="Sentence style" value={draft.style ?? ''} onValueChange={v => patch({ style: v || undefined })} items={[{ value: '', label: 'All styles' }, ...facets.styles.map(st => ({ value: st, label: st }))]} /></GameField>}
          </>}
        {/* Rank and stroke filters retain their exact recorded groups. */}
        {draftIdiom && <span className="filter-field-row"><GameField label="Frequency"><FilterSelect ariaLabel="Frequency" value={draft.usage || ALL_IDIOM_BANDS} onValueChange={usage => patch({ usage: usage === ALL_IDIOM_BANDS ? '' : usage, usageUpTo: undefined })} items={[{ value: ALL_IDIOM_BANDS, label: 'All ranks' }, ...idiomRankClasses.map(c => ({ value: c.id, label: `${idiomBandRangeLabel(c)} · ${c.cumulativePct.toFixed(1)}%`, triggerLabel: idiomBandRangeLabel(c) }))]} /></GameField>{draft.usage && draft.usage !== ALL_IDIOM_BANDS && <FilterWideningToggle active={draft.usageUpTo === '1'} onToggle={() => patch({ usageUpTo: draft.usageUpTo ? undefined : '1' })} label="+ lower ranks" title="Also include every more frequent rank above the selected group"/>}</span>}
        {draftReference && draftRefKind && <span className="filter-field-row"><GameField label="Frequency"><FilterSelect ariaLabel="Frequency" value={parseUsageGroup(draftRefKind, draft.usage) ?? ''} onValueChange={usage => patch({ usage, usageUpTo: undefined })} items={[{ value: '', label: 'All ranks' }, ...(glyph?.ranks ?? usageGroups(draftRefKind)).map(group => ({ value: group.value, label: usageGroupLabel(group, draftRefKind, preferences.includeTraditional), triggerLabel: group.label }))]} /></GameField>{draft.usage && draft.usage !== UNRANKED && <FilterWideningToggle active={draft.usageUpTo === '1'} onToggle={() => patch({ usageUpTo: draft.usageUpTo ? undefined : '1' })} label="+ lower ranks" title="Also include every more frequent rank above the selected group"/>}</span>}
        {draftReference && draftRefKind && <span className="filter-field-row"><GameField label="Stroke count"><FilterSelect ariaLabel="Stroke count" value={draft.strokes ?? ''} onValueChange={strokes => patch({ strokes, strokesUpTo: undefined })} items={[{ value: '', label: 'All stroke counts' }, ...(glyph?.strokes ?? []).map(n => ({ value: String(n), label: `${n} ${n === 1 ? 'stroke' : 'strokes'}` }))]} /></GameField>{draft.strokes && <FilterWideningToggle active={draft.strokesUpTo === '1'} onToggle={() => patch({ strokesUpTo: draft.strokesUpTo ? undefined : '1' })} label="+ fewer strokes" title="Also include every smaller stroke count"/>}</span>}
        {/* Saved-only: the same bookmark + count toggle as the libraries, last in the row; it stays part of the auto-applied draft. */}
        <SavedFilterToggle labelled on={Boolean(draft.saved)} count={savedCount} noun="cards" onToggle={() => patch({ saved: draft.saved ? undefined : true })}/>
        </GameFilters>
      </>; }}</DraftFilterForm>}>
        <div className="game-option-row">
        <GameChoices label="Direction" value={direction} onChange={v => { if (v === 'zh' || v === 'en') patch({ direction: v, flipped: false }); }} options={[{ value: 'zh', label: 'Chinese → English' }, { value: 'en', label: 'English → Chinese' }]} />
        <GameChoices label="Cards" value={String(deckSize)} onChange={v => patch({ deckSize: v === 'all' ? 'all' : Number(v) })} options={[...deckSizes.map(n => ({ value: String(n), label: String(n) })), { value: 'all', label: 'All' }]} />
        </div>
        <div className="flash-options">
          <label className={`flash-option ${direction === 'en' ? 'is-disabled' : ''}`}><Switch checked={showFrontPinyin} onCheckedChange={value => patch({ showFrontPinyin: value })} disabled={direction === 'en'} aria-label="Show pinyin on card front" /><span>Show pinyin on front</span></label>
          <label className="flash-option"><Switch checked={repeat} onCheckedChange={value => patch({ repeat: value })} aria-label="Repeat missed cards until all are known" /><span>Repeat missed until known</span></label>
        </div>
      </GameSetup>
  </>;
  const firstTry = reviewed - uniqueMissed.length;
  return <div className="page-enter game-page">
    <div className="page-heading"><div><div className="eyebrow">REMEMBER · RECALL · REPEAT</div><h1>Turn a card, test your memory.</h1></div><span className="heading-hanzi">记<span>jì</span></span></div>
    {/* Game dropdowns apply immediately: filters only shape the next deck, never the active round. */}
    {!deck && <>
      {setup(<Button onClick={() => start(pool)} disabled={!pool.length} aria-label={`Start · ${cardsUnit(roundSize)}`}><Play />Start</Button>, deckSummary(roundSize, pool.length))}
      <GameReady available={pool.length > 0}/>
    </>}

    {deck && !done && <section className="game-play" aria-label="Game">
      <GamePlayBar summary={session.label} settingsOpen={settingsOpen} onToggleSettings={() => setSettingsOpen(o => !o)}
        onRestart={() => session.isReview ? start(uniqueDeck, true) : start(pool)} restartDisabled={!session.isReview && !pool.length} end={end} />
      {settingsOpen && setup(<Button onClick={() => start(pool)} disabled={!pool.length} aria-label={`Restart · ${cardsUnit(roundSize)}`}><RotateCcw />Restart with these</Button>, <>Changes apply to the next round · {deckSummary(roundSize, pool.length)}</>)}
      {card && <div className={`flash-stage ${card.script === 'Traditional' ? 'is-traditional' : ''}`}>
        <div className="flash-meta"><span className="flash-meta-count"><span>Card {index + 1} of {deck?.length ?? 0}{round > 1 ? ` · round ${round}` : ''}</span>{lastCard && <span className="flash-last-card">Last card</span>}</span><span>{uniqueMissed.length} {repeat ? 'took extra tries' : 'still learning'}</span></div>
        <div className="flash-progress"><span style={{ width: `${finishing ? 100 : (index / (deck?.length || 1)) * 100}%` }} /></div>
        <div className={`flash-card ${flipped ? 'is-flipped' : ''}`}>
          <div className="flash-inner">
            <div className="flash-face" aria-hidden={flipped} inert={flipped}>
              <Button variant="ghost" className="flash-face-flip" onClick={() => setSession(s => ({ ...s, flipped: !s.flipped }))} aria-label="Flip card"/>
              {direction === 'zh' ? <>{showFrontPinyin && <span className="pinyin flash-pinyin">{card.pinyin}</span>}<span className="flash-big" lang="zh-CN" style={{ '--flash-chars': Array.from(card.hanzi).length } as React.CSSProperties}>{card.hanzi}</span></> : <span className="flash-word"><MeaningText text={card.meaning}/></span>}<span className="flash-hint">TAP TO FLIP</span>
            </div>
            <div className="flash-face back" aria-hidden={!flipped} inert={!flipped}>
              <Button variant="ghost" className="flash-face-flip" onClick={() => patch({ flipped: true })} aria-label="Card answer"/>
              {/* Only on the answer side, so opening details never gives the answer away. */}
              <Button asChild variant="ghost" size="sm" className="flash-details"><Link {...detailsFor(card)} onClick={rememberReturn} title={`Open details for ${card.hanzi}`} aria-label={`Open details for ${card.hanzi}`}><DetailsIcon/>Details</Link></Button>
              <div className="flash-pinyin-row">{!card.audio && Array.from(card.hanzi).length === 1 && isMultiReading(card.pinyin) ? <MultiReadingSpeakers spoken={card.hanzi} reading={card.pinyin} variant="header" textClassName="pinyin flash-pinyin"/> : <><span className="pinyin flash-pinyin">{card.pinyin}</span><Button variant="ghost" size="icon" className={audioAvailable ? '' : 'audio-tts-only'} disabled={!audioAvailable} title={audioAvailable ? `Listen · ${source}` : undefined} aria-label={audioAvailable ? `Listen to ${card.hanzi}` : `No audio available for ${card.hanzi}`} onClick={() => playPronunciation(request, preferences.slow)}><Volume2/></Button></>}</div>
              <span className="flash-big" lang="zh-CN" style={{ '--flash-chars': Array.from(card.hanzi).length } as React.CSSProperties}>{card.hanzi}</span><span className="flash-word"><MeaningText text={card.meaning}/></span>
              {/* Lessons that teach this exact record (answer side only, like Details). */}
              {cardLessons(card).length > 0 && <div className="flash-lessons" aria-label="Lessons">{cardLessons(card).map(l => <Link key={l.id} to="/lessons/$lessonId" params={{ lessonId: l.id }} onClick={rememberReturn} className="flash-lesson-link" title={`Open the lesson ${l.title}`}><BookText aria-hidden="true"/><span>{l.title}</span></Link>)}</div>}
            </div>
          </div>
        </div>
        <div className="flash-actions">
          <Button variant="outline" onClick={() => answer(false)} disabled={!flipped || finishing}><X />Still learning</Button>
          <Button onClick={() => answer(true)} disabled={!flipped || finishing}><Check />I knew it</Button>
        </div>
        <p className="game-play-keys">{!lastCard ? 'Space flips · ← still learning · → I knew it · Esc ends' : repeat ? 'Space flips · ← still learning (back in the deck) · → I knew it · finish · Esc ends' : 'Space flips · ← still learning · → I knew it · either one finishes · Esc ends'}</p>
      </div>}
    </section>}

    {done && deck && <GameResults eyebrow={session.isReview ? 'Review complete' : session.ended ? 'Session ended' : 'Session complete'}
      score={repeat ? firstTry : reviewed - uniqueMissed.length} total={reviewed} unit={repeat ? 'known on the first try' : 'known'}
      sub={<>{reviewed} of {uniqueDeck.length} reviewed{uniqueMissed.length ? ` · ${uniqueMissed.length} ${repeat ? 'took extra tries' : 'still learning'}` : ''}</>}
      listTitle={repeat ? 'Took extra tries' : 'Still learning'} listKind="cards" hasList={uniqueMissed.length > 0}
      empty={reviewed ? 'Every card known — well done.' : 'No cards answered in this round.'}
      actions={<>
        {uniqueMissed.length > 0 && <Button onClick={() => start(kept, true)} disabled={!kept.length}><Target />Review still learning ({kept.length})</Button>}
        <Button variant={uniqueMissed.length ? 'outline' : 'default'} disabled={!pool.length && !kept.length} onClick={() => deal(mixedRound(pool, deckSize === 'all' ? pool.length : deckSize, kept), false)}><Play />{kept.length ? 'New round + these' : 'New round'}</Button>
        <Button variant="ghost" onClick={changeSettings}>Change settings</Button>
      </>}
      note={uniqueMissed.length > 0 && 'Cards you know in a review round drop off the list.'}>
      {uniqueMissed.map(m => {
        const missedRequest = { ...characterAudioRequest(m.hanzi, m.pinyin), audio: m.audio ?? null };
        return <MissedTick key={m.id} label={m.hanzi} kept={!session.skipped.includes(m.id)} onToggle={() => patch({ skipped: toggleSkipped(session.skipped, m.id) })}>
          <Link {...detailsFor(m)} onClick={rememberReturn} className={`game-missed-hanzi${m.script === 'Traditional' ? ' traditional-character' : ''}`} lang="zh-CN" title={openDetailsHint(m.hanzi, m.libraryKind ?? vocabularyKind(m as unknown as Word))}>{m.hanzi}</Link>
          <span className="game-missed-reading example-pinyin-row">{!m.audio && Array.from(m.hanzi).length === 1 && isMultiReading(m.pinyin)
            ? <MultiReadingSpeakers spoken={m.hanzi} reading={m.pinyin} variant="header" textClassName="pinyin"/>
            : <><span className="pinyin">{m.pinyin}</span><ExamplePronunciation request={missedRequest} label={m.hanzi}/></>}</span>
          <span className="game-missed-note"><MeaningText text={m.meaning}/></span>
          <TileBookmark hanzi={m.hanzi} bookmarked={saved.includes(m.id)} onBookmark={() => toggleSaved(m.id)}/>
        </MissedTick>;
      })}
    </GameResults>}
  </div>;
}

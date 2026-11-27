import { orderLibrary, orderVocabulary, newShuffleSeed, type LibrarySort as Sort } from '@/lib/library-order';
import { LibrarySort } from './library-sort';
import { DetailSheet } from './detail-sheet';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CatalogPagination, StickyPagination } from './catalog-pagination';
import { useLibraryDensity } from './use-library-density';
import { useFooterFitColumns } from './use-footer-fit-columns';
import { Search, Plus, BookOpen, Check, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FilterSelect } from './filter-select';
import { TopicSelect } from './topic-select';
import { FrequencyRangeControl } from './game-controls';
import { parseRankRange, rankRangeLabel } from '@/lib/rank-range';
import { useWorkspace } from './workspace';
import { WordCard, WordDetailContent } from './word-card';
import { collections, filterWords, vocabularyFacetOptions, vocabularyKind } from '@/lib/mandarin';
import { ALL_IDIOM_BANDS, filterIdioms, loadIdioms, type IdiomDataset } from '@/lib/idioms';
import { ALL_SUBTOPICS, inSubtopic, subtopicById, subtopicOptions } from '@/lib/vocabulary-subtopics';
import { matchesPhraseStyle } from '@/lib/data-contract';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { vocabularyPage } from '@/lib/vocabulary-page';
import { useKeyboardPaging } from '@/lib/keyboard-paging';
import { useRecordScroll, focusRecordCard } from '@/lib/selection-scroll';
import { includeSelectedRecord } from '@/lib/record-selection';
import { DetailLoading, useDetailLoading } from './detail-loading';
import { GridCardPlaceholder } from './section-placeholder';
import { DraftFilterForm, PinyinSearchInput } from './filter-form';
import { LibraryTools } from './library-tools';
import { cardRevealClass } from './card-reveal-toggle';
import { LessonHintsProvider } from './lesson-hints';
import { useCardPeek } from './card-peek';
import { SourceInfo, HintBody } from './source-info';
import { usePublishSections } from '@/lib/section-switch';
import { useOneLineTitle } from './one-line-title';
// Motivational small-caps line shared by Words and Phrases; the per-kind
// provenance note stays in the (i) beside the title.
const vocabularyMotto = 'WORDS BUILT FROM THE CHARACTERS YOU KNOW';
/** Vocabulary's status pill in the page heading: the collection is partial material, so
 *  the tag says so and opens the shared hint card explaining exactly what is missing.
 *  No inputs or state — the copy restates only what the data holds today (HSK 3.0 levels
 *  1–2, two examples per Level 1 word, no way to add your own sentences yet), so the tag can
 *  never read as a claim of complete coverage. */
function ExperimentalTag() {
  return <Popover>
    <PopoverTrigger className="experimental-tag" aria-label="Vocabulary is experimental — what this means">
      <FlaskConical aria-hidden="true"/>Experimental
    </PopoverTrigger>
    <PopoverContent className="source-info-popover count-hint w-auto" align="end"><HintBody>
      <strong className="count-hint-title count-hint-experimental">Experimental</strong><br/>
      Still being built: HSK 3.0 levels 1–2 so far; levels 3 and above are not in the collection yet.<br/>
      Level 1 has two examples per word; Level 2 examples are also included. Your own sentences cannot be added yet.
    </HintBody></PopoverContent>
  </Popover>;
}
type Filters = { sort?: Sort | undefined; seed?: number | undefined; q?: string; collection?: string; subtopic?: string; level?: string; status?: string; py?: 'pinyin' | 'exact' | undefined; pos?: string; style?: string; band?: string; /** '1' widens the idiom rank band to rank 1..band end ("include lower ranks"). */ bandUpTo?: '1' | undefined };
/** Route callbacks own applied filters and selection; local state only owns the add-entry dialog. */
// Adding words is hidden: without storage or accounts, additions would vanish on reload.
// The dialog and session-only addWord stay in place so it can return when storage exists.
const ADD_WORD_ENABLED = false;

export function VocabularyPage({ initialQuery = '', initialWordId = '', tab, page, sort = 'rank', seed = 1, collection = 'All collections', subtopic = ALL_SUBTOPICS, level = 'All levels', status = 'All words', py = undefined, pos = 'All types', style = 'All styles', band = ALL_IDIOM_BANDS, bandUpTo = undefined, onWordOpen, onPageChange, onFiltersChange }: { initialQuery?: string; initialWordId?: string; sort?: Sort | undefined; seed?: number | undefined; tab?: 'word' | 'idiom' | 'phrase'; page?: number; collection?: string; subtopic?: string; level?: string; status?: string; py?: 'pinyin' | 'exact' | undefined; pos?: string; style?: string; band?: string; bandUpTo?: '1' | undefined; onWordOpen?: (id: string | null, page?: number) => void; onPageChange?: (page: number) => void; onFiltersChange?: (filters: Filters, replace?: boolean) => void } = {}) {
  const { items, saved, addWord, preferences } = useWorkspace();
  const detailLoading = useDetailLoading();
  const query = initialQuery;
  const [idiomsState, setIdiomsState] = useState<{ dataset: IdiomDataset; words: typeof items } | null>(null);
  const [idiomsError, setIdiomsError] = useState<string | null>(null);
  const isIdiomId = initialWordId.startsWith('idiom-');
  const appliedFilters = { q: query, collection, subtopic, level, pos, py, style, band, bandUpTo };
  const activeFilters = Boolean(query || collection !== 'All collections' || subtopic !== ALL_SUBTOPICS || level !== 'All levels' || pos !== 'All types' || style !== 'All styles' || band !== ALL_IDIOM_BANDS || py || status !== 'All words');
  const setStatus = (status: string) => onFiltersChange?.({ status });
  const [adding, setAdding] = useState(false);
  // The word records are bundled with the app, so the grid's only loading window is the beat
  // between the first (server-rendered) paint and mount. Show the same single top-left card
  // skeleton the Glyphs grid uses for that beat, so the results area never reads as empty.
  const [gridReady, setGridReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setGridReady(true), 0);
    return () => clearTimeout(timer);
  }, []);
  const linkedWord = isIdiomId ? idiomsState?.words.find(w => w.id === initialWordId) : items.find(w => w.id === initialWordId);
  // Exact links determine their own Words/Idioms/Phrases tab via explicit entry metadata,
  // never by glyph count. With no link, leave the reference window closed.
  const kind = isIdiomId ? 'idiom' : linkedWord ? vocabularyKind(linkedWord) : tab === 'phrase' ? 'phrase' : tab === 'idiom' ? 'idiom' : 'word';
  // Lazily fetch public/data/idioms.json only when the Idioms tab or an idiom link is opened.
  useEffect(() => {
    if (kind !== 'idiom' || idiomsState) return;
    let cancelled = false;
    loadIdioms()
      .then(data => { if (!cancelled) { setIdiomsState(data); setIdiomsError(null); } })
      .catch(err => { if (!cancelled) setIdiomsError(err instanceof Error ? err.message : 'Could not load idioms'); });
    return () => { cancelled = true; };
  }, [kind, idiomsState]);
  const kindItems = useMemo(() => kind === 'idiom' ? (idiomsState?.words ?? []) : items.filter(w => vocabularyKind(w) === kind), [items, idiomsState, kind]);
  // Phrases only: the recorded sentence style (Conversational/Written/Unclassified) narrows the pool before every other filter.
  const categoryItems = useMemo(() => kind === 'phrase' && style !== 'All styles' ? kindItems.filter(w => matchesPhraseStyle(w.entry, style)) : kindItems, [kindItems, kind, style]);
  const facetStyle = kind === 'phrase' ? style : 'All styles';
  const label = kind === 'phrase' ? 'phrases' : kind === 'idiom' ? 'idioms' : 'words';
  // The Words/Idioms/Phrases switch lives in the header (section-picker.tsx); hand it the
  // shown tab (a linked phrase/idiom may open without `tab` in the URL) and all counts.
  const kindCounts = useMemo(() => ({
    word: { count: items.filter(w => vocabularyKind(w) === 'word').length },
    idiom: { count: idiomsState?.dataset.total ?? 8519 },
    phrase: { count: items.filter(w => vocabularyKind(w) === 'phrase').length },
  }), [items, idiomsState]);
  usePublishSections('vocabulary', kindCounts, { active: kind });
  // The title must stay on one line at every width; the hook lowers its font size as needed.
  const titleRef = useRef<HTMLHeadingElement>(null);
  useOneLineTitle(titleRef, label);
  // Facet base: this tab's records under the applied search and All/Saved
  // choice, before any dropdown (style included). The dropdowns then narrow
  // each other from the form's current (draft) picks, so e.g. choosing a level
  // leaves only the styles and types recorded at that level.
  const idiomRankClasses = idiomsState?.dataset.rankClasses ?? [];
  const idiomMaxRank = useMemo(() => kind === 'idiom' ? Math.max(0, ...kindItems.map(word => word.idiomMeta?.rank ?? 0)) : 0, [kind, kindItems]);
  const facetBase = useMemo(() => kind === 'idiom' ? [] : filterWords(kindItems, query, 'All collections', 'All levels', status, saved, Boolean(py), 'All types', py === 'exact'), [kind, kindItems, query, status, saved, py]);
  const unordered = kind === 'idiom'
    ? includeSelectedRecord(kindItems, filterIdioms(kindItems, idiomRankClasses, query, band, status, saved, Boolean(py), py === 'exact', bandUpTo === '1', collection, subtopic), initialWordId)
    : includeSelectedRecord(categoryItems, filterWords(categoryItems, query, collection, level, status, saved, Boolean(py), pos, py === 'exact').filter(w => inSubtopic(w, subtopic)), initialWordId);
  // Legacy URLs may still carry sort=hsk; that is now simply the default order.
  const wordSort = sort === 'pinyin' || sort === 'random' ? sort : 'rank';
  const filtered = kind === 'idiom' ? orderLibrary(unordered, wordSort, seed) : orderVocabulary(unordered, wordSort, seed);
  // Subtopic dropdown wherever this tab's records carry subtopics (Words, Idioms, and derived Phrases).
  const appliedSubtopic = subtopicById(subtopic);
  // Keep a directly linked entry reachable even when old browsing filters would
  // exclude it; pagination uses that same pool for reference-window navigation.
  const density = useLibraryDensity(() => onPageChange?.(1));
  const paged = vocabularyPage(filtered, kind, page, initialWordId, density.size);
  const paginationProps = {
    total: filtered.length, current: paged.current, pages: paged.pages,
    range: filtered.length ? `${(paged.current - 1) * paged.size + 1}–${Math.min(paged.current * paged.size, filtered.length)}` : '0',
    perPage: density.size, onPerPageChange: density.onPerPageChange,
    onPageChange: onPageChange ?? (() => undefined),
  };
  // Hide modes: a click toggles the card's peek (reveal, then click again to hide); reset on tab/page/filter change.
  const peek = useCardPeek(preferences.cardReveal, `${kind}|${paged.current}|${filtered.length}|${status}|${JSON.stringify(appliedFilters)}|${wordSort}|${seed}`, preferences.rememberCardReveals);
  // An absent selection is an empty string, not undefined; block paging only
  // while the same conditions below actually render the floating reference.
  const detailOpen = Boolean(onWordOpen && linkedWord);
  useKeyboardPaging({ current: paged.current, pages: paged.pages, onPageChange: onPageChange ?? (() => undefined), disabled: detailOpen });
  const selectedWord = linkedWord;
  useRecordScroll(selectedWord?.id ?? '', items.length > 0);
  const topPaginationRef = useRef<HTMLDivElement>(null);
  // Fewer cards per row rather than wrapped Details/Trace/Recall buttons (use-footer-fit-columns.ts).
  const gridRef = useRef<HTMLDivElement>(null);
  const resultsReady = gridReady && (kind !== 'idiom' || Boolean(idiomsState) || Boolean(idiomsError));
  useFooterFitColumns(gridRef, [preferences.libraryView, preferences.font, preferences.cardReveal, kind, resultsReady, filtered.length > 0]);
  const lastPageRef = useRef<number | null>(null);
  useEffect(() => {
    const previous = lastPageRef.current;
    lastPageRef.current = page ?? 1;
    if (previous === null || previous === (page ?? 1) || initialWordId) return;
    topPaginationRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [page, initialWordId]);
  const reset = () => { const empty = { q: '', collection: 'All collections', subtopic: ALL_SUBTOPICS, level: 'All levels', py: undefined, pos: 'All types', style: 'All styles', band: ALL_IDIOM_BANDS, bandUpTo: undefined }; onFiltersChange?.({ ...empty, status: 'All words' }); return empty; };
  const appliedBand = idiomRankClasses.find(c => c.id === band);
  const appliedCustomBand = parseRankRange(band);
  const bandRangeLabel = (c: { from: number; to: number }) => `Rank ${c.from.toLocaleString('en-US')}–${c.to.toLocaleString('en-US')}`;
  const gridKindClass = kind === 'idiom' ? 'vocab-phrase-grid' : `vocab-${kind}-grid`;
  return <div className="page-enter library-page"><div className="page-heading library-heading"><div><div className="eyebrow library-eyebrow">{vocabularyMotto}</div><h1 ref={titleRef}>Get to know the {label}.<SourceInfo inline className="detail-footnote">{kind === 'phrase' ? 'Phrases · levels and syllabus IDs as recorded in the source' : kind === 'idiom' ? (idiomsState?.dataset.source ?? 'THUOCL chengyu frequency list · unreviewed English glosses') : <>HSK 3.0 vocabulary · levels as recorded in the source<br/>Level 1 examples are editorially reviewed, not native-speaker certified.</>}</SourceInfo></h1></div>{ADD_WORD_ENABLED && <Button onClick={() => setAdding(true)}><Plus/>Add word</Button>}{kind !== 'idiom' && <ExperimentalTag/>}</div>
    <Tabs className="catalog-tabs vocabulary-tabs" value={kind}>
    <TabsContent value={kind}>
    <DraftFilterForm showCount={false} searchKey="q" searchModeKey="py" saved={{ on: status === 'Saved words', count: categoryItems.filter(w => saved.includes(w.id)).length, onToggle: () => setStatus(status === 'Saved words' ? 'All words' : 'Saved words'), noun: label }} applied={appliedFilters} active={activeFilters} count={filtered.length} resetLabel="Reset" onApply={draft => onFiltersChange?.(draft)} onClear={reset} chips={[...(kind === 'idiom' && band !== ALL_IDIOM_BANDS ? [{ label: appliedCustomBand ? `Rank ${rankRangeLabel(appliedCustomBand)}` : appliedBand ? (bandUpTo === '1' ? bandRangeLabel({ from: 1, to: appliedBand.to }) : bandRangeLabel(appliedBand)) : band, clear: { band: ALL_IDIOM_BANDS, bandUpTo: undefined } }] : []), ...(collection !== 'All collections' ? [{ label: collection, clear: { collection: 'All collections', subtopic: ALL_SUBTOPICS } }] : []), ...(subtopic !== ALL_SUBTOPICS ? [{ label: appliedSubtopic?.label ?? subtopic, clear: { subtopic: ALL_SUBTOPICS } }] : []), ...(kind !== 'idiom' && level !== 'All levels' ? [{ label: level, clear: { level: 'All levels' } }] : []), ...(kind !== 'idiom' && pos !== 'All types' ? [{ label: pos, clear: { pos: 'All types' } }] : []), ...(kind === 'phrase' && style !== 'All styles' ? [{ label: style, clear: { style: 'All styles' } }] : [])]} filterFields={({ draft, patch }) => {
      if (kind === 'idiom') {
        const draftTopic = draft.collection || 'All collections';
        const draftSubtopic = draft.subtopic || ALL_SUBTOPICS;
        const idiomPool = filterIdioms(kindItems, idiomRankClasses, query, draft.band || ALL_IDIOM_BANDS, status, saved, Boolean(py), py === 'exact', draft.bandUpTo === '1');
        const idiomTopics = collections.filter(c => c !== 'All collections' && (c === draftTopic || idiomPool.some(w => w.collection === c || w.collections?.includes(c))));
        const idiomSubtopics = subtopicOptions(filterIdioms(kindItems, idiomRankClasses, query, draft.band || ALL_IDIOM_BANDS, status, saved, Boolean(py), py === 'exact', draft.bandUpTo === '1'), 'All collections', draftSubtopic);
        return <>
          <span className="filter-field-row"><FrequencyRangeControl labelled={false} scale="idiom" value={draft.band === ALL_IDIOM_BANDS ? '' : (draft.band ?? '')} upTo={draft.bandUpTo === '1'} allowUnranked={false}
            groups={idiomRankClasses.map(c => ({ value: c.id, min: c.from, max: c.to, label: `${bandRangeLabel(c)} · ${c.cumulativePct.toFixed(1)}%` }))}
            maxRank={idiomMaxRank}
            onChange={(nextBand, upTo) => patch({ band: nextBand || ALL_IDIOM_BANDS, bandUpTo: upTo ? '1' : undefined })}/></span>
          <TopicSelect topics={idiomTopics} subtopics={idiomSubtopics} collection={draftTopic} subtopic={draftSubtopic} onChange={patch}/>
        </>;
      }
      // The other dropdowns are narrowed by the draft subtopic too; the subtopic choices are narrowed
      // by every other draft pick (topic, level, type) but never by themselves.
      const draftTopic = draft.collection || 'All collections';
      const draftSubtopic = draft.subtopic || ALL_SUBTOPICS;
      const facets = vocabularyFacetOptions(facetBase.filter(w => inSubtopic(w, draftSubtopic)), { collection: draftTopic, level: draft.level || 'All levels', pos: draft.pos || 'All types', style: kind === 'phrase' ? draft.style || facetStyle : 'All styles' });
      const topicFacets = vocabularyFacetOptions(facetBase, { collection: 'All collections', level: draft.level || 'All levels', pos: draft.pos || 'All types', style: kind === 'phrase' ? draft.style || facetStyle : 'All styles' });
      const subtopics = subtopicOptions(filterWords(facetBase, '', 'All collections', draft.level || 'All levels', 'All words', [], false, draft.pos || 'All types').filter(w => matchesPhraseStyle(w.entry, kind === 'phrase' ? draft.style || facetStyle : 'All styles')), 'All collections', draftSubtopic);
      return <>
      <TopicSelect topics={topicFacets.collections} subtopics={subtopics} collection={draftTopic} subtopic={draftSubtopic} onChange={patch}/>
      <FilterSelect ariaLabel="HSK level" value={draft.level || 'All levels'} onValueChange={level => patch({ level })} items={[{ value: 'All levels', label: 'All levels' }, ...facets.levels.map(l => ({ value: l, label: l }))]} />
      <FilterSelect ariaLabel="Part of speech" value={draft.pos || 'All types'} onValueChange={pos => patch({ pos })} items={[{ value: 'All types', label: 'All types' }, ...facets.pos.map(p => ({ value: p, label: p }))]} />
      {kind === 'phrase' && <FilterSelect ariaLabel="Sentence style" value={draft.style || 'All styles'} onValueChange={style => patch({ style })} items={[{ value: 'All styles', label: 'All styles' }, ...facets.styles.map(s => ({ value: s, label: s }))]} />}
    </>; }}>{({ draft, patch }) => <>
      <PinyinSearchInput value={draft.q} onChange={q => patch({ q })} py={draft.py} onPyChange={py => patch({ py })} ariaLabel="Search vocabulary" placeholder="Search Chinese, pinyin, or meaning…"/>
    </>}</DraftFilterForm>
    <LibraryTools sort={<LibrarySort words={kind !== 'idiom'} value={wordSort} onChange={next => onFiltersChange?.({ sort: next, seed: next === 'random' ? newShuffleSeed(seed) : undefined })} onReshuffle={() => onFiltersChange?.({ sort: 'random', seed: newShuffleSeed(seed) })}/>} flashcards={kind === 'idiom' ? { category: 'Idioms', ...(status === 'Saved words' ? { saved: true } : {}), ...(collection !== 'All collections' ? { collection } : {}), ...(subtopic !== ALL_SUBTOPICS ? { subtopic } : {}), ...(band !== ALL_IDIOM_BANDS ? { usage: band } : {}), ...(band !== ALL_IDIOM_BANDS && bandUpTo === '1' ? { usageUpTo: '1' as const } : {}) } : { category: kind === 'phrase' ? 'Phrases' : 'Words', ...(status === 'Saved words' ? { saved: true } : {}), ...(collection !== 'All collections' ? { collection } : {}), ...(subtopic !== ALL_SUBTOPICS ? { subtopic } : {}), ...(level !== 'All levels' ? { level } : {}), ...(pos !== 'All types' ? { pos } : {}), ...(kind === 'phrase' && style && style !== 'All styles' ? { style } : {}) }} drawing={kind === 'word' ? { kind: 'Words', ...(status === 'Saved words' ? { saved: true } : {}), ...(collection !== 'All collections' ? { collection } : {}), ...(level !== 'All levels' ? { level } : {}), ...(pos !== 'All types' ? { pos } : {}) } : undefined}/>
    <div className={`vocabulary-workspace ${cardRevealClass(preferences.cardReveal)}`}>{/* Grid character hints (own `gridHints` switch, apart from lessons and detail cards, which sit outside this provider). */}<LessonHintsProvider enabled={preferences.gridHints === true} backLabel={label}><section className="catalog-results" aria-label={`${label} results`} aria-busy={!resultsReady}>
      {!resultsReady ? <div ref={gridRef} className={`word-grid vocab-grid ${gridKindClass} ${preferences.libraryView === 'list' ? 'list-view library-list-view' : ''}`}><GridCardPlaceholder/></div>
      : kind === 'idiom' && idiomsError ? <div className="empty-state"><BookOpen size={32}/><h3>Could not load idioms.</h3><p>{idiomsError}</p></div>
      : filtered.length ? <>
      <StickyPagination key={`sticky-${kind}`} label={`Page ${paged.current} / ${paged.pages}`} current={paged.current} pages={paged.pages} onPageChange={onPageChange ?? (() => undefined)} watchRef={topPaginationRef}/>
      <CatalogPagination top innerRef={topPaginationRef} {...paginationProps} />
      <div ref={gridRef} className={`word-grid vocab-grid ${gridKindClass} ${preferences.libraryView === 'list' ? 'list-view library-list-view' : ''}`}>{paged.entries.map(w => <WordCard word={w} key={w.id} panel initiallyOpen={w.id === initialWordId} revealed={peek.revealed.has(w.id)} {...(onWordOpen ? { open: w.id === selectedWord?.id, // Card clicks only peek in a Hide mode; the panel opens solely via the details button.
        onOpenChange: next => { if (next) peek.reveal(w.id); else onWordOpen(null, paged.current); }, onDetails: () => void detailLoading.run(w.id, () => onWordOpen(w.id, paged.current)) } : {})}/>)}</div>
      <CatalogPagination {...paginationProps} />
    </> : <div className="empty-state"><BookOpen size={32}/><h3>{status === 'Saved words' ? 'A place for your favorite words.' : `No ${label} found.`}</h3><p>{status === 'Saved words' ? 'Your bookmarked vocabulary will be right here.' : 'Try another meaning, Chinese character, or pinyin.'}</p><Button variant="outline" onClick={reset}>Clear filters</Button></div>}
    </section></LessonHintsProvider></div>{onWordOpen && linkedWord && (() => { const index = filtered.findIndex(w => w.id === linkedWord.id); const step = (i: number) => { const target = filtered[i]; if (target) void detailLoading.run(target.id, () => onWordOpen(target.id, Math.floor(i / paged.size) + 1)); }; return <DetailSheet open title={`Details for ${linkedWord.hanzi}`} label={linkedWord.hanzi} position={index} total={filtered.length} onClose={() => { onWordOpen(null, paged.current); focusRecordCard(linkedWord.id); }} onPrevious={index > 0 ? () => step(index - 1) : undefined} onNext={index >= 0 && index < filtered.length - 1 ? () => step(index + 1) : undefined}><DetailLoading loading={detailLoading}><section className="catalog-detail word-detail-panel"><WordDetailContent key={linkedWord.id} word={linkedWord}/></section></DetailLoading></DetailSheet>; })()}
    </TabsContent></Tabs>
    <Dialog open={adding} onOpenChange={setAdding}><DialogContent><DialogTitle className="font-display text-2xl">A new word to know.</DialogTitle><DialogDescription>Add to your collection for this session.</DialogDescription><form onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); const hanzi = String(data.get('hanzi')).trim(); const meaning = String(data.get('meaning')).trim(); if (!hanzi || !meaning) return; addWord({ id: `custom-${Date.now()}`, hanzi, pinyin: String(data.get('pinyin')).trim(), meaning, type: String(data.get('kind')) === 'phrase' ? 'Personal phrase' : 'Personal word', entryKind: String(data.get('kind')) === 'phrase' ? 'phrase' : 'word', collection: String(data.get('collection')), level: 'Unclassified', sentence: '', translation: '' }); setAdding(false); }}><div className="form-grid"><label className="form-field full">Entry type<select name="kind" defaultValue={kind}><option value="word">Word</option><option value="phrase">Phrase / expression</option></select></label><label className="form-field">Chinese<input name="hanzi" lang="zh-CN" required maxLength={12} placeholder="学习"/></label><label className="form-field">Pinyin<input name="pinyin" placeholder="xué xí"/></label><label className="form-field full">Meaning<input name="meaning" required placeholder="To learn"/></label><label className="form-field full">Topic<select name="collection">{collections.map(c => <option key={c}>{c}</option>)}</select></label></div><Button type="submit" className="mt-6 w-full"><Check/>Add to collection</Button></form></DialogContent></Dialog>
  </div>;
}

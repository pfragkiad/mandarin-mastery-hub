import { DetailSheet } from './detail-sheet';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CatalogPagination, StickyPagination } from './catalog-pagination';
import { useLibraryDensity } from './use-library-density';
import { Search, Plus, BookOpen, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useWorkspace } from './workspace';
import { WordCard, WordDetailContent } from './word-card';
import { collections, filterWords, vocabularyFacetOptions, vocabularyKind } from '@/lib/mandarin';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { vocabularyPage } from '@/lib/vocabulary-page';
import { useKeyboardPaging } from '@/lib/keyboard-paging';
import { useRecordScroll, focusRecordCard } from '@/lib/selection-scroll';
import { includeSelectedRecord } from '@/lib/record-selection';
import { DetailLoading, useDetailLoading } from './detail-loading';
import { DraftFilterForm } from './filter-form';
import { LibraryTools } from './library-tools';
import { cardRevealClass } from './card-reveal-toggle';
import { useCardPeek } from './card-peek';
import { SourceInfo } from './source-info';
// Motivational small-caps line shared by Words and Phrases; the per-kind
// provenance note stays in the (i) beside the title.
const vocabularyMotto = 'WORDS BUILT FROM THE CHARACTERS YOU KNOW';
type Filters = { q?: string; collection?: string; level?: string; status?: string; py?: 'pinyin' | 'exact' | undefined; pos?: string };
/** Route callbacks own applied filters and selection; local state only owns the add-entry dialog. */
// Adding words is hidden: without storage or accounts, additions would vanish on reload.
// The dialog and session-only addWord stay in place so it can return when storage exists.
const ADD_WORD_ENABLED = false;

export function VocabularyPage({ initialQuery = '', initialWordId = '', tab, page, collection = 'All collections', level = 'All levels', status = 'All words', py = undefined, pos = 'All types', onTabChange, onWordOpen, onPageChange, onFiltersChange }: { initialQuery?: string; initialWordId?: string; tab?: 'word' | 'phrase'; page?: number; collection?: string; level?: string; status?: string; py?: 'pinyin' | 'exact' | undefined; pos?: string; onTabChange?: (kind: 'word' | 'phrase') => void; onWordOpen?: (id: string | null, page?: number) => void; onPageChange?: (page: number) => void; onFiltersChange?: (filters: Filters, replace?: boolean) => void } = {}) {
  const { items, saved, addWord, preferences } = useWorkspace();
  const detailLoading = useDetailLoading();
  const query = initialQuery;
  const appliedFilters = { q: query, collection, level, pos, py };
  const activeFilters = Boolean(query || collection !== 'All collections' || level !== 'All levels' || pos !== 'All types' || py || status !== 'All words');
  const setStatus = (status: string) => onFiltersChange?.({ status });
  const [adding, setAdding] = useState(false);
  const linkedWord = items.find(w => w.id === initialWordId);
  // Exact links determine their own Words/Phrases tab via explicit entry metadata,
  // never by glyph count. With no link, leave the reference window closed.
  const kind = linkedWord ? vocabularyKind(linkedWord) : tab === 'phrase' ? 'phrase' : 'word';
  const categoryItems = useMemo(() => items.filter(w => vocabularyKind(w) === kind), [items, kind]);
  const label = kind === 'phrase' ? 'phrases' : 'words';
  // Facet base: this tab's records under the applied search and All/Saved
  // choice. The three dropdowns then narrow each other from the form's current
  // (draft) picks, so e.g. choosing "Unclassified" leaves only its types.
  const facetBase = useMemo(() => filterWords(categoryItems, query, 'All collections', 'All levels', status, saved, Boolean(py), 'All types', py === 'exact'), [categoryItems, query, status, saved, py]);
  const filtered = includeSelectedRecord(categoryItems, filterWords(categoryItems, query, collection, level, status, saved, Boolean(py), pos, py === 'exact'), initialWordId);
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
  const peek = useCardPeek(preferences.cardReveal, `${kind}|${paged.current}|${filtered.length}|${status}|${JSON.stringify(appliedFilters)}`, preferences.rememberCardReveals);
  // An absent selection is an empty string, not undefined; block paging only
  // while the same conditions below actually render the floating reference.
  const detailOpen = Boolean(onWordOpen && linkedWord);
  useKeyboardPaging({ current: paged.current, pages: paged.pages, onPageChange: onPageChange ?? (() => undefined), disabled: detailOpen });
  const selectedWord = linkedWord;
  useRecordScroll(selectedWord?.id ?? '', items.length > 0);
  const topPaginationRef = useRef<HTMLDivElement>(null);
  const lastPageRef = useRef<number | null>(null);
  useEffect(() => {
    const previous = lastPageRef.current;
    lastPageRef.current = page ?? 1;
    if (previous === null || previous === (page ?? 1) || initialWordId) return;
    topPaginationRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [page, initialWordId]);
  const reset = () => { const empty = { q: '', collection: 'All collections', level: 'All levels', py: undefined, pos: 'All types' }; onFiltersChange?.({ ...empty, status: 'All words' }); return empty; };
  return <div className="page-enter library-page"><div className="page-heading library-heading"><div><div className="eyebrow library-eyebrow">{vocabularyMotto}</div><h1>Get to know the {label}.<SourceInfo inline className="detail-footnote">{kind === 'phrase' ? 'Level 1 practice phrases are unofficial · no syllabus IDs' : 'HSK 3.0 vocabulary · levels as recorded in the source'}</SourceInfo></h1></div>{ADD_WORD_ENABLED && <Button onClick={() => setAdding(true)}><Plus/>Add word</Button>}</div>
    <Tabs className="catalog-tabs vocabulary-tabs" value={kind} onValueChange={value => { if (value === 'word' || value === 'phrase') onTabChange?.(value); }}>
    <div className="vocabulary-category-row"><TabsList aria-label="Vocabulary categories">{(['word', 'phrase'] as const).map(k => <TabsTrigger key={k} value={k}>{k === 'word' ? 'Words' : 'Phrases'}<span className="catalog-tab-count">{items.filter(w => vocabularyKind(w) === k).length}</span></TabsTrigger>)}</TabsList><div className="vocabulary-saved-filter" aria-label="Saved vocabulary">{['All words','Saved words'].map(s => <Button key={s} variant="ghost" aria-pressed={status === s} className={status === s ? 'selected' : ''} onClick={() => setStatus(s)}>{s === 'All words' ? 'All' : 'Saved'}{s === 'Saved words' && <span className="catalog-tab-count">{categoryItems.filter(w => saved.includes(w.id)).length}</span>}</Button>)}</div></div>
    <TabsContent value={kind}>
    <DraftFilterForm showCount={false} searchKey="q" searchModeKey="py" applied={appliedFilters} active={activeFilters} count={filtered.length} onApply={draft => onFiltersChange?.(draft)} onClear={reset} chips={[...(collection !== 'All collections' ? [{ label: collection, clear: { collection: 'All collections' } }] : []), ...(level !== 'All levels' ? [{ label: level, clear: { level: 'All levels' } }] : []), ...(pos !== 'All types' ? [{ label: pos, clear: { pos: 'All types' } }] : [])]} filterFields={({ draft, patch }) => { const facets = vocabularyFacetOptions(facetBase, { collection: draft.collection ?? 'All collections', level: draft.level ?? 'All levels', pos: draft.pos ?? 'All types' }); return <>
      <select className="filter-select" aria-label="Collection" value={draft.collection} onChange={e => patch({ collection: e.target.value })}><option>All collections</option>{facets.collections.map(c => <option key={c}>{c}</option>)}</select>
      <select className="filter-select" aria-label="HSK level" value={draft.level} onChange={e => patch({ level: e.target.value })}><option>All levels</option>{facets.levels.map(l => <option key={l}>{l}</option>)}</select>
      <select className="filter-select" aria-label="Part of speech" value={draft.pos} onChange={e => patch({ pos: e.target.value })}><option>All types</option>{facets.pos.map(p => <option key={p}>{p}</option>)}</select>
    </>; }}>{({ draft, patch }) => <>
      <div className="search-field"><Search/><input aria-label="Search vocabulary" placeholder="Search Chinese, pinyin, or meaning…" value={draft.q} onChange={e => patch({ q: e.target.value })}/><Button type="button" variant="ghost" className={`search-toggle${draft.py ? ' on' : ''}`} aria-pressed={Boolean(draft.py)} title="Search pinyin only" onClick={() => patch({ py: draft.py ? undefined : 'pinyin' })}>Pinyin</Button>{draft.py && <Button type="button" variant="ghost" className={`search-toggle${draft.py === 'exact' ? ' on' : ''}`} aria-pressed={draft.py === 'exact'} title="Match the exact pinyin reading only" onClick={() => patch({ py: draft.py === 'exact' ? 'pinyin' : 'exact' })}>Exact</Button>}</div>
    </>}</DraftFilterForm>
    <LibraryTools category={status === 'Saved words' ? 'Saved' : collection !== 'All collections' ? collection : undefined} drawing={{ kind: 'Words', ...(status === 'Saved words' ? { saved: true } : {}), ...(collection !== 'All collections' ? { collection } : {}), ...(level !== 'All levels' ? { level } : {}), ...(pos !== 'All types' ? { pos } : {}) }}/>
    <div className={`vocabulary-workspace ${cardRevealClass(preferences.cardReveal)}`}><section className="catalog-results" aria-label={`${label} results`}>
      {filtered.length ? <>
      <StickyPagination key={`sticky-${kind}`} label={`Page ${paged.current} / ${paged.pages}`} current={paged.current} pages={paged.pages} onPageChange={onPageChange ?? (() => undefined)} watchRef={topPaginationRef}/>
      <CatalogPagination top innerRef={topPaginationRef} {...paginationProps} />
      <div className={`word-grid vocab-grid vocab-${kind}-grid ${preferences.libraryView === 'list' ? 'list-view library-list-view' : ''}`}>{paged.entries.map(w => <WordCard word={w} key={w.id} panel initiallyOpen={w.id === initialWordId} revealed={peek.revealed.has(w.id)} {...(onWordOpen ? { open: w.id === selectedWord?.id, // Card clicks only peek in a Hide mode; the panel opens solely via the details button.
        onOpenChange: next => { if (next) peek.reveal(w.id); else onWordOpen(null, paged.current); }, onDetails: () => void detailLoading.run(w.id, () => onWordOpen(w.id, paged.current)) } : {})}/>)}</div>
      <CatalogPagination {...paginationProps} />
    </> : <div className="empty-state"><BookOpen size={32}/><h3>{status === 'Saved words' ? 'A place for your favorite words.' : `No ${label} found.`}</h3><p>{status === 'Saved words' ? 'Your bookmarked vocabulary will be right here.' : 'Try another meaning, Chinese character, or pinyin.'}</p><Button variant="outline" onClick={reset}>Clear filters</Button></div>}
    </section></div>{onWordOpen && linkedWord && (() => { const index = filtered.findIndex(w => w.id === linkedWord.id); const step = (i: number) => { const target = filtered[i]; if (target) void detailLoading.run(target.id, () => onWordOpen(target.id, Math.floor(i / paged.size) + 1)); }; return <DetailSheet open title={`Details for ${linkedWord.hanzi}`} label={linkedWord.hanzi} position={index} total={filtered.length} onClose={() => { onWordOpen(null, paged.current); focusRecordCard(linkedWord.id); }} onPrevious={index > 0 ? () => step(index - 1) : undefined} onNext={index >= 0 && index < filtered.length - 1 ? () => step(index + 1) : undefined}><DetailLoading loading={detailLoading}><section className="catalog-detail word-detail-panel"><WordDetailContent key={linkedWord.id} word={linkedWord}/></section></DetailLoading></DetailSheet>; })()}
    </TabsContent></Tabs>
    <Dialog open={adding} onOpenChange={setAdding}><DialogContent><DialogTitle className="font-display text-2xl">A new word to know.</DialogTitle><DialogDescription>Add to your collection for this session.</DialogDescription><form onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); const hanzi = String(data.get('hanzi')).trim(); const meaning = String(data.get('meaning')).trim(); if (!hanzi || !meaning) return; addWord({ id: `custom-${Date.now()}`, hanzi, pinyin: String(data.get('pinyin')).trim(), meaning, type: String(data.get('kind')) === 'phrase' ? 'Personal phrase' : 'Personal word', entryKind: String(data.get('kind')) === 'phrase' ? 'phrase' : 'word', collection: String(data.get('collection')), level: 'Unclassified', sentence: '', translation: '' }); setAdding(false); }}><div className="form-grid"><label className="form-field full">Entry type<select name="kind" defaultValue={kind}><option value="word">Word</option><option value="phrase">Phrase / expression</option></select></label><label className="form-field">Chinese<input name="hanzi" lang="zh-CN" required maxLength={12} placeholder="学习"/></label><label className="form-field">Pinyin<input name="pinyin" placeholder="xué xí"/></label><label className="form-field full">Meaning<input name="meaning" required placeholder="To learn"/></label><label className="form-field full">Collection<select name="collection">{collections.map(c => <option key={c}>{c}</option>)}</select></label></div><Button type="submit" className="mt-6 w-full"><Check/>Add to collection</Button></form></DialogContent></Dialog>
  </div>;
}

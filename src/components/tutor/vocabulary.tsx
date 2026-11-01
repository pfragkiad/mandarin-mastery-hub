import { DetailSheet } from './detail-sheet';
import { useEffect, useRef, useState } from 'react';
import { CatalogPagination } from './catalog-pagination';
import { Search, Plus, BookOpen, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useWorkspace } from './workspace';
import { WordCard, WordDetailContent } from './word-card';
import { useIsMobile } from '@/hooks/use-mobile';
import { collections, filterWords, partOfSpeechOptions, vocabularyKind } from '@/lib/mandarin';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { vocabularyPage } from '@/lib/vocabulary-page';
import { useKeyboardPaging } from '@/lib/keyboard-paging';
import { useRecordScroll } from '@/lib/selection-scroll';
import { includeSelectedRecord } from '@/lib/record-selection';
import { DetailLoading, useDetailLoading } from './detail-loading';
import { DraftFilterForm } from './filter-form';
import { LibraryPlayMenu } from './library-play-menu';
import { CardRevealToggle, cardRevealClass } from './card-reveal-toggle';
type Filters = { q?: string; collection?: string; level?: string; status?: string; py?: 'pinyin' | undefined; pos?: string };
export function VocabularyPage({ initialQuery = '', initialWordId = '', tab, page, collection = 'All collections', level = 'All levels', status = 'All words', py = undefined, pos = 'All types', onTabChange, onWordOpen, onPageChange, onFiltersChange }: { initialQuery?: string; initialWordId?: string; tab?: 'word' | 'phrase'; page?: number; collection?: string; level?: string; status?: string; py?: 'pinyin' | undefined; pos?: string; onTabChange?: (kind: 'word' | 'phrase') => void; onWordOpen?: (id: string | null, page?: number) => void; onPageChange?: (page: number) => void; onFiltersChange?: (filters: Filters, replace?: boolean) => void } = {}) {
  const { items, saved, addWord, preferences } = useWorkspace();
  const detailLoading = useDetailLoading();
  const query = initialQuery;
  const appliedFilters = { q: query, collection, level, pos, py };
  const activeFilters = Boolean(query || collection !== 'All collections' || level !== 'All levels' || pos !== 'All types' || py || status !== 'All words');
  const setStatus = (status: string) => onFiltersChange?.({ status });
  const [adding, setAdding] = useState(false);
  const isMobile = useIsMobile();
  const linkedWord = items.find(w => w.id === initialWordId);
  const kind = linkedWord ? vocabularyKind(linkedWord) : tab === 'phrase' ? 'phrase' : 'word';
  const categoryItems = items.filter(w => vocabularyKind(w) === kind);
  const label = kind === 'phrase' ? 'phrases' : 'words';
  const levels = [...new Set(items.map(w => w.level))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const posOptions = partOfSpeechOptions(categoryItems);
  const filtered = includeSelectedRecord(categoryItems, filterWords(categoryItems, query, collection, level, status, saved, py === 'pinyin', pos), initialWordId);
  const paged = vocabularyPage(filtered, kind, page, initialWordId);
  useKeyboardPaging({ current: paged.current, pages: paged.pages, onPageChange: onPageChange ?? (() => undefined) });
  const selectedWord = linkedWord ?? (!isMobile ? paged.entries[0] : undefined);
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
  return <div className="page-enter library-page"><div className="page-heading library-heading"><div><h1>Get to know the {label}.</h1></div><Button onClick={() => setAdding(true)}><Plus/>Add word</Button></div>
    <p className="library-source-note">{kind === 'phrase' ? 'Level 1 practice phrases are unofficial · no syllabus IDs' : 'HSK 3.0 vocabulary · levels as recorded in the source'}</p>
    <Tabs className="catalog-tabs vocabulary-tabs" value={kind} onValueChange={value => { if (value === 'word' || value === 'phrase') onTabChange?.(value); }}>
    <div className="vocabulary-category-row"><TabsList aria-label="Vocabulary categories">{(['word', 'phrase'] as const).map(k => <TabsTrigger key={k} value={k}>{k === 'word' ? 'Words' : 'Phrases'}<span className="catalog-tab-count">{items.filter(w => vocabularyKind(w) === k).length}</span></TabsTrigger>)}</TabsList><div className="vocabulary-saved-filter" aria-label="Saved vocabulary">{['All words','Saved words'].map(s => <Button key={s} variant="ghost" aria-pressed={status === s} className={status === s ? 'selected' : ''} onClick={() => setStatus(s)}>{s === 'All words' ? 'All' : 'Saved'}{s === 'Saved words' && <span className="catalog-tab-count">{categoryItems.filter(w => saved.includes(w.id)).length}</span>}</Button>)}</div></div>
    <TabsContent value={kind}>
    <DraftFilterForm applied={appliedFilters} active={activeFilters} count={filtered.length} onApply={draft => onFiltersChange?.(draft)} onClear={reset}>{({ draft, patch }) => <>
      <div className="search-field"><Search/><input aria-label="Search vocabulary" placeholder="Search Chinese, pinyin, or meaning…" value={draft.q} onChange={e => patch({ q: e.target.value })}/><Button type="button" variant="ghost" className={`search-toggle${draft.py ? ' on' : ''}`} aria-pressed={Boolean(draft.py)} title="Search pinyin only" onClick={() => patch({ py: draft.py ? undefined : 'pinyin' })}>Pinyin</Button></div>
      <select className="filter-select" aria-label="Collection" value={draft.collection} onChange={e => patch({ collection: e.target.value })}><option>All collections</option>{collections.map(c => <option key={c}>{c}</option>)}</select>
      <select className="filter-select" aria-label="HSK level" value={draft.level} onChange={e => patch({ level: e.target.value })}><option>All levels</option>{levels.map(l => <option key={l}>{l}</option>)}</select>
      <select className="filter-select" aria-label="Part of speech" value={draft.pos} onChange={e => patch({ pos: e.target.value })}><option>All types</option>{posOptions.map(p => <option key={p}>{p}</option>)}</select>
    </>}</DraftFilterForm>
    <div className="catalog-tools-row"><LibraryPlayMenu category={status === 'Saved words' ? 'Saved' : collection !== 'All collections' ? collection : undefined} drawing={{ kind: 'Words', ...(status === 'Saved words' ? { saved: true } : {}), ...(collection !== 'All collections' ? { collection } : {}), ...(level !== 'All levels' ? { level } : {}), ...(pos !== 'All types' ? { pos } : {}) }}/><CardRevealToggle/></div>
    <div className={`${isMobile ? '' : 'vocabulary-workspace'} ${cardRevealClass(preferences.cardReveal)}`}><section className="catalog-results" aria-label={`${label} results`}>
      {filtered.length ? <>
      <CatalogPagination top innerRef={topPaginationRef} range={`${(paged.current - 1) * paged.size + 1}–${Math.min(paged.current * paged.size, filtered.length)}`} current={paged.current} pages={paged.pages} onPageChange={onPageChange ?? (() => undefined)} />
      <div className={`word-grid vocab-grid vocab-${kind}-grid`}>{paged.entries.map(w => <WordCard word={w} key={w.id} panel={!isMobile || Boolean(onWordOpen)} initiallyOpen={w.id === initialWordId} {...(onWordOpen ? { open: w.id === (isMobile ? initialWordId : selectedWord?.id), onOpenChange: next => { if (next) void detailLoading.run(w.id, () => onWordOpen(w.id, paged.current)); else onWordOpen(null, paged.current); } } : {})}/>)}</div>
      <CatalogPagination range={`${(paged.current - 1) * paged.size + 1}–${Math.min(paged.current * paged.size, filtered.length)}`} current={paged.current} pages={paged.pages} onPageChange={onPageChange ?? (() => undefined)} />
    </> : <div className="empty-state"><BookOpen size={32}/><h3>{status === 'Saved words' ? 'A place for your favorite words.' : `No ${label} found.`}</h3><p>{status === 'Saved words' ? 'Your bookmarked vocabulary will be right here.' : 'Try another meaning, Chinese character, or pinyin.'}</p><Button variant="outline" onClick={reset}>Clear filters</Button></div>}
    </section>{!isMobile && filtered.length > 0 && selectedWord && <DetailLoading loading={detailLoading}><section className="catalog-detail word-detail-panel" aria-label={`Details for ${selectedWord.hanzi}`}><WordDetailContent key={selectedWord.id} word={selectedWord} /></section></DetailLoading>}</div>{isMobile && preferences.cardReveal === 'all' && onWordOpen && linkedWord && (() => { const index = filtered.findIndex(w => w.id === linkedWord.id); const step = (i: number) => { const target = filtered[i]; if (target) onWordOpen(target.id); }; return <DetailSheet open title={`Details for ${linkedWord.hanzi}`} onClose={() => onWordOpen(null, paged.current)} onPrevious={index > 0 ? () => step(index - 1) : undefined} onNext={index >= 0 && index < filtered.length - 1 ? () => step(index + 1) : undefined}><section className="catalog-detail word-detail-panel"><WordDetailContent key={linkedWord.id} word={linkedWord} onNavigate={() => onWordOpen(null, paged.current)}/></section></DetailSheet>; })()}
    </TabsContent></Tabs>
    <Dialog open={adding} onOpenChange={setAdding}><DialogContent><DialogTitle className="font-display text-2xl">A new word to know.</DialogTitle><DialogDescription>Add to your collection for this session.</DialogDescription><form onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); const hanzi = String(data.get('hanzi')).trim(); const meaning = String(data.get('meaning')).trim(); if (!hanzi || !meaning) return; addWord({ id: `custom-${Date.now()}`, hanzi, pinyin: String(data.get('pinyin')).trim(), meaning, type: String(data.get('kind')) === 'phrase' ? 'Personal phrase' : 'Personal word', entryKind: String(data.get('kind')) === 'phrase' ? 'phrase' : 'word', collection: String(data.get('collection')), level: 'Unclassified', sentence: '', translation: '' }); setAdding(false); }}><div className="form-grid"><label className="form-field full">Entry type<select name="kind" defaultValue={kind}><option value="word">Word</option><option value="phrase">Phrase / expression</option></select></label><label className="form-field">Chinese<input name="hanzi" lang="zh-CN" required maxLength={12} placeholder="学习"/></label><label className="form-field">Pinyin<input name="pinyin" placeholder="xué xí"/></label><label className="form-field full">Meaning<input name="meaning" required placeholder="To learn"/></label><label className="form-field full">Collection<select name="collection">{collections.map(c => <option key={c}>{c}</option>)}</select></label></div><Button type="submit" className="mt-6 w-full"><Check/>Add to collection</Button></form></DialogContent></Dialog>
  </div>;
}

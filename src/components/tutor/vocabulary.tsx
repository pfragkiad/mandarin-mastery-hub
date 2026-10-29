import { useState } from 'react';
import { Search, Plus, LayoutGrid, List, BookOpen, X, Check, ChevronLeft, ChevronRight, Layers, PenLine } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useWorkspace } from './workspace';
import { WordCard, WordDetailContent } from './word-card';
import { useIsMobile } from '@/hooks/use-mobile';
import { collections, filterWords, partOfSpeechOptions, vocabularyKind } from '@/lib/mandarin';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { vocabularyPage } from '@/lib/vocabulary-page';
import { useRecordScroll } from '@/lib/selection-scroll';
import { includeSelectedRecord } from '@/lib/record-selection';
type Filters = { q?: string; collection?: string; level?: string; status?: string; py?: 'pinyin' | undefined; pos?: string };
export function VocabularyPage({ initialQuery = '', initialWordId = '', tab, page, collection = 'All collections', level = 'All levels', status = 'All words', py = undefined, pos = 'All types', onTabChange, onWordOpen, onPageChange, onFiltersChange }: { initialQuery?: string; initialWordId?: string; tab?: 'word' | 'phrase'; page?: number; collection?: string; level?: string; status?: string; py?: 'pinyin' | undefined; pos?: string; onTabChange?: (kind: 'word' | 'phrase') => void; onWordOpen?: (id: string | null, page?: number) => void; onPageChange?: (page: number) => void; onFiltersChange?: (filters: Filters, replace?: boolean) => void } = {}) {
  const { items, saved, addWord } = useWorkspace();
  const query = initialQuery;
  const setQuery = (q: string) => onFiltersChange?.({ q }, true);
  const setCollection = (collection: string) => onFiltersChange?.({ collection });
  const setLevel = (level: string) => onFiltersChange?.({ level });
  const setStatus = (status: string) => onFiltersChange?.({ status });
  const [list, setList] = useState(false);
  const [adding, setAdding] = useState(false);
  const isMobile = useIsMobile();
  const linkedWord = items.find(w => w.id === initialWordId);
  const kind = linkedWord ? vocabularyKind(linkedWord) : tab ?? 'word';
  const categoryItems = items.filter(w => vocabularyKind(w) === kind);
  const label = kind === 'phrase' ? 'phrases' : 'words';
  const levels = [...new Set(items.map(w => w.level))].sort();
  const filtered = includeSelectedRecord(categoryItems, filterWords(categoryItems, query, collection, level, status, saved, py === 'pinyin'), initialWordId);
  const paged = vocabularyPage(filtered, kind, page, initialWordId);
  const selectedWord = linkedWord ?? (!isMobile ? paged.entries[0] : undefined);
  useRecordScroll(selectedWord?.id ?? '', items.length > 0);
  const hasFilter = Boolean(query.trim() || collection !== 'All collections' || level !== 'All levels' || status !== 'All words' || py === 'pinyin');
  const reset = () => onFiltersChange?.({ q: '', collection: 'All collections', level: 'All levels', status: 'All words', py: undefined });
  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow">YOUR PERSONAL WORD COLLECTION</div><h1>Words worth knowing.</h1><p>A new word. A new connection. Make it yours.</p></div><Button onClick={() => setAdding(true)}><Plus/>Add word</Button></div>
    <Tabs className="catalog-tabs vocabulary-tabs" value={kind} onValueChange={value => { if (value === 'word' || value === 'phrase') onTabChange?.(value); }}>
    <div className="vocabulary-category-row"><TabsList aria-label="Vocabulary categories">{(['word', 'phrase'] as const).map(k => <TabsTrigger key={k} value={k}>{k === 'word' ? 'Words' : 'Phrases'}<span className="catalog-tab-count">{items.filter(w => vocabularyKind(w) === k).length}</span></TabsTrigger>)}</TabsList><div className="vocabulary-saved-filter" aria-label="Saved vocabulary">{['All words','Saved words'].map(s => <Button key={s} variant="ghost" aria-pressed={status === s} className={status === s ? 'selected' : ''} onClick={() => setStatus(s)}>{s === 'All words' ? 'All' : 'Saved'}{s === 'Saved words' && <span className="catalog-tab-count">{categoryItems.filter(w => saved.includes(w.id)).length}</span>}</Button>)}</div></div>
    <TabsContent value={kind}>
    <div className="filter-bar"><div className="search-field"><Search/><input aria-label="Search vocabulary" placeholder="Search Chinese, pinyin, or meaning…" value={query} onChange={e => setQuery(e.target.value)}/><button type="button" className={`search-toggle${py === 'pinyin' ? ' on' : ''}`} aria-pressed={py === 'pinyin'} title="Search pinyin only" onClick={() => onFiltersChange?.({ py: py === 'pinyin' ? undefined : 'pinyin' }, true)}>Pinyin</button></div><select className="filter-select" aria-label="Collection" value={collection} onChange={e => setCollection(e.target.value)}><option>All collections</option>{collections.map(c => <option key={c}>{c}</option>)}</select><select className="filter-select" aria-label="HSK level" value={level} onChange={e => setLevel(e.target.value)}><option>All levels</option>{levels.map(l => <option key={l}>{l}</option>)}</select><div className="view-tools"><Button variant="ghost" size="icon" className={!list ? 'selected' : ''} title="Grid view" aria-label="Grid view" onClick={() => setList(false)}><LayoutGrid/></Button><Button variant="ghost" size="icon" className={list ? 'selected' : ''} title="List view" aria-label="List view" onClick={() => setList(true)}><List/></Button></div>{(query || collection !== 'All collections' || level !== 'All levels' || py === 'pinyin') && <Button variant="ghost" size="icon" onClick={reset} title="Clear filters" aria-label="Clear filters"><X/></Button>}</div>
    <div className={isMobile ? '' : 'vocabulary-workspace'}><section className="catalog-results" aria-label={`${label} results`}>
      <div className="result-row" aria-live="polite"><span>{kind === 'phrase' ? 'Level 1 practice phrases are unofficial · no syllabus IDs' : 'HSK 3.0 vocabulary · levels as recorded in the source'}</span><span className="catalog-results-count">{filtered.length.toLocaleString('en-US')} {label} {hasFilter ? 'match' : 'available'}</span></div>
      {status === 'Saved words' && filtered.length > 0 && <div className="saved-actions"><Button asChild variant="outline" size="sm"><Link to="/flashcards" search={{ category: 'Saved' }}><Layers/>Flashcards</Link></Button><Button asChild variant="outline" size="sm"><Link to="/drawing" search={{ kind: 'Words', saved: true }}><PenLine/>Drawing game</Link></Button></div>}
      {filtered.length ? <>
      <div className={`word-grid vocab-grid vocab-${kind}-grid ${list ? 'list-view' : ''}`}>{paged.entries.map(w => <WordCard word={w} key={w.id} list={list} panel={!isMobile} initiallyOpen={w.id === initialWordId} {...(onWordOpen ? { open: w.id === (isMobile ? initialWordId : selectedWord?.id), onOpenChange: next => onWordOpen(next ? w.id : null, paged.current) } : {})}/>)}</div>
      <div className="catalog-pagination"><span>{(paged.current - 1) * paged.size + 1}–{Math.min(paged.current * paged.size, filtered.length)}</span><div><Button variant="ghost" size="icon" aria-label="Previous page" disabled={paged.current <= 1} onClick={() => onPageChange?.(paged.current - 1)}><ChevronLeft/></Button><span>Page {paged.current} / {paged.pages}</span><Button variant="ghost" size="icon" aria-label="Next page" disabled={paged.current >= paged.pages} onClick={() => onPageChange?.(paged.current + 1)}><ChevronRight/></Button></div></div>
    </> : <div className="empty-state"><BookOpen size={32}/><h3>{status === 'Saved words' ? 'A place for your favorite words.' : `No ${label} found.`}</h3><p>{status === 'Saved words' ? 'Your bookmarked vocabulary will be right here.' : 'Try another meaning, Chinese character, or pinyin.'}</p><Button variant="outline" onClick={reset}>Clear filters</Button></div>}
    </section>{!isMobile && filtered.length > 0 && selectedWord && <section className="catalog-detail word-detail-panel" aria-label={`Details for ${selectedWord.hanzi}`}><WordDetailContent key={selectedWord.id} word={selectedWord} /></section>}</div>
    </TabsContent></Tabs>
    <p className="source-note">Imported from the CLEC HSK syllabus and the spreadsheets you supplied. Words you add here last for this session only.</p>
    <Dialog open={adding} onOpenChange={setAdding}><DialogContent><DialogTitle className="font-display text-2xl">A new word to know.</DialogTitle><DialogDescription>Add to your collection for this session.</DialogDescription><form onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); const hanzi = String(data.get('hanzi')).trim(); const meaning = String(data.get('meaning')).trim(); if (!hanzi || !meaning) return; addWord({ id: `custom-${Date.now()}`, hanzi, pinyin: String(data.get('pinyin')).trim(), meaning, type: String(data.get('kind')) === 'phrase' ? 'Personal phrase' : 'Personal word', entryKind: String(data.get('kind')) === 'phrase' ? 'phrase' : 'word', collection: String(data.get('collection')), level: 'Unclassified', sentence: '', translation: '' }); setAdding(false); }}><div className="form-grid"><label className="form-field full">Entry type<select name="kind" defaultValue={kind}><option value="word">Word</option><option value="phrase">Phrase / expression</option></select></label><label className="form-field">Chinese<input name="hanzi" lang="zh-CN" required maxLength={12} placeholder="学习"/></label><label className="form-field">Pinyin<input name="pinyin" placeholder="xué xí"/></label><label className="form-field full">Meaning<input name="meaning" required placeholder="To learn"/></label><label className="form-field full">Collection<select name="collection">{collections.map(c => <option key={c}>{c}</option>)}</select></label></div><Button type="submit" className="mt-6 w-full"><Check/>Add to collection</Button></form></DialogContent></Dialog>
  </div>;
}

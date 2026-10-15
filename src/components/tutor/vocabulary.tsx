import { useState } from 'react';
import { Search, Plus, LayoutGrid, List, BookOpen, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useWorkspace } from './workspace';
import { WordCard } from './word-card';
import { collections, filterWords } from '@/lib/mandarin';
export function VocabularyPage() {
  const { items, saved, addWord } = useWorkspace();
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState('All collections');
  const [level, setLevel] = useState('All levels');
  const [status, setStatus] = useState('All words');
  const [list, setList] = useState(false);
  const [adding, setAdding] = useState(false);
  const filtered = filterWords(items, query, collection, level, status, saved);
  const reset = () => { setQuery(''); setCollection('All collections'); setLevel('All levels'); setStatus('All words'); };
  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow">YOUR PERSONAL WORD COLLECTION</div><h1>Words worth knowing.</h1><p>A new word. A new connection. Make it yours.</p></div><Button onClick={() => setAdding(true)}><Plus/>Add word</Button></div>
    <div className="collection-tabs" aria-label="Vocabulary selection">{['All words','Saved words'].map(s => <Button key={s} variant="ghost" className={status === s ? 'selected' : ''} onClick={() => setStatus(s)}>{s} <span className="text-muted-foreground text-xs">{s === 'All words' ? items.length : saved.length}</span></Button>)}</div>
    <div className="filter-bar"><div className="search-field"><Search/><input aria-label="Search vocabulary" placeholder="Search Chinese, pinyin, or meaning…" value={query} onChange={e => setQuery(e.target.value)}/></div><select className="filter-select" aria-label="Collection" value={collection} onChange={e => setCollection(e.target.value)}><option>All collections</option>{collections.map(c => <option key={c}>{c}</option>)}</select><select className="filter-select" aria-label="HSK level" value={level} onChange={e => setLevel(e.target.value)}><option>All levels</option><option>HSK 1</option><option>Sample</option></select><div className="view-tools"><Button variant="ghost" size="icon" className={!list ? 'selected' : ''} title="Grid view" aria-label="Grid view" onClick={() => setList(false)}><LayoutGrid/></Button><Button variant="ghost" size="icon" className={list ? 'selected' : ''} title="List view" aria-label="List view" onClick={() => setList(true)}><List/></Button></div>{(query || collection !== 'All collections' || level !== 'All levels') && <Button variant="ghost" size="icon" onClick={reset} title="Clear filters" aria-label="Clear filters"><X/></Button>}</div>
    <div className="result-row"><span>{filtered.length} {filtered.length === 1 ? 'word' : 'words'} in your collection</span><span>SIMPLIFIED CHINESE · 简体中文</span></div>
    {filtered.length ? <div className={`word-grid vocab-grid ${list ? 'list-view' : ''}`}>{filtered.map(w => <WordCard word={w} key={w.id} list={list}/>)}</div> : <div className="empty-state"><BookOpen size={32}/><h3>{status === 'Saved words' ? 'A place for your favorite words.' : 'No words found.'}</h3><p>{status === 'Saved words' ? 'Your bookmarked vocabulary will be right here.' : 'Try another meaning, Chinese character, or pinyin.'}</p><Button variant="outline" onClick={reset}>Browse all words</Button></div>}
    <p className="library-note">A curated starter selection inspired by your existing collection. HSK labels are illustrative, not a verified syllabus.</p>
    <Dialog open={adding} onOpenChange={setAdding}><DialogContent><DialogTitle className="font-display text-2xl">A new word to know.</DialogTitle><DialogDescription>Add to your collection for this session.</DialogDescription><form onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); const hanzi = String(data.get('hanzi')).trim(); const meaning = String(data.get('meaning')).trim(); if (!hanzi || !meaning) return; addWord({ id: `custom-${Date.now()}`, hanzi, pinyin: String(data.get('pinyin')).trim(), meaning, type: 'Personal word', collection: String(data.get('collection')), level: 'Sample', sentence: hanzi, translation: meaning }); setAdding(false); }}><div className="form-grid"><label className="form-field">Chinese<input name="hanzi" lang="zh-CN" required maxLength={12} placeholder="学习"/></label><label className="form-field">Pinyin<input name="pinyin" placeholder="xué xí"/></label><label className="form-field full">Meaning<input name="meaning" required placeholder="To learn"/></label><label className="form-field full">Collection<select name="collection">{collections.map(c => <option key={c}>{c}</option>)}</select></label></div><Button type="submit" className="mt-6 w-full"><Check/>Add to collection</Button></form></DialogContent></Dialog>
  </div>;
}

import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Search, ChevronLeft, ChevronRight, PenLine, Volume2, GitBranch, BookOpen, Columns2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { libraryEntries, filterLibrary, libraryPage, plannedCounts, type LibraryKind, type DecompositionNode, type LibraryEntry } from '@/lib/character-library';
import { speak } from '@/lib/mandarin';
import { useWorkspace } from './workspace';

const kinds: LibraryKind[] = ['Characters', 'Radicals', 'Components', 'Strokes'];
function DecompositionTree({ node }: { node: DecompositionNode }) {
  return <li><div className="decomposition-node"><span>{node.position}</span>{node.glyph === '⿰' ? <div className="decomposition-layout" aria-label="Left–right structure"><Columns2 aria-hidden="true"/><small>Left–right</small></div> : <strong lang="zh-CN">{node.glyph}</strong>}</div>{node.children?.length ? <ul>{node.children.map((child, i) => <DecompositionTree key={`${child.position}-${i}`} node={child}/> )}</ul> : null}</li>;
}
function CharacterDetails({ entry, kind }: { entry: LibraryEntry; kind: LibraryKind }) {
  const { preferences } = useWorkspace();
  const [audioError, setAudioError] = useState(false);
  return <section className="catalog-detail" aria-label={`Details for ${entry.hanzi}`}>
    <div className="eyebrow">{kind === 'Strokes' ? 'STROKE REFERENCE' : 'CHARACTER REFERENCE'}</div>
    <div className="catalog-detail-title"><strong lang="zh-CN" className={entry.script === 'Traditional' ? 'traditional-character' : ''}>{entry.hanzi}</strong><div><span className="pinyin">{entry.pinyin || 'Pinyin not recorded'}</span><h2>{entry.meaning || 'No English meaning recorded yet'}</h2>{entry.script === 'Traditional' && <span className="traditional-label">Traditional</span>}</div><Button variant="ghost" size="icon" aria-label={`Listen to ${entry.hanzi}`} title="Listen to pronunciation" onClick={() => setAudioError(!speak(entry.hanzi, preferences.slow))}><Volume2/></Button></div>
    {audioError && <p role="status" className="library-note">Audio isn’t available in this browser.</p>}
    <dl className="catalog-facts"><div><dt>Stroke count</dt><dd>{entry.strokes ?? 'Not recorded'}</dd></div><div><dt>Record</dt><dd>{kind.slice(0, -1)}</dd></div></dl>
    <p className="catalog-record-note">{entry.note}</p>
    {kind !== 'Strokes' && <Button asChild variant="outline" size="sm"><Link to="/strokes" search={{ character: entry.hanzi }}><PenLine/>Practice writing</Link></Button>}
    <div className="decomposition-section"><h3><GitBranch size={17}/>Sourced decomposition</h3>
      {entry.decomposition ? <><ul className="decomposition-tree"><DecompositionTree node={entry.decomposition.root}/></ul><dl className="decomposition-source"><dt>Source</dt><dd>{entry.decomposition.source}</dd><dt>Verification</dt><dd>{entry.decomposition.status}</dd></dl><p className="library-note">IDS describes graphical structure, not verified etymology or component meaning.</p></> : <div className="decomposition-pending"><BookOpen size={20}/><p>{kind === 'Strokes' ? 'Decomposition does not apply to an individual stroke.' : 'No sourced decomposition available yet.'}</p>{kind !== 'Strokes' && <small>Source files pending. No structure or component roles inferred.</small>}</div>}
    </div><p className="library-note">Starter reference record · full source attribution pending import.</p>
  </section>;
}
export function CharactersPage() {
  const { preferences } = useWorkspace();
  const [kind, setKind] = useState<LibraryKind>('Characters');
  const [query, setQuery] = useState('');
  const [strokeCount, setStrokeCount] = useState('');
  const [sourceOnly, setSourceOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState('');
  const entries = libraryEntries(kind);
  const filtered = filterLibrary(entries, query, strokeCount, sourceOnly, preferences.includeTraditional);
  const paged = libraryPage(filtered, page);
  const selected = filtered.find(entry => entry.id === selectedId) ?? paged.entries[0];
  const updateKind = (value: string) => { const next = kinds.find(k => k === value); if (!next) return; setKind(next); setQuery(''); setStrokeCount(''); setSourceOnly(false); setPage(1); setSelectedId(''); };
  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow">汉字 · THE CHARACTER LIBRARY</div><h1>Get to know the characters.</h1><p>Characters, radicals, components and the strokes that bring them together.</p></div><span className="heading-hanzi">汉字<span>hàn zì</span></span></div>
    <Tabs value={kind} onValueChange={updateKind} className="catalog-tabs"><TabsList aria-label="Character library categories">{kinds.map(k => <TabsTrigger key={k} value={k}>{k}<span className="catalog-tab-count">{plannedCounts[k].toLocaleString('en-US')}</span></TabsTrigger>)}</TabsList>
      {kinds.map(k => <TabsContent value={k} key={k}>
        <div className="catalog-import-note"><span>Sample catalogue · {entries.length} available / {plannedCounts[k].toLocaleString('en-US')} planned</span><span>{k === 'Characters' ? 'Planned total includes ~2,100 traditional · source files pending' : 'Full source file pending'}</span></div>
        <div className="filter-bar"><div className="search-field"><Search/><input aria-label="Search character library" placeholder="Search Chinese, pinyin or English…" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}/></div>{k !== 'Strokes' && <select className="filter-select" aria-label="Filter by stroke count" value={strokeCount} onChange={e => { setStrokeCount(e.target.value); setPage(1); }}><option value="">All stroke counts</option>{Array.from(new Set(entries.flatMap(e => e.strokes ? [e.strokes] : []))).sort((a,b) => a-b).map(n => <option key={n} value={n}>{n} strokes</option>)}</select>}{k === 'Characters' && <label className="catalog-source-toggle"><Switch checked={sourceOnly} onCheckedChange={value => { setSourceOnly(value); setPage(1); }}/>With decomposition</label>}</div>
        <div className="catalog-workspace"><section className="catalog-results" aria-label={`${k} results`}><div className="result-row" aria-live="polite"><span>{filtered.length} {k.toLowerCase()}</span><span>{k === 'Strokes' ? 'BASIC STROKE FORMS' : 'STARTER RECORDS'}</span></div><div className="catalog-entry-grid">{paged.entries.map(entry => <Button key={entry.id} variant="ghost" className={`catalog-entry ${selected?.id === entry.id ? 'selected' : ''}`} aria-label={`View ${entry.hanzi}`} aria-pressed={selected?.id === entry.id} onClick={() => setSelectedId(entry.id)}><strong lang="zh-CN">{entry.hanzi}</strong><span className="pinyin">{entry.pinyin || 'Pinyin not recorded'}</span><span className="catalog-entry-meaning">{entry.meaning || 'Meaning not recorded'}</span>{entry.decomposition && <GitBranch className="catalog-source-icon" aria-label="Decomposition available"/>}</Button>)}</div>{!filtered.length && <div className="empty-state"><Search/><h3>No matching records.</h3><Button variant="outline" onClick={() => { setQuery(''); setStrokeCount(''); setSourceOnly(false); setPage(1); }}>Clear filters</Button></div>}
          <div className="catalog-pagination"><span>{filtered.length ? `${(paged.current - 1) * 24 + 1}–${Math.min(paged.current * 24, filtered.length)} of ${filtered.length}` : '0 records'}</span><div><Button variant="ghost" size="icon" aria-label="Previous page" disabled={paged.current <= 1} onClick={() => { setPage(paged.current - 1); setSelectedId(''); }}><ChevronLeft/></Button><span>Page {paged.current} / {paged.pages}</span><Button variant="ghost" size="icon" aria-label="Next page" disabled={paged.current >= paged.pages} onClick={() => { setPage(paged.current + 1); setSelectedId(''); }}><ChevronRight/></Button></div></div>
        </section>{selected ? <CharacterDetails key={selected.id} entry={selected} kind={k}/> : <section className="catalog-detail"><p className="library-note">No record selected.</p></section>}</div>
      </TabsContent>)}
    </Tabs>
  </div>;
}

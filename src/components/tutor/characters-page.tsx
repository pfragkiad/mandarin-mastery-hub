import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Search, ChevronLeft, ChevronRight, PenLine, Volume2, GitBranch, BookOpen, Columns2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { libraryEntries, filterLibrary, libraryPage, libraryDestination, LIBRARY_PAGE_SIZE, plannedCounts, glyphIndex, type LibraryKind, type DecompositionNode, type LibraryEntry } from '@/lib/character-library';
import { playCharacter, characterRecording } from '@/lib/catalog-store';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { useWorkspace } from './workspace';

const kinds: LibraryKind[] = ['Characters', 'Radicals', 'Components', 'Strokes'];
const kindNotes: Record<LibraryKind, string> = { Characters: 'Traditional forms marked from Unihan variant data', Radicals: 'Kangxi radicals · Unihan 17.0.0', Components: 'Make Me a Hanzi components', Strokes: 'Unicode 18.0 stroke inventory' };
const IDS_LAYOUTS: Record<string, string> = { '⿰': 'Left–right', '⿱': 'Top–bottom', '⿲': 'Left–middle–right', '⿳': 'Top–middle–bottom', '⿴': 'Surround', '⿵': 'Open below', '⿶': 'Open above', '⿷': 'Open right', '⿸': 'Upper-left wrap', '⿹': 'Upper-right wrap', '⿺': 'Lower-left wrap', '⿻': 'Overlaid', '⿼': 'Open left', '⿽': 'Lower-right wrap', '⿾': 'Mirrored', '⿿': 'Rotated' };
export function DecompositionTree({ node }: { node: DecompositionNode }) {
  const { preferences } = useWorkspace();
  const card = glyphIndex()[node.glyph];
  const destination = libraryDestination(node.glyph, preferences.includeTraditional);
  const facts = card && (card.pinyin || card.meaning) ? [card.pinyin, card.meaning].filter(Boolean).join(' · ') : '';
  const glyph = card && destination
    ? <Button asChild variant="ghost" className="decomposition-glyph"><Link to="/characters" search={destination} resetScroll={false} lang="zh-CN" title={`Open the ${card.kind.replace(/s$/, '').toLowerCase()} card for ${node.glyph}`} aria-label={`Open the library card for ${node.glyph}`}><strong>{node.glyph}</strong></Link></Button>
    : <strong lang="zh-CN">{node.glyph}</strong>;
  return <li><div className="decomposition-node"><span>{node.position}</span>{IDS_LAYOUTS[node.glyph] ? <div className="decomposition-layout" aria-label={`${IDS_LAYOUTS[node.glyph]} structure`}>{node.glyph === '⿰' ? <Columns2 aria-hidden="true"/> : <span aria-hidden="true" className="ids-operator">{node.glyph}</span>}<small>{IDS_LAYOUTS[node.glyph]}</small></div> : <div className="decomposition-part">{glyph}{facts ? <small className="decomposition-facts">{facts}</small> : null}</div>}</div>{node.children?.length ? <ul>{node.children.map((child, i) => <DecompositionTree key={`${child.position}-${i}`} node={child}/> )}</ul> : null}</li>;
}
function CharacterDetails({ entry, kind }: { entry: LibraryEntry; kind: LibraryKind }) {
  const { preferences } = useWorkspace();
  const [audioError, setAudioError] = useState<string | null>(null);
  const reading = entry.pinyin || null;
  const recording = characterRecording(entry.hanzi, reading);
  const audioAvailable = usePronunciationAvailability(Boolean(recording), reading);
  const listen = async () => setAudioError(await playCharacter(entry.hanzi, preferences.slow, reading));
  return <section className="catalog-detail" aria-label={`Details for ${entry.hanzi}`}>
    <div className="eyebrow">{kind === 'Strokes' ? 'STROKE REFERENCE' : 'CHARACTER REFERENCE'}</div>
    <div className="catalog-detail-title"><strong lang="zh-CN" className={entry.script === 'Traditional' ? 'traditional-character' : ''}>{entry.hanzi}</strong><div><span className="pinyin">{entry.pinyin || 'Pinyin not recorded'}</span><h2>{entry.meaning || 'No English meaning recorded yet'}</h2>{entry.script === 'Traditional' && <span className="traditional-label">Traditional</span>}</div><Button variant="ghost" size="icon" className={audioAvailable ? '' : 'audio-tts-only'} disabled={!audioAvailable} aria-label={audioAvailable ? `Listen to ${entry.hanzi}` : `No audio available for ${entry.hanzi}`} title={audioAvailable ? recording ? 'Listen to pronunciation' : 'Browser speech · no recording for this character' : undefined} onClick={listen}><Volume2/></Button></div>
    {audioError && <p role="status" className="library-note">{audioError}</p>}
    <dl className="catalog-facts"><div><dt>Stroke count</dt><dd>{entry.strokes ?? 'Not recorded'}</dd></div><div><dt>Record</dt><dd>{kind.slice(0, -1)}</dd></div></dl>
    <p className="catalog-record-note">{entry.note}</p>
    {kind !== 'Strokes' && <Button asChild variant="outline" size="sm"><Link to="/strokes" search={{ character: entry.hanzi }}><PenLine/>Practice writing</Link></Button>}
    <div className="decomposition-section"><h3><GitBranch size={17}/>Sourced decomposition</h3>
      {entry.decomposition ? <><ul className="decomposition-tree"><DecompositionTree node={entry.decomposition.root}/></ul><dl className="decomposition-source"><dt>Source</dt><dd>{entry.decomposition.source}</dd><dt>Verification</dt><dd>{entry.decomposition.status}</dd></dl><p className="library-note">IDS describes graphical structure, not verified etymology or component meaning. Components link to their library card.</p></> : <div className="decomposition-pending"><BookOpen size={20}/><p>{kind === 'Strokes' ? 'Decomposition does not apply to an individual stroke.' : 'No sourced decomposition available yet.'}</p>{kind !== 'Strokes' && <small>This record has no breakdown in the imported sources. None is inferred.</small>}</div>}
    </div><p className="library-note">Imported record · Unicode Unihan 17.0.0 readings and meanings.</p>
  </section>;
}
function CatalogTile({ entry, selected, onSelect }: { entry: LibraryEntry; selected: boolean; onSelect: (id: string) => void }) {
  const hasPinyin = Boolean(entry.pinyin);
  const hasMeaning = Boolean(entry.meaning);
  const [side, setSide] = useState<'top' | 'bottom'>('top');
  const [clipped, setClipped] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const tileRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const tile = tileRef.current;
    if (!tile) return;
    const sync = () => {
      if (!tile.isConnected) return;
      const spans = [tile.querySelector<HTMLElement>('.pinyin'), tile.querySelector<HTMLElement>('.catalog-entry-meaning')];
      setClipped(spans.some(el => el ? el.scrollWidth > el.clientWidth + 1 : false));
    };
    const engage = () => { sync(); const grid = tile.closest('.catalog-entry-grid'); const tops = grid ? [...grid.children].map(cell => (cell as HTMLElement).offsetTop) : [0]; setSide(tile.offsetTop - Math.min(...tops) < 20 ? 'bottom' : 'top'); };
    sync();
    const ro = new ResizeObserver(() => { if (tile.isConnected) sync(); });
    ro.observe(tile);
    tile.querySelectorAll<HTMLElement>('.pinyin, .catalog-entry-meaning').forEach(el => ro.observe(el));
    document.fonts?.ready.then(sync).catch(() => undefined);
    tile.addEventListener('pointerenter', engage);
    tile.addEventListener('focus', engage);
    return () => { ro.disconnect(); tile.removeEventListener('pointerenter', engage); tile.removeEventListener('focus', engage); };
  }, [entry.id]);
  const label = `View ${entry.hanzi}${hasPinyin ? '' : ', no pinyin recorded'}${hasMeaning ? '' : ', no meaning recorded'}`;
  const tile = <Button ref={tileRef} variant="ghost" className={`catalog-entry ${selected ? 'selected' : ''}`} aria-label={label} aria-pressed={selected} onPointerEnter={() => setEngaged(true)} onPointerLeave={() => setEngaged(false)} onFocus={() => setEngaged(true)} onBlur={() => setEngaged(false)} onClick={() => onSelect(entry.id)}>
      <strong lang="zh-CN" className={entry.script === 'Traditional' ? 'traditional-character' : ''}>{entry.hanzi}</strong>
      {hasPinyin ? <span className="pinyin">{entry.pinyin}</span> : <span className="tile-absent">no pinyin</span>}
      {hasMeaning ? <span className="catalog-entry-meaning">{entry.meaning}</span> : <span className="tile-absent catalog-entry-meaning">no meaning</span>}
      {entry.script === 'Traditional' && <span className="traditional-label tile-traditional-badge">Traditional</span>}
      {entry.decomposition && <GitBranch className="catalog-source-icon" aria-label="Decomposition available"/>}
    </Button>;
  return <Tooltip open={clipped && engaged}><TooltipTrigger asChild>{tile}</TooltipTrigger>
    {clipped && <TooltipContent side={side} className="tile-tooltip"><span className="tile-tooltip-head"><strong lang="zh-CN">{entry.hanzi}</strong>{hasPinyin ? <span className="pinyin">{entry.pinyin}</span> : <span className="tile-absent">no pinyin</span>}</span><p className="tile-tooltip-meaning">{entry.meaning || 'No English meaning recorded in this source.'}</p>{entry.script === 'Traditional' && <small className="traditional-label">Traditional</small>}</TooltipContent>}
  </Tooltip>;
}

export type CharactersSearch = { character?: string; tab?: LibraryKind; q?: string; strokes?: string; page?: number; id?: string };

/** All library state lives in the URL so browser back/forward restores tab, filters, page and selection. */
export function CharactersPage({ search, onSearch }: { search: CharactersSearch; onSearch: (next: CharactersSearch, replace?: boolean) => void }) {
  const { preferences, catalogVersion } = useWorkspace();
  const catalogReady = catalogVersion > 0;
  const glyphHit = search.character && !search.id ? glyphIndex()[search.character] : undefined;
  const kind: LibraryKind = search.tab ?? glyphHit?.kind ?? 'Characters';
  const query = search.q ?? '';
  const strokeCount = search.strokes ?? '';
  const page = search.page ?? 1;
  const selectedId = search.id ?? glyphHit?.id ?? '';
  const clean = (s: CharactersSearch): CharactersSearch => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined && v !== '' && !(v === 1))) as CharactersSearch;
  const base: CharactersSearch = { tab: kind, q: query, strokes: strokeCount, page, id: selectedId };
  const set = (patch: CharactersSearch, replace = false) => onSearch(clean({ ...base, ...patch }), replace);
  const setQuery = (q: string) => set({ q, page: 1, id: '' }, true);
  const setStrokeCount = (strokes: string) => set({ strokes, page: 1, id: '' });
  const setPage = (p: number) => set({ page: p, id: '' });
  const setSelectedId = (id: string) => set({ id });
  const entries = libraryEntries(kind);
  const filtered = filterLibrary(entries, query, strokeCount, false, preferences.includeTraditional);
  const paged = libraryPage(filtered, page);
  const selected = entries.find(entry => entry.id === selectedId) ?? paged.entries[0];
  const updateKind = (value: string) => { const next = kinds.find(k => k === value); if (!next) return; onSearch(next === 'Characters' ? {} : { tab: next }); };
  void catalogVersion;
  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow">汉字 · THE CHARACTER LIBRARY</div><h1>Get to know the characters.</h1><p>Characters, radicals, components and the strokes that bring them together.</p></div><span className="heading-hanzi">汉字<span>hàn zì</span></span></div>
    <Tabs value={kind} onValueChange={updateKind} className="catalog-tabs"><TabsList aria-label="Character library categories">{kinds.map(k => <TabsTrigger key={k} value={k}>{k}<span className="catalog-tab-count">{plannedCounts[k].toLocaleString('en-US')}</span></TabsTrigger>)}</TabsList>
      {kinds.map(k => <TabsContent value={k} key={k}>
        <div className="filter-bar"><div className="search-field"><Search/><input aria-label="Search character library" placeholder="Search Chinese, pinyin or English…" value={query} onChange={e => setQuery(e.target.value)}/></div>{k !== 'Strokes' && <select className="filter-select" aria-label="Filter by stroke count" value={strokeCount} onChange={e => setStrokeCount(e.target.value)}><option value="">All stroke counts</option>{Array.from(new Set(entries.flatMap(e => e.strokes ? [e.strokes] : []))).sort((a,b) => a-b).map(n => <option key={n} value={n}>{n} strokes</option>)}</select>}</div>
        <div className="catalog-workspace"><section className="catalog-results" aria-label={`${k} results`}><div className="result-row" aria-live="polite"><span>{catalogReady ? (k === 'Characters' && !preferences.includeTraditional ? 'Traditional forms hidden · enable them in Settings' : kindNotes[k]) : `Loading ${plannedCounts[k].toLocaleString('en-US')} records…`}<span className="sr-only">{filtered.length} {k.toLowerCase()} shown</span></span><span>{k === 'Strokes' ? 'BASIC STROKE FORMS' : 'STARTER RECORDS'}</span></div><div className="catalog-entry-grid">{paged.entries.map(entry => <CatalogTile key={entry.id} entry={entry} selected={selected?.id === entry.id} onSelect={setSelectedId}/>)}</div>{!filtered.length && <div className="empty-state"><Search/><h3>No matching records.</h3><Button variant="outline" onClick={() => set({ q: '', strokes: '', page: 1, id: '' })}>Clear filters</Button></div>}
          <div className="catalog-pagination"><span>{filtered.length ? `${(paged.current - 1) * LIBRARY_PAGE_SIZE + 1}–${Math.min(paged.current * LIBRARY_PAGE_SIZE, filtered.length)} of ${filtered.length}` : '0 records'}</span><div><Button variant="ghost" size="icon" aria-label="Previous page" disabled={paged.current <= 1} onClick={() => setPage(paged.current - 1)}><ChevronLeft/></Button><span>Page {paged.current} / {paged.pages}</span><Button variant="ghost" size="icon" aria-label="Next page" disabled={paged.current >= paged.pages} onClick={() => setPage(paged.current + 1)}><ChevronRight/></Button></div></div>
        </section>{selected ? <CharacterDetails key={selected.id} entry={selected} kind={k} /> : <section className="catalog-detail"><p className="library-note">No record selected.</p></section>}</div>
      </TabsContent>)}
    </Tabs>
  </div>;
}

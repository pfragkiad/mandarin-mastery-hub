import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Search, ChevronLeft, ChevronRight, PenLine, Volume2, Bookmark, Check, GitBranch, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { reuseGroup, reuseGroups, type ReuseGroup } from '@/lib/component-reuse';
import { libraryEntries, filterLibrary, libraryPage, libraryDestination, glyphIndex, LIBRARY_PAGE_SIZE, plannedCounts, type LibraryKind, type LibraryEntry } from '@/lib/character-library';
import { playCharacter, characterRecording } from '@/lib/catalog-store';
import { strokeSpeech } from './stroke-practice';
import { useRecordScroll } from '@/lib/selection-scroll';
import { includeSelectedRecord } from '@/lib/record-selection';
import { glyphUsage } from '@/lib/glyph-usage';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { useWorkspace } from './workspace';
import { RecordCardFooter } from './record-card-footer';
import { DecompositionTree } from './decomposition-tree';
import { GlyphUsageExamples } from './glyph-usage';
import { RecordDetailTitle } from './record-detail-title';
import { CharacterEnrichmentNotes } from './character-enrichment';
import { RadicalIdentityNote } from './radical-identity';
import { radicalIdentity } from '@/lib/radical-identities';
import { radicalStrokes, radicalFamily, radicalForm } from '@/lib/radical-strokes';
import { RadicalForms } from './radical-forms';
import { RadicalStrokeDecomposition } from './radical-stroke-decomposition';

const kinds: LibraryKind[] = ['Characters', 'Radicals', 'Components', 'Strokes'];
const kindNotes: Record<LibraryKind, string> = { Characters: 'Traditional forms marked from Unihan variant data', Radicals: 'Kangxi families · Unihan 17.0.0 · variants: cjklib C-locale', Components: 'Make Me a Hanzi components', Strokes: 'Unicode 18.0 stroke inventory' };
function ReuseLabel({ count, compact = false, radical = false }: { count: number; compact?: boolean; radical?: boolean }) {
  const group = reuseGroup(count);
  return <span className={`component-reuse-label reuse-${group.value}`} title={`${group.label} · ${count} distinct characters ${radical ? 'classified under this dictionary radical' : 'in recorded breakdowns'}, including simplified and traditional forms; not everyday language frequency.`}>{compact ? count ? `${count} chars` : 'Unrecorded' : `${group.label} · ${count} characters`}</span>;
}
/** Strokes speak their recorded Chinese name (㇐ → 横); other glyphs speak themselves. */
function speechTarget(entry: LibraryEntry, kind: LibraryKind) {
  if (kind !== 'Strokes') return { text: entry.hanzi as string | null, reading: entry.pinyin || null };
  const { name, reading } = strokeSpeech(entry);
  return { text: name, reading };
}
export function CharacterDetails({ entry: heading, kind, variant }: { entry: LibraryEntry; kind: LibraryKind; variant?: string | undefined }) {
  const form = kind === 'Radicals' && heading.kangxiIndex ? radicalForm(heading.kangxiIndex, variant) : undefined;
  const exact = form ? ['Radicals', 'Characters', 'Components'].flatMap(k => libraryEntries(k as LibraryKind)).find(item => item.hanzi === form.character) : undefined;
  const entry = form ? { ...heading, hanzi: form.character, strokes: form.strokeCount, pinyin: exact?.pinyin ?? '', meaning: exact?.meaning ?? '', note: `${form.strokeCount} strokes · Kangxi family #${heading.kangxiIndex} · ${form.formKind}`, ...(form.character === heading.hanzi && heading.reuseCount !== undefined ? { reuseCount: heading.reuseCount } : {}) } : heading;
  const { preferences, saved, toggleSaved } = useWorkspace();
  if (form && form.character !== heading.hanzi) delete entry.reuseCount;
  const bookmarked = saved.includes(entry.id);
  const [audioError, setAudioError] = useState<string | null>(null);
  const { text: spoken, reading } = speechTarget(entry, kind);
  const recording = spoken ? characterRecording(spoken, reading) : null;
  const audioAvailable = usePronunciationAvailability(Boolean(recording), reading);
  const listen = async () => setAudioError(spoken ? await playCharacter(spoken, preferences.slow, reading) : null);
  return <section className="catalog-detail" aria-label={`Details for ${entry.hanzi}`}>
    <div className="eyebrow">{kind === 'Strokes' ? 'STROKE REFERENCE' : 'CHARACTER REFERENCE'}</div>
    <RecordDetailTitle hanzi={entry.hanzi} pinyin={entry.pinyin} meaning={entry.meaning} script={entry.script} audio={<Button variant="ghost" size="icon" className={audioAvailable ? '' : 'audio-tts-only'} disabled={!audioAvailable} aria-label={audioAvailable ? `Listen to ${spoken ?? entry.hanzi}` : `No audio available for ${spoken ?? entry.hanzi}`} title={audioAvailable ? recording ? 'Listen to pronunciation' : 'Browser speech · no recording for this character' : undefined} onClick={listen}><Volume2/></Button>}/>
    {audioError && <p role="status" className="library-note">{audioError}</p>}
    <dl className="catalog-facts"><div><dt>Stroke count</dt><dd>{entry.strokes ?? 'Not recorded'}</dd></div><div><dt>Record</dt><dd className="catalog-record-value">{kind.slice(0, -1)}{entry.reuseCount !== undefined && <ReuseLabel count={entry.reuseCount} radical={kind === 'Radicals'}/>}</dd></div></dl>
    <p className="catalog-record-note">{entry.note}</p>
    {(kind === 'Radicals' || kind === 'Components' || radicalIdentity(entry.hanzi).radicals.length > 0) && kind !== 'Strokes' && <RadicalIdentityNote glyph={entry.hanzi}/>}
    {kind === 'Radicals' && heading.kangxiIndex && <RadicalForms familyId={heading.kangxiIndex} selectedKey={form?.key ?? radicalFamily(heading.kangxiIndex)?.forms.find(item => item.character === heading.hanzi)?.key}/>}
    <div className="word-detail-actions"><Button asChild variant="outline" size="sm"><Link to="/strokes" search={kind === 'Strokes' ? { stroke: entry.hanzi } : { character: entry.hanzi, ...(form ? { family: heading.kangxiIndex, variant: form.key } : {}) }}><PenLine/>Practice writing</Link></Button><Button variant="outline" size="sm" disabled={Boolean(form && form.character !== heading.hanzi)} title={form && form.character !== heading.hanzi ? 'Bookmarks belong to the Kangxi family card' : undefined} onClick={() => toggleSaved(entry.id)}>{bookmarked ? <Check/> : <Bookmark/>}{bookmarked ? 'Saved' : 'Save glyph'}</Button></div>
    <GlyphUsageExamples entry={entry} kind={kind}/>
    <div className="decomposition-section"><h3 className="eyebrow"><GitBranch size={13} aria-hidden="true"/>DECOMPOSITION</h3>
      {kind === 'Radicals' ? <RadicalStrokeDecomposition glyph={entry.hanzi} form={form}/> : entry.decomposition ? <><ul className="decomposition-tree"><DecompositionTree node={entry.decomposition.root}/></ul><p className="decomposition-note">IDS describes graphical structure, not verified etymology or component meaning. Components link to their library card.</p><p className="detail-footnote decomposition-footnote">Source · {entry.decomposition.source}<br/>Verification · {entry.decomposition.status}</p></> : <div className="record-gap"><p>{kind === 'Strokes' ? 'Decomposition does not apply to an individual stroke.' : 'No recorded decomposition available yet.'}</p>{kind !== 'Strokes' && <small>This record has no breakdown in the imported sources. None is inferred.</small>}</div>}
      {entry.decomposition && <CharacterEnrichmentNotes character={entry.hanzi} tree={entry.decomposition.root}/>}
    </div><p className="source-note">Unicode Unihan 17.0.0 readings and meanings.</p>
  </section>;
}
function CatalogTile({ entry, kind, selected, onSelect }: { entry: LibraryEntry; kind: LibraryKind; selected: boolean; onSelect: (id: string) => void }) {
  const { preferences, saved, toggleSaved, items, catalogVersion } = useWorkspace();
  const hasExample = useMemo(() => glyphUsage(entry, kind, items, libraryEntries('Characters'), preferences.includeTraditional).length > 0, [entry, kind, items, preferences.includeTraditional, catalogVersion]);
  const { text: spoken, reading } = speechTarget(entry, kind);
  const recording = spoken ? characterRecording(spoken, reading) : null;
  const audioAvailable = usePronunciationAvailability(Boolean(recording), reading);
  const [audioError, setAudioError] = useState<string | null>(null);
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
      setClipped(spans.some(el => el ? el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1 : false));
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
  const tile = <Button ref={tileRef} variant="ghost" className="word-open catalog-entry" aria-label={label} aria-pressed={selected} onPointerEnter={() => setEngaged(true)} onPointerLeave={() => setEngaged(false)} onFocus={() => setEngaged(true)} onBlur={() => setEngaged(false)} onClick={() => onSelect(entry.id)}>
      <span className="word-character">{hasPinyin ? <span className="pinyin">{entry.pinyin}</span> : <span className="tile-absent">no pinyin</span>}<strong lang="zh-CN" className={entry.script === 'Traditional' ? 'traditional-character' : ''}>{entry.hanzi}</strong></span>
      {hasMeaning ? <span className="word-meaning catalog-entry-meaning">{entry.meaning}</span> : <span className="tile-absent catalog-entry-meaning">no meaning</span>}
    </Button>;
  return <article data-entry-id={entry.id} className={`word-card catalog-card ${kind === 'Radicals' ? 'radical-family-card' : ''} ${selected ? 'is-selected' : ''}`}>
    <div className="word-card-top"><span className="word-level-wrap"><span className="word-level">{entry.script === 'Traditional' ? <span className="traditional-label">Traditional</span> : (entry.id.split(':')[0] ?? 'Glyphs').slice(0, -1).toUpperCase()}</span>{entry.kangxiIndex !== undefined && <span className="word-hsk-id" title="Official Kangxi radical index" aria-label={`Kangxi radical index ${entry.kangxiIndex}`}>ID {entry.kangxiIndex}</span>}</span><span className="catalog-card-indicators">{hasExample && <span title="In a sentence available"><MessageSquareText className="catalog-source-icon" aria-label="In a sentence available"/></span>}{(entry.decomposition || (kind === 'Radicals' && radicalStrokes(entry.hanzi)?.status === 'recorded')) && <span title="Decomposition available"><GitBranch className="catalog-source-icon" aria-label="Decomposition available"/></span>}</span></div>
    <Tooltip open={clipped && engaged}><TooltipTrigger asChild>{tile}</TooltipTrigger>
    {clipped && <TooltipContent side={side} className="tile-tooltip"><span className="tile-tooltip-head"><strong lang="zh-CN">{entry.hanzi}</strong>{hasPinyin ? <span className="pinyin">{entry.pinyin}</span> : <span className="tile-absent">no pinyin</span>}</span><p className="tile-tooltip-meaning">{entry.meaning || 'No English meaning recorded in this source.'}</p>{entry.script === 'Traditional' && <small className="traditional-label">Traditional</small>}</TooltipContent>}
  </Tooltip>
    {kind === 'Radicals' && entry.kangxiIndex && <div className="radical-tile-forms" aria-label={`Variants of ${entry.hanzi}`}>{[...new Set(radicalFamily(entry.kangxiIndex)?.forms.map(form => form.character).filter(glyph => glyph !== entry.hanzi) ?? [])].map(glyph => <span key={glyph} lang="zh-CN">{glyph}</span>)}</div>}
    <RecordCardFooter metadata={entry.reuseCount !== undefined ? <ReuseLabel count={entry.reuseCount} compact radical={entry.id.startsWith('Radicals:')}/> : entry.strokes !== undefined ? `${entry.strokes} strokes` : 'Stroke form'} hanzi={entry.hanzi} bookmarked={saved.includes(entry.id)} onBookmark={() => toggleSaved(entry.id)} audioAvailable={audioAvailable} audioTitle={recording ? 'Listen · Recording' : 'Browser speech · no recording'} onListen={async () => setAudioError(spoken ? await playCharacter(spoken, preferences.slow, reading) : null)}/>
    {audioError && <p className="catalog-card-audio-error" role="status">{audioError}</p>}
  </article>;
}

export type CharactersSearch = { character?: string; tab?: LibraryKind; q?: string; strokes?: string; reuse?: ReuseGroup | undefined; page?: number; id?: string; status?: 'saved' | undefined; py?: 'pinyin' | undefined; variant?: string | undefined };

/** All library state lives in the URL so browser back/forward restores tab, filters, page and selection. */
export function CharactersPage({ search, onSearch }: { search: CharactersSearch; onSearch: (next: CharactersSearch, replace?: boolean) => void }) {
  const { preferences, catalogVersion, saved } = useWorkspace();
  const catalogReady = catalogVersion > 0;
  const glyphHit = search.character && !search.id ? glyphIndex()[search.character] : undefined;
  const selectedKind = kinds.find(k => search.id?.startsWith(`${k}:`));
  const kind: LibraryKind = selectedKind ?? search.tab ?? glyphHit?.kind ?? 'Characters';
  const query = search.q ?? '';
  const strokeCount = search.strokes ?? '';
  const pinyinOnly = search.py === 'pinyin';
  const hasUsage = kind === 'Components' || kind === 'Radicals';
  const reuse = hasUsage ? search.reuse : undefined;
  const savedOnly = search.status === 'saved';
  const hasFilter = Boolean(query.trim() || strokeCount || reuse || savedOnly || pinyinOnly);
  const page = search.page ?? 1;
  const selectedId = search.id ?? glyphHit?.id ?? '';
  const clean = (s: CharactersSearch): CharactersSearch => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined && v !== '' && !(v === 1))) as CharactersSearch;
  const base: CharactersSearch = { variant: search.variant, tab: kind, q: query, strokes: strokeCount, reuse, page, id: selectedId, status: search.status, py: search.py };
  const set = (patch: CharactersSearch, replace = false) => onSearch(clean({ ...base, ...patch }), replace);
  const setQuery = (q: string) => set({ q, page: 1, id: '' }, true);
  const setStrokeCount = (strokes: string) => set({ strokes, page: 1, id: '' });
  const setPage = (p: number) => set({ page: p, id: '' });
  const setSelectedId = (id: string) => set({ id, variant: undefined });
  const entries = libraryEntries(kind);
  const filtered = includeSelectedRecord(entries, filterLibrary(entries, query, strokeCount, false, preferences.includeTraditional, reuse, savedOnly ? saved : undefined, pinyinOnly), selectedId);
  const paged = libraryPage(filtered, page, LIBRARY_PAGE_SIZE, selectedId);
  const selected = entries.find(entry => entry.id === selectedId) ?? paged.entries[0];
  useRecordScroll(selected?.id ?? '', catalogReady);
  const updateKind = (value: string) => { const next = kinds.find(k => k === value); if (!next) return; onSearch({ ...(next === 'Characters' ? {} : { tab: next }), ...(savedOnly ? { status: 'saved' } : {}) }); };
  void catalogVersion;
  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow">汉字 · THE GLYPH LIBRARY</div><h1>Get to know the characters.</h1><p>Characters, radicals, components and the strokes that bring them together.</p></div><span className="heading-hanzi">汉字<span>hàn zì</span></span></div>
    <Tabs value={kind} onValueChange={updateKind} className="catalog-tabs"><div className="vocabulary-category-row glyph-category-row"><TabsList aria-label="Character library categories">{kinds.map(k => <TabsTrigger key={k} value={k}>{k}<span className="catalog-tab-count">{plannedCounts[k].toLocaleString('en-US')}</span></TabsTrigger>)}</TabsList><div className="vocabulary-saved-filter" aria-label="Saved glyphs">{['all', 'saved'].map(status => <Button key={status} variant="ghost" className={(status === 'saved') === savedOnly ? 'selected' : ''} aria-pressed={(status === 'saved') === savedOnly} onClick={() => set({ status: status === 'saved' ? 'saved' : undefined, page: 1, id: '' })}>{status === 'saved' ? 'Saved' : 'All'}{status === 'saved' && <span className="catalog-tab-count">{filterLibrary(libraryEntries(kind), '', '', false, preferences.includeTraditional, undefined, saved).length}</span>}</Button>)}</div></div>
      {kinds.map(k => <TabsContent value={k} key={k}>
        <div className="filter-bar"><div className="search-field"><Search/><input aria-label="Search character library" placeholder="Search Chinese, pinyin or English…" value={query} onChange={e => setQuery(e.target.value)}/><button type="button" className={`search-toggle${pinyinOnly ? ' on' : ''}`} aria-pressed={pinyinOnly} title="Search pinyin only" onClick={() => set({ py: pinyinOnly ? undefined : 'pinyin', page: 1, id: '' }, true)}>Pinyin</button></div>{k !== 'Strokes' && <select className="filter-select" aria-label="Filter by stroke count" value={strokeCount} onChange={e => setStrokeCount(e.target.value)}><option value="">All stroke counts</option>{Array.from(new Set(entries.flatMap(e => e.strokes ? [e.strokes] : []))).sort((a,b) => a-b).map(n => <option key={n} value={n}>{n} strokes</option>)}</select>}{hasUsage && <Select value={reuse ?? 'all'} onValueChange={value => set({ reuse: reuseGroups.find(group => group.value === value)?.value, page: 1, id: '' })}><SelectTrigger className="filter-select reuse-filter" aria-label="Filter by usage"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All usage categories</SelectItem>{reuseGroups.map(group => <SelectItem key={group.value} value={group.value}>{group.label}{group.max ? ` · ${group.min}${group.max === Infinity ? '+' : `–${group.max}`}` : ''}</SelectItem>)}</SelectContent></Select>}</div>
        <div className="catalog-workspace"><section className="catalog-results" aria-label={`${k} results`}><div className="result-row" aria-live="polite"><span>{catalogReady ? (k === 'Characters' && !preferences.includeTraditional ? 'Traditional forms hidden · enable them in Settings' : kindNotes[k]) : `Loading ${plannedCounts[k].toLocaleString('en-US')} records…`}</span>{catalogReady && <span className="catalog-results-count">{filtered.length.toLocaleString('en-US')} {k.toLowerCase()} {hasFilter ? 'match' : 'available'}</span>}</div><div className="catalog-entry-grid">{paged.entries.map(entry => <CatalogTile key={entry.id} entry={entry} kind={k} selected={selected?.id === entry.id} onSelect={setSelectedId}/>)}</div>{!filtered.length && <div className="empty-state"><Search/><h3>No matching records.</h3><Button variant="outline" onClick={() => set({ q: '', strokes: '', reuse: undefined, status: undefined, py: undefined, page: 1, id: '' })}>Clear filters</Button></div>}
          <div className="catalog-pagination"><span>{filtered.length ? `${(paged.current - 1) * LIBRARY_PAGE_SIZE + 1}–${Math.min(paged.current * LIBRARY_PAGE_SIZE, filtered.length)}` : '0 records'}</span><div><Button variant="ghost" size="icon" aria-label="Previous page" disabled={paged.current <= 1} onClick={() => setPage(paged.current - 1)}><ChevronLeft/></Button><span>Page {paged.current} / {paged.pages}</span><Button variant="ghost" size="icon" aria-label="Next page" disabled={paged.current >= paged.pages} onClick={() => setPage(paged.current + 1)}><ChevronRight/></Button></div></div>
        </section>{selected ? <CharacterDetails key={`${selected.id}:${search.variant ?? ''}`} entry={selected} kind={k} variant={search.variant} /> : <section className="catalog-detail"><p className="library-note">No record selected.</p></section>}</div>
      </TabsContent>)}
    </Tabs>
  </div>;
}

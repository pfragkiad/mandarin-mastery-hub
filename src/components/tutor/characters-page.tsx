import { DetailSheet, useNarrowLibrary } from './detail-sheet';
import { SourceInfo } from '@/components/tutor/source-info';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Search, ChevronLeft, ChevronRight, PenLine, Volume2, Bookmark, Check, GitBranch, MessageSquareText, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { usageGroups, usageGroupFor, usageRank, parseUsageGroup, usageOrder } from '@/lib/usage-frequency';
import { libraryEntries, filterLibrary, libraryPage, libraryDestination, glyphIndex, LIBRARY_PAGE_SIZE, plannedCounts, radicalVariantFallback, type LibraryKind, type LibraryEntry } from '@/lib/character-library';
import { playCharacter, characterRecording } from '@/lib/catalog-store';
import { strokeSpeech } from './stroke-practice';
import { useRecordScroll } from '@/lib/selection-scroll';
import { includeSelectedRecord } from '@/lib/record-selection';
import { glyphUsage } from '@/lib/glyph-usage';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { useWorkspace } from './workspace';
import { RecordCardFooter } from './record-card-footer';
import { TileSpeaker } from './tile-speaker';
import { DecompositionTree } from './decomposition-tree';
import { GlyphUsageExamples } from './glyph-usage';
import { RecordDetailTitle } from './record-detail-title';
import { CharacterEnrichmentNotes } from './character-enrichment';
import { RadicalIdentityNote } from './radical-identity';
import { radicalIdentity } from '@/lib/radical-identities';
import { glyphPresentation } from '@/lib/glyph-presentation';
import { radicalStrokes, radicalFamily, radicalForm } from '@/lib/radical-strokes';
import { RadicalForms } from './radical-forms';
import { RadicalStrokeDecomposition, RadicalStrokeSourceInfo } from './radical-stroke-decomposition';

const kinds: LibraryKind[] = ['Characters', 'Radicals', 'Components', 'Strokes'];
const kindNotes: Record<LibraryKind, string> = { Characters: 'Traditional forms marked from Unihan variant data', Radicals: 'Kangxi families · Unihan 17.0.0 · variants: cjklib C-locale', Components: 'Make Me a Hanzi components', Strokes: 'Unicode 18.0 stroke inventory' };
function UsageLabel({ rank, kind, compact = false }: { rank: number | null; kind: LibraryKind; compact?: boolean }) {
  const group = usageGroupFor(kind, rank);
  const tier = rank === null ? 'none' : (usageGroups(kind).indexOf(group!) < 2 ? 'top' : 'mid');
  return <span className={`component-reuse-label usage-${tier}`}>{rank === null ? (compact ? 'Unranked' : 'No frequency data') : compact ? `#${rank.toLocaleString('en-US')}` : `#${rank.toLocaleString('en-US')} · ${group?.label ?? ''}`}</span>;
}
/** Strokes speak their recorded Chinese name (㇐ → 横); other glyphs speak themselves. */
function speechTarget(entry: LibraryEntry, kind: LibraryKind) {
  if (kind !== 'Strokes') { const info = glyphPresentation(entry.hanzi, kind, entry.pinyin, entry.meaning); return { text: info.speech, reading: info.reading || null }; }
  const { name, reading } = strokeSpeech(entry);
  return { text: name, reading };
}
export function CharacterDetails({ entry: heading, kind, variant }: { entry: LibraryEntry; kind: LibraryKind; variant?: string | undefined }) {
  const form = kind === 'Radicals' && heading.kangxiIndex ? radicalForm(heading.kangxiIndex, variant) : undefined;
  const exact = form ? ['Radicals', 'Characters', 'Components'].flatMap(k => libraryEntries(k as LibraryKind)).find(item => item.hanzi === form.character) : undefined;
  const entry = form ? { ...heading, hanzi: form.character, strokes: form.strokeCount, pinyin: exact?.pinyin ?? '', meaning: exact?.meaning ?? '', note: `${form.strokeCount} strokes · Kangxi family #${heading.kangxiIndex} · ${form.formKind}` } : heading;
  const { preferences, saved, toggleSaved } = useWorkspace();
  const info = glyphPresentation(entry.hanzi, kind, entry.pinyin, entry.meaning);
  const noteRadical = entry.note.match(/·\s*(.+?) radical$/)?.[1];
  const kangxiNumber = kind === 'Radicals' ? heading.kangxiIndex : radicalIdentity(entry.hanzi).radicals[0]?.number;
  const radicalFact = (() => {
    if (kind === 'Strokes') return null;
    if (noteRadical) {
      const identity = radicalIdentity(entry.hanzi).radicals.find(radical => radical.glyph === noteRadical);
      const destination = libraryDestination(noteRadical, preferences.includeTraditional);
      return <span className="facts-radical">{destination
        ? <Button asChild variant="ghost" className="decomposition-glyph"><Link to="/characters" search={destination} resetScroll={false} aria-label={identity ? `Open Kangxi radical ${identity.number}` : `Open radical ${noteRadical}`}><strong lang="zh-CN">{noteRadical}</strong></Link></Button>
        : <strong lang="zh-CN" className="decomposition-glyph decomposition-glyph-static">{noteRadical}</strong>}</span>;
    }
    return kangxiNumber ? <span className="word-hsk-id radical-tag">Radical #{kangxiNumber}</span> : null;
  })();
  const bookmarked = saved.includes(entry.id);
  const [audioError, setAudioError] = useState<string | null>(null);
  const fallback = form && form.character !== heading.hanzi ? radicalVariantFallback(entry.hanzi, entry.pinyin) : kind === 'Components' ? radicalVariantFallback(entry.hanzi, entry.pinyin) : null;
  const base = speechTarget(entry, kind);
  const spoken = fallback ? fallback.spoken : base.text;
  const reading = fallback ? fallback.reading : base.reading;
  const recording = spoken ? characterRecording(spoken, reading) : null;
  const audioAvailable = usePronunciationAvailability(Boolean(recording), reading);
  const listen = async () => setAudioError(spoken ? await playCharacter(spoken, preferences.slow, reading) : null);
  return <section className="catalog-detail" aria-label={`Details for ${entry.hanzi}`}>
    <div className="eyebrow">{info.label.toUpperCase()} REFERENCE</div>
    <RecordDetailTitle hanzi={entry.hanzi} pinyin={fallback ? fallback.pinyin : info.componentName ? `Component name · ${info.reading}` : info.reading} pinyinFallback={fallback ? '' : info.readingFallback} meaning={kind === 'Components' && fallback?.meaning ? `${fallback.meaning} · ${info.meaning}` : kind === 'Components' ? stripKangxiLabel(info.meaning) : info.meaning} script={entry.script} audio={<Button variant="ghost" size="icon" className={audioAvailable ? '' : 'audio-tts-only'} disabled={!audioAvailable} aria-label={audioAvailable ? `Listen to ${spoken ?? entry.hanzi}` : `No audio available for ${spoken ?? entry.hanzi}`} title={audioAvailable ? recording ? 'Listen to pronunciation' : 'Browser speech · no recording for this character' : undefined} onClick={listen}><Volume2/></Button>}/>
    {audioError && <p role="status" className="library-note">{audioError}</p>}
    <div className="word-detail-actions"><Button asChild variant="outline" size="sm"><Link to="/strokes" search={kind === 'Strokes' ? { stroke: entry.hanzi } : { character: entry.hanzi, ...(form ? { family: heading.kangxiIndex, variant: form.key } : {}) }}><PenLine/>Practice writing</Link></Button><Button variant="outline" size="sm" disabled={Boolean(form && form.character !== heading.hanzi)} title={form && form.character !== heading.hanzi ? 'Bookmarks belong to the Kangxi family card' : undefined} onClick={() => toggleSaved(entry.id)}>{bookmarked ? <Check/> : <Bookmark/>}{bookmarked ? 'Saved' : 'Save glyph'}</Button></div>
    <dl className="catalog-facts"><div><dt>Stroke count</dt><dd>{entry.strokes ?? 'Not recorded'}</dd></div>{radicalFact && <div><dt>Radical</dt><dd>{radicalFact}</dd></div>}<div><dt>Record</dt><dd className="catalog-record-value">{info.label}</dd></div>{(kind === 'Characters' || kind === 'Components' || (kind === 'Radicals' && (!form || form.character === heading.hanzi))) && usageOrder.loaded && <div><dt className="catalog-rank-label">Rank<SourceInfo inline className="detail-footnote">{kind === 'Characters' ? 'Corpus frequency rank' : `Estimated ${kind === 'Radicals' ? 'radical' : 'component'} exposure rank, derived from character frequencies`} · {usageOrder.data?.source.provider ?? 'Jun Da Modern Chinese corpus'}</SourceInfo></dt><dd><UsageLabel rank={usageRank(heading, kind, preferences.includeTraditional)} kind={kind}/></dd></div>}</dl>
    {info.component && <p className="catalog-record-note">{info.codePoint}{fallback ? ` · Name and reading follow the main form ${fallback.headingGlyph} · ${fallback.pinyin}.` : info.componentName ? ` · ${info.componentName.text} is a component name, not a standalone character reading.` : info.characterPinyin ? ` · Radical form that is also an ordinary character.` : ' · No standalone character pronunciation is assigned to this form.'}</p>}
    {(kind === 'Components' || (kind === 'Characters' && radicalIdentity(entry.hanzi).radicals.length > 0)) && <RadicalIdentityNote glyph={entry.hanzi}/>}
    {kind === 'Radicals' && heading.kangxiIndex && <RadicalForms familyId={heading.kangxiIndex} selectedKey={form?.key ?? radicalFamily(heading.kangxiIndex)?.forms.find(item => item.character === heading.hanzi)?.key}/>}
    <GlyphUsageExamples entry={entry} kind={kind}/>
    <div className="decomposition-section"><h3 className="eyebrow"><GitBranch size={13} aria-hidden="true"/>DECOMPOSITION{kind === 'Radicals' ? <RadicalStrokeSourceInfo glyph={entry.hanzi} form={form}/> : entry.decomposition && <><SourceInfo inline className="detail-footnote decomposition-footnote">Source · {entry.decomposition.source}<br/>Verification · {entry.decomposition.status}</SourceInfo><SourceInfo inline variant="warning" className="decomposition-note">IDS describes graphical structure, not verified etymology or component meaning. Components link to their library card.</SourceInfo></>}</h3>
      {kind === 'Radicals' ? <RadicalStrokeDecomposition glyph={entry.hanzi} form={form} sourceInHeading/> : entry.decomposition ? <><ul className="decomposition-tree"><DecompositionTree node={entry.decomposition.root}/></ul></> : <div className="record-gap"><p>{kind === 'Strokes' ? 'Decomposition does not apply to an individual stroke.' : 'No recorded decomposition available yet.'}</p>{kind !== 'Strokes' && <small>This record has no breakdown in the imported sources. None is inferred.</small>}</div>}
      {entry.decomposition && <CharacterEnrichmentNotes character={entry.hanzi} tree={entry.decomposition.root}/>}
    </div><p className="source-note">{info.source ?? 'Unicode Unihan 17.0.0 readings and meanings.'}</p>
  </section>;
}
/** Tiles already show the Kangxi ID badge, so drop the redundant "Kangxi radical N" gloss fragment. */
export const stripKangxiLabel = (meaning: string) => meaning.split(/;\s*/).filter(part => !/^(?:Kangxi )?radical\s*#?\s*\d+$/i.test(part.trim())).join('; ') || meaning;
function CatalogTile({ entry, kind, selected, onSelect }: { entry: LibraryEntry; kind: LibraryKind; selected: boolean; onSelect: (id: string) => void }) {
  const { preferences, saved, toggleSaved, items, catalogVersion } = useWorkspace();
  const hasExample = useMemo(() => glyphUsage(entry, kind, items, libraryEntries('Characters'), preferences.includeTraditional).length > 0, [entry, kind, items, preferences.includeTraditional, catalogVersion]);
  const fallback = kind === 'Radicals' || kind === 'Components' ? radicalVariantFallback(entry.hanzi, entry.pinyin) : null;
  const base = speechTarget(entry, kind);
  const spoken = fallback ? fallback.spoken : base.text;
  const reading = fallback ? fallback.reading : base.reading;
  const recording = spoken ? characterRecording(spoken, reading) : null;
  const audioAvailable = usePronunciationAvailability(Boolean(recording), reading);
  const [audioError, setAudioError] = useState<string | null>(null);
  const info = glyphPresentation(entry.hanzi, kind, entry.pinyin, entry.meaning);
  const tileMeaning = kind === 'Components' && fallback?.meaning ? `${fallback.meaning} · ${info.meaning}` : kind === 'Radicals' || kind === 'Components' ? stripKangxiLabel(info.meaning) : info.meaning;
  const componentRadical = kind === 'Components' ? radicalIdentity(entry.hanzi).radicals : [];
  const hasPinyin = Boolean(info.reading || fallback?.pinyin);
  const hasMeaning = Boolean(info.meaning);
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
  const label = `View ${entry.hanzi}${hasPinyin ? '' : `, ${info.readingFallback.toLowerCase()}`}${hasMeaning ? '' : ', no meaning recorded'}`;
  const variants = kind === 'Radicals' && entry.kangxiIndex ? [...new Set(radicalFamily(entry.kangxiIndex)?.forms.map(form => form.character).filter(glyph => glyph !== entry.hanzi) ?? [])] : [];
  const tile = <Button ref={tileRef} variant="ghost" className="word-open catalog-entry" aria-label={label} aria-pressed={selected} onPointerEnter={() => setEngaged(true)} onPointerLeave={() => setEngaged(false)} onFocus={() => setEngaged(true)} onBlur={() => setEngaged(false)} onClick={() => onSelect(entry.id)}>
      <span className="word-character">{hasPinyin ? <span className="pinyin"><span className="pinyin-text">{fallback ? fallback.pinyin : info.componentName ? `Name · ${info.reading}` : info.reading}</span><TileSpeaker available={audioAvailable} label={`Listen to ${spoken ?? entry.hanzi}`} unavailableLabel={`No audio available for ${spoken ?? entry.hanzi}`} title={recording ? 'Listen · Recording' : 'Browser speech · no recording'} onActivate={async () => setAudioError(spoken ? await playCharacter(spoken, preferences.slow, reading) : null)}/></span> : <span className="pinyin"><span className="tile-absent">{info.component ? 'name not recorded' : 'no pinyin'}</span><TileSpeaker available={audioAvailable} label={`Listen to ${spoken ?? entry.hanzi}`} unavailableLabel={`No audio available for ${spoken ?? entry.hanzi}`} title={recording ? 'Listen · Recording' : 'Browser speech · no recording'} onActivate={async () => setAudioError(spoken ? await playCharacter(spoken, preferences.slow, reading) : null)}/></span>}<span className="tile-hanzi-row"><strong lang="zh-CN" className={`tile-form ${entry.script === 'Traditional' ? 'traditional-character' : ''}`}>{entry.hanzi}</strong>{variants.length > 0 && <span className="radical-tile-forms" aria-label={`Variants of ${entry.hanzi}`}>{variants.map(glyph => <span key={glyph} lang="zh-CN" className="tile-form">{glyph}</span>)}</span>}</span></span>
      {hasMeaning ? <span className="word-meaning catalog-entry-meaning">{tileMeaning}</span> : <span className="tile-absent catalog-entry-meaning">no meaning</span>}
    </Button>;
  return <article data-entry-id={entry.id} className={`word-card catalog-card ${kind === 'Radicals' ? 'radical-family-card' : ''} ${selected ? 'is-selected' : ''}`}>
    <div className="word-card-top"><span className="word-level-wrap"><span className="word-level">{entry.script === 'Traditional' ? <span className="traditional-label">Traditional</span> : info.label.toUpperCase()}</span>{entry.kangxiIndex !== undefined && <span className="word-hsk-id" title="Official Kangxi radical index" aria-label={`Kangxi radical index ${entry.kangxiIndex}`}>ID {entry.kangxiIndex}</span>}{componentRadical.length === 1 && componentRadical[0] && <span className="word-hsk-id" title="Sourced Kangxi radical identity">Radical #{componentRadical[0].number}</span>}</span><span className="catalog-card-indicators">{hasExample && <span title="In a sentence available"><MessageSquareText className="catalog-source-icon" aria-label="In a sentence available"/></span>}{(entry.decomposition || (kind === 'Radicals' && radicalStrokes(entry.hanzi)?.status === 'recorded')) && <span title="Decomposition available"><GitBranch className="catalog-source-icon" aria-label="Decomposition available"/></span>}</span></div>
    <Tooltip open={clipped && engaged}><TooltipTrigger asChild>{tile}</TooltipTrigger>
    {clipped && <TooltipContent side={side} className="tile-tooltip"><span className="tile-tooltip-head"><strong lang="zh-CN">{entry.hanzi}</strong>{hasPinyin ? <span className="pinyin">{fallback ? fallback.pinyin : info.componentName ? `Name · ${info.reading}` : info.reading}</span> : <span className="tile-absent">{info.component ? 'name not recorded' : 'no pinyin'}</span>}</span><p className="tile-tooltip-meaning">{tileMeaning || 'No English meaning recorded in this source.'}</p>{entry.script === 'Traditional' && <small className="traditional-label">Traditional</small>}</TooltipContent>}
  </Tooltip>
    <RecordCardFooter practice={kind === 'Strokes' ? { stroke: entry.hanzi } : { character: entry.hanzi }} metadata={kind !== 'Strokes' && usageOrder.loaded ? <>{entry.strokes !== undefined && <span className="usage-strokes">{entry.strokes} strokes · </span>}<UsageLabel rank={usageRank(entry, kind, preferences.includeTraditional)} kind={kind} compact/></> : entry.strokes !== undefined ? `${entry.strokes} strokes` : info.component || kind === 'Components' ? 'Component form' : kind === 'Strokes' ? 'Stroke' : 'Stroke count not recorded'} hanzi={entry.hanzi} bookmarked={saved.includes(entry.id)} onBookmark={() => toggleSaved(entry.id)}/>
    {audioError && <p className="catalog-card-audio-error" role="status">{audioError}</p>}
  </article>;
}

export type CharactersSearch = { character?: string; tab?: LibraryKind; q?: string; strokes?: string; usage?: string | undefined; page?: number; id?: string; status?: 'saved' | undefined; py?: 'pinyin' | undefined; variant?: string | undefined };

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
  const hasUsage = kind !== 'Strokes';
  const usage = hasUsage ? parseUsageGroup(kind, search.usage) : undefined;
  const savedOnly = search.status === 'saved';
  const hasFilter = Boolean(query.trim() || strokeCount || usage || savedOnly || pinyinOnly);
  const page = search.page ?? 1;
  const selectedId = search.id ?? glyphHit?.id ?? '';
  const clean = (s: CharactersSearch): CharactersSearch => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined && v !== '' && !(v === 1))) as CharactersSearch;
  const base: CharactersSearch = { variant: search.variant, tab: kind, q: query, strokes: strokeCount, usage, page, id: selectedId, status: search.status, py: search.py };
  const set = (patch: CharactersSearch, replace = false) => onSearch(clean({ ...base, ...patch }), replace);
  const setQuery = (q: string) => set({ q, page: 1, id: '' }, true);
  const setStrokeCount = (strokes: string) => set({ strokes, page: 1, id: '' });
  const setPage = (p: number) => set({ page: p, id: '' });
  const setSelectedId = (id: string) => set({ id, variant: undefined });
  const entries = libraryEntries(kind);
  const filtered = includeSelectedRecord(entries, filterLibrary(entries, query, strokeCount, false, preferences.includeTraditional, usage, savedOnly ? saved : undefined, pinyinOnly), selectedId);
  const paged = libraryPage(filtered, page, LIBRARY_PAGE_SIZE, selectedId);
  const selected = entries.find(entry => entry.id === selectedId) ?? paged.entries[0];
  useRecordScroll(selected?.id ?? '', catalogReady);
  const narrow = useNarrowLibrary();
  const updateKind = (value: string) => { const next = kinds.find(k => k === value); if (!next) return; onSearch({ ...(next === 'Characters' ? {} : { tab: next }), ...(savedOnly ? { status: 'saved' } : {}) }); };
  void catalogVersion;
  const sheetIndex = narrow && search.id ? filtered.findIndex(entry => entry.id === search.id) : -1;
  const stepTo = (index: number) => { const target = filtered[index]; if (target) set({ id: target.id, variant: undefined, page: Math.floor(index / LIBRARY_PAGE_SIZE) + 1 }, true); };
  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow">汉字 · THE GLYPH LIBRARY</div><h1>Get to know the characters.</h1><p>Characters, radicals, components and the strokes that bring them together.</p></div><span className="heading-hanzi">汉字<span>hàn zì</span></span></div>
    <Tabs value={kind} onValueChange={updateKind} className="catalog-tabs"><div className="vocabulary-category-row glyph-category-row"><TabsList aria-label="Character library categories">{kinds.map(k => <TabsTrigger key={k} value={k}>{k}<span className="catalog-tab-count">{plannedCounts[k].toLocaleString('en-US')}</span></TabsTrigger>)}</TabsList><div className="vocabulary-saved-filter" aria-label="Saved glyphs">{['all', 'saved'].map(status => <Button key={status} variant="ghost" className={(status === 'saved') === savedOnly ? 'selected' : ''} aria-pressed={(status === 'saved') === savedOnly} onClick={() => set({ status: status === 'saved' ? 'saved' : undefined, page: 1, id: '' })}>{status === 'saved' ? 'Saved' : 'All'}{status === 'saved' && <span className="catalog-tab-count">{filterLibrary(libraryEntries(kind), '', '', false, preferences.includeTraditional, undefined, saved).length}</span>}</Button>)}</div></div>
      {kinds.map(k => <TabsContent value={k} key={k}>
        <div className="filter-bar"><div className="search-field"><Search/><input aria-label="Search character library" placeholder="Search Chinese, pinyin or English…" value={query} onChange={e => setQuery(e.target.value)}/><button type="button" className={`search-toggle${pinyinOnly ? ' on' : ''}`} aria-pressed={pinyinOnly} title="Search pinyin only" onClick={() => set({ py: pinyinOnly ? undefined : 'pinyin', page: 1, id: '' }, true)}>Pinyin</button></div>{k !== 'Strokes' && <select className="filter-select" aria-label="Filter by stroke count" value={strokeCount} onChange={e => setStrokeCount(e.target.value)}><option value="">All stroke counts</option>{Array.from(new Set(entries.flatMap(e => e.strokes ? [e.strokes] : []))).sort((a,b) => a-b).map(n => <option key={n} value={n}>{n} strokes</option>)}</select>}{k !== 'Strokes' && hasUsage && <Select value={usage ?? 'all'} onValueChange={value => set({ usage: parseUsageGroup(kind, value), page: 1, id: '' })}><SelectTrigger className="filter-select reuse-filter" aria-label="Filter by frequency"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All frequencies</SelectItem>{usageGroups(kind).map(group => <SelectItem key={group.value} value={group.value}>{group.label}</SelectItem>)}</SelectContent></Select>}</div>
        <div className="catalog-workspace"><section className="catalog-results" aria-label={`${k} results`}><div className="result-row" aria-live="polite"><span>{catalogReady ? (k === 'Characters' && !preferences.includeTraditional ? 'Traditional forms hidden · enable them in Settings' : kindNotes[k]) : `Loading ${plannedCounts[k].toLocaleString('en-US')} records…`}</span>{catalogReady && <span className="catalog-results-count">{filtered.length.toLocaleString('en-US')} {k.toLowerCase()} {hasFilter ? 'match' : 'available'}</span>}</div>{savedOnly && filtered.length > 0 && <div className="saved-actions"><Button asChild variant="outline" size="sm"><Link to="/flashcards" search={{ category: 'Saved' }}><Layers/>Flashcards</Link></Button><Button asChild variant="outline" size="sm"><Link to="/drawing" search={{ kind: k === 'Strokes' ? 'Characters' : k, saved: true }}><PenLine/>Drawing game</Link></Button></div>}<div className="catalog-entry-grid">{paged.entries.map(entry => <CatalogTile key={entry.id} entry={entry} kind={k} selected={selected?.id === entry.id} onSelect={setSelectedId}/>)}</div>{!filtered.length && <div className="empty-state"><Search/><h3>No matching records.</h3><Button variant="outline" onClick={() => set({ q: '', strokes: '', usage: undefined, status: undefined, py: undefined, page: 1, id: '' })}>Clear filters</Button></div>}
          <div className="catalog-pagination"><span>{filtered.length ? `${(paged.current - 1) * LIBRARY_PAGE_SIZE + 1}–${Math.min(paged.current * LIBRARY_PAGE_SIZE, filtered.length)}` : '0 records'}</span><div><Button variant="ghost" size="icon" aria-label="Previous page" disabled={paged.current <= 1} onClick={() => setPage(paged.current - 1)}><ChevronLeft/></Button><span>Page {paged.current} / {paged.pages}</span><Button variant="ghost" size="icon" aria-label="Next page" disabled={paged.current >= paged.pages} onClick={() => setPage(paged.current + 1)}><ChevronRight/></Button></div></div>
        </section>{narrow ? null : selected ? <CharacterDetails key={`${selected.id}:${search.variant ?? ''}`} entry={selected} kind={k} variant={search.variant} /> : <section className="catalog-detail"><p className="library-note">No record selected.</p></section>}</div>
      </TabsContent>)}
    </Tabs>{narrow && selected && search.id && <DetailSheet open title={`Details for ${selected.hanzi}`} onClose={() => set({ id: '', variant: undefined })} onPrevious={sheetIndex > 0 ? () => stepTo(sheetIndex - 1) : undefined} onNext={sheetIndex >= 0 && sheetIndex < filtered.length - 1 ? () => stepTo(sheetIndex + 1) : undefined}><CharacterDetails key={`${selected.id}:${search.variant ?? ''}`} entry={selected} kind={kind} variant={search.variant} /></DetailSheet>}
  </div>;
}

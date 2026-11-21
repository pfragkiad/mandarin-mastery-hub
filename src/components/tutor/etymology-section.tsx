import { useEffect, useId, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronDown, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SourceInfo } from './source-info';
import { HowellEntry } from './howell-entry';
import { useWorkspace } from './workspace';
import { glyphScript, libraryDestination } from '@/lib/character-library';
import { openDetailsHint } from '@/lib/tile-hints';
import { hasOwnEtymologyText, loadEtymologyIndex, resolveEtymology, type EtymologyEntry, type EtymologyIndex, type EtymologyRequest, type EtymologyView } from '@/lib/etymology';

/**
 * Etymology tab content of a glyph detail card (Characters, Components, Radicals and radical
 * forms), shown inside GlyphDetailTabs (detail-tabs.tsx).
 * - useEtymologyView(request, enabled): resolves the EtymologyView (lib/etymology.ts) only while
 *   `enabled` (the drawer is open), so a collapsed drawer downloads nothing. `undefined` = not
 *   resolved yet; `null` = no entry, or any identity/integrity check failed (fail closed).
 * - etymologyHasContent(view): the owner's rule — only source text or a record to link counts;
 *   the tab hides when the resolved view has neither.
 * - EtymologyInfo / EtymologyPanel: the source ⓘ shown beside the tab and the tab's body.
 * Display rules follow public/data/etymology/README.md: source text is never altered or spoken
 * (Howell's note is only laid out from its own notation, see howell-entry.tsx, with its hanzi as
 * exact-form tiles), each entry keeps its own attribution, and components and radicals only
 * link to the standalone character. Each source is its own tinted block; the whole Shuowen
 * subsection sits behind one remembered Advanced toggle.
 */
const SOURCE_LABEL: Record<EtymologyEntry['sourceId'], { name: string; kind: string }> = {
  howell: { name: 'Lawrence J. Howell', kind: 'author interpretation' },
  shuowen: { name: 'Shuowen Jiezi 說文解字', kind: 'historical dictionary · Classical Chinese' },
};
const COVERAGE: Record<string, string> = {
  both: 'Both sources have this headword · their agreement has not been reviewed',
  'howell-only': 'Only Howell has this headword',
  'shuowen-only': 'Only Shuowen Jiezi has this headword',
};

// The Shuowen Jiezi subsection starts folded (owner's choice); opening it once is
// remembered on this device, read after mount so server and first client render agree.
const CLASSICAL_OPEN_KEY = 'tutor.etymology.classicalOpen';
function useClassicalOpen(): [boolean, () => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => { try { setOpen(localStorage.getItem(CLASSICAL_OPEN_KEY) === '1'); } catch { /* storage unavailable */ } }, []);
  const toggle = () => setOpen(prev => { try { localStorage.setItem(CLASSICAL_OPEN_KEY, prev ? '0' : '1'); } catch { /* ignore */ } return !prev; });
  return [open, toggle];
}

/** Howell's note: its own source header, then the structured layout (howell-entry.tsx). */
function HowellBlock({ entry, glyph }: { entry: EtymologyEntry; glyph: string }) {
  return <div className="etymology-entry etymology-entry-howell">
    <div className="etymology-entry-head">
      <span className="etymology-source-name">{SOURCE_LABEL.howell.name}</span>
      <span className="etymology-source-kind">{SOURCE_LABEL.howell.kind}</span>
    </div>
    <HowellEntry text={entry.text} selfGlyph={glyph}/>
  </div>;
}

/** The whole Shuowen Jiezi subsection behind one remembered "Advanced" toggle (owner's
 *  choice): collapsed it is a single row naming the source; open it explains the level and
 *  shows every Shuowen entry for this headword (舌 keeps both of its IDs as separate texts). */
function ShuowenSection({ entries, withHowell }: { entries: EtymologyEntry[]; withHowell: boolean }) {
  const panelId = useId();
  const [open, toggle] = useClassicalOpen();
  return <div className={`etymology-entry etymology-entry-shuowen etymology-advanced${open ? ' is-open' : ''}`}>
    <button type="button" className="etymology-advanced-toggle" aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={toggle}>
      <ChevronDown className="etymology-advanced-chevron" aria-hidden="true"/>
      <span className="etymology-level-pill">Advanced</span>
      <span className="etymology-source-name">{SOURCE_LABEL.shuowen.name}</span>
      <span className="etymology-source-kind">{SOURCE_LABEL.shuowen.kind}</span>
      <span className="etymology-advanced-action">{open ? 'Hide' : 'Show'}</span>
    </button>
    {open && <div id={panelId} className="etymology-advanced-body more-examples-panel">
      <p className="etymology-advanced-note">Written in Classical Chinese (文言), the literary language of Xu Shen’s dictionary, compiled around 100 CE. Its grammar and wording differ from modern Mandarin, so it is hard even for fluent readers. {withHowell ? 'No modern translation is recorded here; Howell’s note above is the learner-friendly reading.' : 'No modern translation is recorded here.'}</p>
      {entries.map(entry => <p key={entry.id} className="etymology-text etymology-classical" lang="lzh">{entry.text}</p>)}
    </div>}
  </div>;
}

/** Resolves the view for the exact request while `enabled`; earlier results for other requests are ignored. */
export function useEtymologyView(request: EtymologyRequest | null, enabled: boolean): EtymologyView | null | undefined {
  const key = request ? [request.recordId, request.glyph, request.familyId ?? '', request.formKey ?? ''].join('|') : '';
  const [state, setState] = useState<{ key: string; view: EtymologyView | null } | null>(null);
  const known = state?.key === key;
  useEffect(() => {
    if (!request || !enabled || known) return;
    let live = true;
    void resolveEtymology(request).then(view => { if (live) setState({ key, view }); });
    return () => { live = false; };
    // `key` encodes every request field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, known]);
  if (!request) return null;
  return state && state.key === key ? state.view : undefined;
}

/** Owner's rule: only source text or a record to link counts; absent or blocked states
 *  (发 with no related form, #96 jade 王) have nothing to show. */
export function etymologyHasContent(view: EtymologyView | null): view is EtymologyView {
  if (!view) return false;
  if (view.status === 'exact-headword') return view.entries.length > 0;
  if (view.status === 'context-review-required') return Boolean(view.standalone);
  if (view.status === 'no-exact-headword') return view.related.length > 0;
  return false;
}

/** The tab's source note: disclaimer, coverage, each entry's source link, licences and import date. */
export function EtymologyInfo({ view }: { view: EtymologyView }) {
  const meta = view.metadata;
  const licenses = [...new Set(meta.license_notices.map(notice => `${notice.source_id === 'howell' ? 'Howell' : notice.source_id === 'shuowen' ? 'Shuowen Jiezi' : notice.source_id} · ${notice.license}`))];
  return <SourceInfo inline className="detail-footnote">
    {meta.disclaimer}<br/>
    {COVERAGE[view.coverage] && <>{COVERAGE[view.coverage]}<br/></>}
    {view.entries.map(entry => <span key={entry.id}>{SOURCE_LABEL[entry.sourceId].name} · <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">Source entry</a><br/></span>)}
    {licenses.join(' · ')}<br/>
    Imported {meta.import_date}
  </SourceInfo>;
}

/** The tab's body; `undefined` (still resolving) shows pulsing text lines. */
export function EtymologyPanel({ view }: { view: EtymologyView | null | undefined }) {
  const { preferences } = useWorkspace();
  if (view === undefined) return <div className="section-placeholder" aria-busy="true"><span className="sr-only">Loading etymology…</span><div className="section-placeholder-lines" aria-hidden="true">{[34, 92, 58].map((width, i) => <span className="section-placeholder-block" key={i} style={{ width: `${width}%` }}/>)}</div></div>;
  if (!etymologyHasContent(view)) return null;
  // Exact record links: the recorded ID wins; the glyph index only supplies its page.
  const recordLink = (id: string, target: string) => {
    const tab = id.split(':')[0] as 'Characters';
    const destination = libraryDestination(target, preferences.includeTraditional);
    const search = destination && destination.id === id ? destination : { tab, id };
    const hint = openDetailsHint(target, tab);
    return <Button asChild variant="ghost" className={`decomposition-glyph${glyphScript(target) === 'Traditional' ? ' traditional-character' : ''}`}><Link to="/characters" search={search} resetScroll={false} title={hint} aria-label={hint}><strong lang="zh-CN">{target}</strong></Link></Button>;
  };
  if (view.status === 'exact-headword') {
    const howell = view.entries.filter(entry => entry.sourceId === 'howell');
    const shuowen = view.entries.filter(entry => entry.sourceId === 'shuowen');
    return <div className="etymology-entries">
      {howell.map(entry => <HowellBlock key={entry.id} entry={entry} glyph={view.glyph}/>)}
      {shuowen.length > 0 && <ShuowenSection entries={shuowen} withHowell={howell.length > 0}/>}
    </div>;
  }
  if (view.status === 'context-review-required') {
    return view.standalone && <div className="glyph-usage-reference">{recordLink(view.standalone, view.glyph)}<span className="glyph-usage-meaning">The sources describe the standalone character <span lang="zh-CN">{view.glyph}</span>. How that applies to this form hasn’t been reviewed, so its notes stay on the character’s own card.</span></div>;
  }
  return <>
    <p className="glyph-usage-meaning">No entry for <span lang="zh-CN">{view.glyph}</span> in Howell or Shuowen Jiezi. Related written forms have their own notes (suggested, not reviewed):</p>
    <div className="glyph-usage-parents">{view.related.map(item => <div key={item.recordId} className="glyph-usage-reference">{recordLink(item.recordId, item.glyph)}{item.explanation && <span className="glyph-usage-meaning">{item.explanation}</span>}</div>)}</div>
  </>;
}

// The index once loaded, so cards mounted later (paging, Start shuffles) mark at once.
let loadedIndex: EtymologyIndex | null = null;
/** Scroll marker on a Characters grid card that has its own etymology text (owner's choice:
 *  the book stays the Lessons marker). Loads the shared index lazily after mount; nothing
 *  shows while loading or if it fails. Inputs: the card's exact record ID and hanzi. */
export function EtymologyIndicator({ recordId, hanzi }: { recordId: string; hanzi: string }) {
  const [index, setIndex] = useState<EtymologyIndex | null>(null);
  const current = index ?? loadedIndex;
  useEffect(() => {
    if (current) return;
    let live = true;
    loadEtymologyIndex().then(result => { loadedIndex = result; if (live) setIndex(result); }).catch(() => { /* no marker */ });
    return () => { live = false; };
  }, [current]);
  if (!current || !hasOwnEtymologyText(current, recordId, hanzi)) return null;
  return <span title="Etymology notes available"><History className="catalog-source-icon" aria-label="Etymology notes available"/></span>;
}

import { Fragment, useEffect, useId, useState } from 'react';
import { requestDetailTab } from '@/lib/detail-tab-memory';
import { Link } from '@tanstack/react-router';
import { ChevronDown, History, TriangleAlert } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { HintBody, SourceInfo } from './source-info';
import { HowellEntry, HowellKeyInfo } from './howell-entry';
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
 * link to the standalone character. Shuowen English is a source-bound, unreviewed AI draft;
 * the original Chinese stays behind the remembered Advanced disclosure.
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

// The original Chinese starts folded; opening it once is
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
      <HowellKeyInfo/>
    </div>
    <HowellEntry text={entry.text} selfGlyph={glyph}/>
  </div>;
}

/** Per-entry review wording: English counts as corrected only when the supplied review
 * changed the translation itself; flag-only or assessment-only reviews leave it unchanged. */
const corrected = (entry: EtymologyEntry) => entry.translation?.editorialReview?.changes.includes('translation') ?? false;
const DECISION_LABEL = { clear: 'uncertainty flag cleared', revised_retained: 'English revised, uncertainty retained', checked_retained: 'checked, English unchanged, uncertainty retained' } as const;

/** Warning triangle before an uncertain English passage (owner-requested, replacing the
 *  visible uncertainty sentence). Its popup says whether the latest review checked the
 *  passage, so checked and unchecked uncertainties stay distinguishable. */
function UncertainMark({ checked }: { checked: boolean }) {
  return <Popover>
    <PopoverTrigger className="etymology-uncertain-trigger" aria-label="Uncertain translation"><TriangleAlert aria-hidden="true"/></PopoverTrigger>
    <PopoverContent className="source-info-popover" align="start"><HintBody>
      Uncertain translation<br/>
      {checked ? 'The latest review checked this passage and kept the flag.' : 'Not checked in the latest review.'}<br/>
      Compare with the original Chinese under Advanced.
    </HintBody></PopoverContent>
  </Popover>;
}

/** Every review note for the Shuowen block, one (i) row each (owner-requested: the visible
 *  block keeps only the title, English and ⚠). Per passage: whether the supplied review
 *  changed the English, a changed review headword, the editorial-reading note and the
 *  reviewer's decision + reason. Several passages are numbered so notes stay attached. */
function ShuowenReviewNotes({ entries }: { entries: EtymologyEntry[] }) {
  const translated = entries.filter(entry => entry.translation);
  const editorial = translated.some(entry => entry.translation?.editorialReview);
  const many = translated.length > 1;
  return <SourceInfo inline className="detail-footnote">
    {editorial ? 'English · AI-generated draft, partly reviewed; not verified modern etymology' : 'English · AI-generated draft, not reviewed; not verified modern etymology'}
    {translated.map((entry, index) => {
      const review = entry.translation!.editorialReview;
      const reading = review?.sourceReading;
      const prefix = many ? `Passage ${index + 1}: ` : '';
      return <Fragment key={entry.id}>
        {editorial && <><br/>{prefix}{corrected(entry) ? 'English partly corrected in a supplied editorial review.' : review ? 'English unchanged by the supplied editorial review.' : 'Not reviewed.'}</>}
        {reading && reading.headword !== entry.headword && <><br/>{prefix}Translated for the review headword <span lang="lzh">{reading.headword}</span>, not <span lang="lzh">{entry.headword}</span>.</>}
        {reading && <><br/>{prefix}Editorial reading (shown under Advanced): {reading.note}</>}
        {review?.caseEvidence && <><br/>{prefix}Supplied reviewer assessment · {DECISION_LABEL[review.caseEvidence.decision]}. {review.caseEvidence.reviewerNote}</>}
      </Fragment>;
    })}
  </SourceInfo>;
}

/** Shuowen block, kept deliberately short (owner-requested simplification): visible = title
 *  with a small "AI draft" tag (the handoff requires the draft label to stay visible) and the
 *  review-notes (i), then each English passage (⚠ when uncertain). The unchanged Classical
 *  Chinese, plus any editorial Chinese reading, sits behind the remembered Advanced toggle.
 *  Duplicate headwords keep their own source IDs; review headwords never change library
 *  associations, pronunciation or geometry. */
export function ShuowenSection({ entries }: { entries: EtymologyEntry[] }) {
  const panelId = useId();
  const [open, toggle] = useClassicalOpen();
  const translated = entries.some(entry => entry.translation);
  const hasReading = entries.some(entry => entry.translation?.editorialReview?.sourceReading);
  return <div className={`etymology-entry etymology-entry-shuowen etymology-advanced${open ? ' is-open' : ''}${translated ? ' has-translation' : ''}`}>
    <div className="etymology-entry-head">
      <span className="etymology-source-name">{SOURCE_LABEL.shuowen.name}</span>
      <span className="etymology-source-kind">{translated ? 'historical dictionary · English: AI draft' : 'historical dictionary'}</span>
      {translated && <ShuowenReviewNotes entries={entries}/>}
    </div>
    {entries.map(entry => {
      const t = entry.translation;
      return t && <div key={entry.id} className="etymology-translation" data-source-entry={entry.id}>
        <p className="etymology-text" lang="en">{t.uncertain && <UncertainMark checked={Boolean(t.editorialReview?.caseEvidence)}/>}{t.text}</p>
      </div>;
    })}
    <button type="button" className="etymology-advanced-toggle" aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={toggle}>
      <ChevronDown className="etymology-advanced-chevron" aria-hidden="true"/>
      <span className="etymology-level-pill">Advanced</span>
      <span className="etymology-source-kind">Original Classical Chinese</span>
      <span className="etymology-advanced-action">{open ? 'Hide' : 'Show'}</span>
    </button>
    {open && <div id={panelId} className="etymology-advanced-body more-examples-panel">
      <p className="etymology-advanced-note">The original is written in Classical Chinese (文言).{translated && (hasReading ? ' Some English follows a separate editorial reading shown below.' : '')}</p>
      {entries.map(entry => {
        const reading = entry.translation?.editorialReview?.sourceReading;
        return <div key={entry.id} className="etymology-classical-entry">
          <p className="etymology-text etymology-classical" lang="lzh">{entry.text}</p>
          {reading && <>
            <p className="etymology-advanced-note">Editorial reading · partial review · imported original above is unchanged</p>
            <p className="etymology-text etymology-classical" lang="lzh">{reading.headword} — {reading.text}</p>
          </>}
        </div>;
      })}
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
    {view.entries.some(entry => entry.translation) && <>{view.entries.some(corrected) ? 'Shuowen English · AI-generated draft with partial editorial corrections' : view.entries.some(entry => entry.translation?.editorialReview) ? 'Shuowen English · AI-generated draft, checked in a partial editorial review (English unchanged)' : 'Shuowen English · AI-generated draft, not reviewed'}<br/></>}
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
    return <Button asChild variant="ghost" className={`decomposition-glyph${glyphScript(target) === 'Traditional' ? ' traditional-character' : ''}`}><Link to="/characters" search={search} resetScroll={false} onClick={event => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) requestDetailTab('etymology'); }} title={hint} aria-label={hint}><strong lang="zh-CN">{target}</strong></Link></Button>;
  };
  if (view.status === 'exact-headword') {
    const howell = view.entries.filter(entry => entry.sourceId === 'howell');
    const shuowen = view.entries.filter(entry => entry.sourceId === 'shuowen');
    return <div className="etymology-entries">
      {howell.map(entry => <HowellBlock key={entry.id} entry={entry} glyph={view.glyph}/>)}
      {shuowen.length > 0 && <ShuowenSection entries={shuowen}/>}
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

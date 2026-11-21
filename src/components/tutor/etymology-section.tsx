import { useEffect, useId, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronDown, ScrollText } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { HintBody, SourceInfo } from './source-info';
import { SectionPlaceholder } from './section-placeholder';
import { useWorkspace } from './workspace';
import { glyphScript, libraryDestination } from '@/lib/character-library';
import { openDetailsHint } from '@/lib/tile-hints';
import { howellSegments, resolveEtymology, type EtymologyEntry, type EtymologyRequest, type EtymologyView } from '@/lib/etymology';

/**
 * ETYMOLOGY section of a glyph detail card (Characters, Components, Radicals and radical forms).
 * Inputs: the exact record ID + glyph, plus family ID / form key for a selected radical form.
 * State: the resolved EtymologyView (lib/etymology.ts), loaded lazily; `undefined` while loading
 * shows a pulsing placeholder, and `null` (no entry, or any identity/integrity check failed)
 * renders nothing, so no unverified text ever shows.
 * Display rules follow public/data/etymology/README.md: source text is plain text (Howell's
 * *glossed* senses only gain emphasis), each entry keeps its own attribution, components and
 * radicals only link to the standalone character, and nothing here is ever spoken aloud.
 * The section is hidden when there is neither text nor a record to link (owner's choice).
 * Each source is its own tinted block; Shuowen's Classical Chinese is marked Advanced and folded.
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

// Shuowen Jiezi's Classical Chinese starts folded (owner's choice); opening it once is
// remembered on this device, read after mount so server and first client render agree.
const CLASSICAL_OPEN_KEY = 'tutor.etymology.classicalOpen';
function useClassicalOpen(): [boolean, () => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => { try { setOpen(localStorage.getItem(CLASSICAL_OPEN_KEY) === '1'); } catch { /* storage unavailable */ } }, []);
  const toggle = () => setOpen(prev => { try { localStorage.setItem(CLASSICAL_OPEN_KEY, prev ? '0' : '1'); } catch { /* ignore */ } return !prev; });
  return [open, toggle];
}

/** "Advanced" level pill on the Shuowen block; tapping it explains why (works on touch, unlike a title). */
function AdvancedPill({ withHowell }: { withHowell: boolean }) {
  return <Popover>
    <PopoverTrigger className="etymology-level-pill" aria-label="Advanced: about this text">Advanced</PopoverTrigger>
    <PopoverContent className="source-info-popover" align="start"><HintBody>
      Written in Classical Chinese (文言), the literary language of Xu Shen’s dictionary, compiled around 100 CE.<br/>
      Its grammar and wording differ from modern Mandarin, so it is hard even for fluent readers.<br/>
      {withHowell ? 'No modern translation is recorded here; Howell’s note is the learner-friendly reading.' : 'No modern translation is recorded here.'}
    </HintBody></PopoverContent>
  </Popover>;
}

/** One source block: source name + kind on a header row, then the text. Shuowen's Classical
 *  Chinese is folded behind a remembered toggle and carries the Advanced pill. */
function EtymologyEntryBlock({ entry, withHowell, classicalOpen, toggleClassical }: { entry: EtymologyEntry; withHowell: boolean; classicalOpen: boolean; toggleClassical: () => void }) {
  const panelId = useId();
  const label = SOURCE_LABEL[entry.sourceId];
  const classical = entry.sourceId === 'shuowen';
  return <div className={`etymology-entry etymology-entry-${entry.sourceId}`}>
    <div className="etymology-entry-head">
      <span className="etymology-source-name">{label.name}</span>
      <span className="etymology-source-kind">{label.kind}</span>
      {classical && <AdvancedPill withHowell={withHowell}/>}
    </div>
    {classical
      ? <>
          {classicalOpen && <p id={panelId} className="etymology-text etymology-classical more-examples-panel" lang="lzh">{entry.text}</p>}
          <button type="button" className={`more-examples-toggle etymology-classical-toggle${classicalOpen ? ' is-open' : ''}`} aria-expanded={classicalOpen} aria-controls={classicalOpen ? panelId : undefined} onClick={toggleClassical}>
            <ChevronDown className="more-examples-icon" aria-hidden="true"/>{classicalOpen ? 'Hide Classical Chinese' : 'Show Classical Chinese'}
          </button>
        </>
      : <p className="etymology-text" lang="en">{howellSegments(entry.text).map((part, i) => part.emphasis ? <em key={i}>{part.text}</em> : <span key={i}>{part.text}</span>)}</p>}
  </div>;
}

export function EtymologySection(request: EtymologyRequest) {
  const { recordId, glyph, familyId, formKey } = request;
  const [view, setView] = useState<EtymologyView | null | undefined>(undefined);
  const { preferences } = useWorkspace();
  const [classicalOpen, toggleClassical] = useClassicalOpen();
  useEffect(() => {
    let live = true;
    setView(undefined);
    void resolveEtymology({ recordId, glyph, familyId, formKey }).then(result => { if (live) setView(result); });
    return () => { live = false; };
  }, [recordId, glyph, familyId, formKey]);
  if (view === undefined) return <SectionPlaceholder heading={<><ScrollText size={13} aria-hidden="true"/>ETYMOLOGY</>} label="Etymology" shape="text"/>;
  // Owner's rule: the section appears only with source text or a record to link to, so
  // absent or blocked states (发 with no related form, #96 jade 王) render nothing.
  if (!view || (view.status === 'exact-headword' ? !view.entries.length : view.status === 'context-review-required' ? !view.standalone : view.status === 'no-exact-headword' ? !view.related.length : true)) return null;
  // Exact record links: the recorded ID wins; the glyph index only supplies its page.
  const recordLink = (id: string, target: string) => {
    const tab = id.split(':')[0] as 'Characters';
    const destination = libraryDestination(target, preferences.includeTraditional);
    const search = destination && destination.id === id ? destination : { tab, id };
    const hint = openDetailsHint(target, tab);
    return <Button asChild variant="ghost" className={`decomposition-glyph${glyphScript(target) === 'Traditional' ? ' traditional-character' : ''}`}><Link to="/characters" search={search} resetScroll={false} title={hint} aria-label={hint}><strong lang="zh-CN">{target}</strong></Link></Button>;
  };
  const meta = view.metadata;
  const licenses = [...new Set(meta.license_notices.map(notice => `${notice.source_id === 'howell' ? 'Howell' : notice.source_id === 'shuowen' ? 'Shuowen Jiezi' : notice.source_id} · ${notice.license}`))];
  const info = <SourceInfo inline className="detail-footnote">
    {meta.disclaimer}<br/>
    {COVERAGE[view.coverage] && <>{COVERAGE[view.coverage]}<br/></>}
    {view.entries.map(entry => <span key={entry.id}>{SOURCE_LABEL[entry.sourceId].name} · <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">Source entry</a><br/></span>)}
    {licenses.join(' · ')}<br/>
    Imported {meta.import_date}
  </SourceInfo>;
  let body;
  if (view.status === 'exact-headword') {
    body = <div className="etymology-entries">{view.entries.map(entry => <EtymologyEntryBlock key={entry.id} entry={entry} withHowell={view.entries.some(item => item.sourceId === 'howell')} classicalOpen={classicalOpen} toggleClassical={toggleClassical}/>)}</div>;
  } else if (view.status === 'context-review-required') {
    body = view.standalone && <div className="glyph-usage-reference">{recordLink(view.standalone, view.glyph)}<span className="glyph-usage-meaning">The sources describe the standalone character <span lang="zh-CN">{view.glyph}</span>. How that applies to this form hasn’t been reviewed, so its notes stay on the character’s own card.</span></div>;
  } else {
    body = <>
      <p className="glyph-usage-meaning">No entry for <span lang="zh-CN">{view.glyph}</span> in Howell or Shuowen Jiezi. Related written forms have their own notes (suggested, not reviewed):</p>
      <div className="glyph-usage-parents">{view.related.map(item => <div key={item.recordId} className="glyph-usage-reference">{recordLink(item.recordId, item.glyph)}{item.explanation && <span className="glyph-usage-meaning">{item.explanation}</span>}</div>)}</div>
    </>;
  }
  return <section className="glyph-usage-section etymology-section" aria-label="Etymology">
    <h3 className="eyebrow"><ScrollText size={13} aria-hidden="true"/>ETYMOLOGY{info}</h3>
    {body}
  </section>;
}

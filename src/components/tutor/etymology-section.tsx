import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SourceInfo } from './source-info';
import { useWorkspace } from './workspace';
import { glyphScript, libraryDestination } from '@/lib/character-library';
import { openDetailsHint } from '@/lib/tile-hints';
import { howellSegments, resolveEtymology, type EtymologyEntry, type EtymologyRequest, type EtymologyView } from '@/lib/etymology';

/**
 * ETYMOLOGY section of a glyph detail card (Characters, Components, Radicals and radical forms).
 * Inputs: the exact record ID + glyph, plus family ID / form key for a selected radical form.
 * State: the resolved EtymologyView (lib/etymology.ts), loaded lazily; nothing renders until it
 * arrives or when any identity/integrity check fails, so no unverified text ever shows.
 * Display rules follow public/data/etymology/README.md: source text is plain text (Howell's
 * *glossed* senses only gain emphasis), each entry keeps its own attribution, components and
 * radicals only link to the standalone character, and nothing here is ever spoken aloud.
 * The section is hidden when there is neither text nor a record to link (owner's choice).
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

export function EtymologySection(request: EtymologyRequest) {
  const { recordId, glyph, familyId, formKey } = request;
  const [view, setView] = useState<EtymologyView | null>(null);
  const { preferences } = useWorkspace();
  useEffect(() => {
    let live = true;
    setView(null);
    void resolveEtymology({ recordId, glyph, familyId, formKey }).then(result => { if (live) setView(result); });
    return () => { live = false; };
  }, [recordId, glyph, familyId, formKey]);
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
    body = view.entries.map(entry => <div key={entry.id} className="etymology-entry">
      <span className="variant-etymology-caption">{SOURCE_LABEL[entry.sourceId].name} · {SOURCE_LABEL[entry.sourceId].kind}</span>
      {entry.sourceId === 'howell'
        ? <p className="glyph-usage-meaning etymology-text" lang="en">{howellSegments(entry.text).map((part, i) => part.emphasis ? <em key={i}>{part.text}</em> : <span key={i}>{part.text}</span>)}</p>
        : <p className="glyph-usage-meaning etymology-text etymology-classical" lang="lzh">{entry.text}</p>}
    </div>);
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

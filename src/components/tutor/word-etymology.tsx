import { glyphIndex, libraryDestination } from '@/lib/character-library';
import { characterAudioRequest } from '@/lib/catalog-store';
import { openDetailsHint } from '@/lib/tile-hints';
import type { EtymologyRequest, EtymologyView } from '@/lib/etymology';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';
import { ExamplePronunciation } from './example-pronunciation';
import { MultiReadingSpeakers, isMultiReading } from './reading-speakers';
import { EtymologyPanel, EtymologyRecordLink, EtymologySourcesInfo, etymologyHasContent } from './etymology-section';

/**
 * Etymology tab body for every word card (owner-requested: inherited from the word's
 * characters and laid out like its Decomposition, which lists the character even for a
 * one-character word such as 百). Howell and Shuowen Jiezi are indexed by single
 * characters, so each unique character of the word gets its own block, in word order:
 * - the Decomposition's heading row: character tile, its own catalogue reading + speaker, meaning;
 * - that character's notes through the shared EtymologyPanel (exact `Characters:<glyph>`
 *   request only; any identity/integrity failure resolves null and reads "no entry");
 * - "No entry recorded" for characters the sources do not cover.
 * Inputs: the requests (one per unique character) and their resolved views (`undefined`
 * while loading). Notes stay attributed to each character and never become word history;
 * the word's own pinyin is never used as a character reading here.
 */
export function wordEtymologyRequests(glyphs: readonly string[]): EtymologyRequest[] {
  return [...new Set(glyphs)].map(glyph => ({ recordId: `Characters:${glyph}`, glyph }));
}

/** Heading of one character block: tile link (to its notes when it has some), reading, meaning. */
function CharacterHeading({ glyph, hasNotes }: { glyph: string; hasNotes: boolean }) {
  const { preferences } = useWorkspace();
  const facts = glyphIndex()[glyph];
  const reading = facts?.pinyin ?? '';
  const destination = libraryDestination(glyph, preferences.includeTraditional);
  const tile = hasNotes
    ? <EtymologyRecordLink id={`Characters:${glyph}`} glyph={glyph}/>
    : destination
      ? <Button asChild variant="ghost" className="decomposition-glyph"><Link to="/characters" search={destination} resetScroll={false} title={openDetailsHint(glyph, destination.tab)} aria-label={openDetailsHint(glyph, destination.tab)}><strong lang="zh-CN">{glyph}</strong></Link></Button>
      : <strong lang="zh-CN" className="decomposition-glyph decomposition-glyph-static">{glyph}</strong>;
  // Same heading markup as the word Decomposition list (vocabulary-decomposition.tsx):
  // tile, then reading + speaker over the meaning, so both tabs introduce a character alike.
  return <div className="decomposition-part">
    {tile}
    <div className="vocabulary-part-facts">
      <span className="example-pinyin-row">{isMultiReading(reading)
        ? <MultiReadingSpeakers spoken={glyph} reading={reading} variant="example"/>
        : <><span className="pinyin">{reading || '—'}</span>{reading && <ExamplePronunciation request={characterAudioRequest(glyph, reading)} label={`character ${glyph}`}/>}</>}</span>
      <small>{facts?.meaning || 'Meaning not recorded'}</small>
    </div>
  </div>;
}

export function WordEtymologyPanel({ requests, views }: { requests: readonly EtymologyRequest[]; views: (EtymologyView | null)[] | undefined }) {
  if (views === undefined) return <EtymologyPanel view={undefined}/>;
  return <ul className="decomposition-tree etymology-word-parts">{requests.map((request, index) => {
    const view = views[index] ?? null;
    const hasNotes = etymologyHasContent(view);
    return <li key={request.recordId} className="etymology-word-part" aria-label={`Etymology of ${request.glyph}`}>
      <CharacterHeading glyph={request.glyph} hasNotes={hasNotes && view?.status === 'exact-headword'}/>
      {hasNotes ? <EtymologyPanel view={view}/> : <p className="glyph-usage-meaning">No entry for <span lang="zh-CN">{request.glyph}</span> in Howell or Shuowen Jiezi.</p>}
    </li>;
  })}</ul>;
}

/** Source ⓘ for the word tab: only characters with notes, each line prefixed by its character. */
export function WordEtymologyInfo({ views }: { views: (EtymologyView | null)[] }) {
  return <EtymologySourcesInfo views={views.filter(etymologyHasContent)} perCharacter/>;
}

import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { characterAudioRequest } from '@/lib/catalog-store';
import { componentFormReference } from '@/lib/component-form-references';
import { ExamplePronunciation } from './example-pronunciation';
import { SourceInfo } from './source-info';

/** Reviewed form's exact related record, with its own reading and independent speaker.
 * The shared adapter supplies the meaning-first text elsewhere; this row makes its
 * source navigable without changing the selected glyph, its sound or its geometry.
 */
export function ComponentFormReference({ glyph }: { glyph: string }) {
  const reference = componentFormReference(glyph);
  if (!reference) return null;
  const { target } = reference;
  return <div className="library-note flex flex-wrap items-center gap-2">
    <span>{reference.meaningMode === 'shared' ? 'Meaning from' : 'Related character'}</span>
    <Button asChild variant="ghost" className="decomposition-glyph">
      <Link to="/characters" search={{ tab: 'Characters', id: target.id }} resetScroll={false} aria-label={`Open character ${target.glyph}`}><strong lang="zh-CN">{target.glyph}</strong></Link>
    </Button>
    <span className="pinyin">{target.reading}</span>
    <ExamplePronunciation request={characterAudioRequest(target.glyph, target.reading)} label={`${target.glyph} (${target.reading})`}/>
    <SourceInfo inline className="detail-footnote">
      {reference.evidence.source}<br/>
      <a href={reference.evidence.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a><br/>
      Original description: {reference.description}<br/>
      {reference.meaningMode === 'shared' ? 'The dictionary records an old variant with the same reading. Its linked record supplies the meaning.' : 'This source records a phonetic component relationship. The related character has its own meaning and pronunciation.'}<br/>
      This form retains its own recorded pronunciation.
    </SourceInfo>
  </div>;
}

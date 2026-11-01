import { SourceInfo } from '@/components/tutor/source-info';
import { Link } from '@tanstack/react-router';
import { Volume2, TriangleAlert } from 'lucide-react';
import { speakTts } from '@/lib/audio';
import { Button } from '@/components/ui/button';
import { catalog } from '@/lib/catalog-store';
import { radicalStrokes, type RadicalForm } from '@/lib/radical-strokes';
import { useWorkspace } from './workspace';

const sourceNote = (record?: { source?: string; sourceStatus?: string; status?: string } | null) => <>Source · {record?.source || catalog.radicalStrokes.source || 'cnchar-order 3.2.6'}<br/>{record?.sourceStatus ?? record?.status} · no official verification claimed<br/>Exact form writing order · no component breakdown inferred</>;

/** Provenance for a radical's recorded stroke sequence. `inline` tucks the button beside the section label. */
export function RadicalStrokeSourceInfo({ glyph, form, inline = true }: { glyph: string; form?: RadicalForm | undefined; inline?: boolean }) {
  useWorkspace().catalogVersion;
  return <SourceInfo inline={inline} className="detail-footnote decomposition-footnote">{sourceNote(radicalStrokes(glyph, form))}</SourceInfo>;
}

/** Exact recorded stroke name → sample stroke glyph, collected from records that bind a glyph to that name (never guessed). */
function strokeGlyphByName(name: string) {
  const sets = [catalog.radicalStrokes.records, catalog.radicalStrokes.exactForms ?? {}];
  for (const set of sets) for (const rec of Object.values(set) as { strokes?: { name: string; glyph: string | null }[] }[]) {
    const hit = rec?.strokes?.find(s => s.name === name && s.glyph);
    if (hit) return hit.glyph;
  }
  return null;
}

const StrokeGlyphLink = ({ glyph, label }: { glyph: string; label: string }) => <Button asChild variant="ghost" className="decomposition-glyph"><Link to="/characters" search={{ tab: 'Strokes', id: `Strokes:${glyph}` }} resetScroll={false} aria-label={label}><strong lang="zh-CN">{glyph}</strong></Link></Button>;

export function RadicalStrokeDecomposition({ glyph, form, sourceInHeading = false }: { glyph: string; form?: RadicalForm | undefined; sourceInHeading?: boolean }) {
  useWorkspace().catalogVersion;
  const record = radicalStrokes(glyph, form);
  return <>
    {record?.strokes.length ? <>{record.status !== 'recorded' && <div className="record-gap"><p>{record.status === 'derived' ? 'Source-derived sequence; not independently verified.' : 'Stroke names remain ambiguous in the source; alternatives are shown.'}</p></div>}<ol className="decomposition-tree radical-stroke-sequence" aria-label={`Stroke sequence for ${glyph}`}>
      {record.strokes.map((stroke, index) => <li key={index}><div className="decomposition-node"><span>{index + 1}</span><div className="decomposition-part">
        {stroke.name.includes(' / ')
          // Ambiguous stroke: show each alternative's sample stroke (only when a recorded binding exists), plus a warning.
          ? <span className="decomposition-ambiguous-glyphs">{stroke.name.split(' / ').flatMap(alt => { const g = strokeGlyphByName(alt); return g ? [{ alt, g }] : []; }).map(({ alt, g }, i) => <span key={alt} className="decomposition-ambiguous-alt">{i > 0 && <span className="decomposition-ambiguous-sep">/</span>}<StrokeGlyphLink glyph={g} label={`Open stroke alternative: ${alt}`}/></span>)}</span>
          : stroke.glyph ? <StrokeGlyphLink glyph={stroke.glyph} label={`Open stroke ${index + 1}: ${stroke.name}`}/> : null}
        <small className="decomposition-facts"><span className="decomposition-pronunciation">{stroke.pinyin ? <span className="pinyin">{stroke.pinyin}</span> : null}<Button variant="ghost" size="icon" className="decomposition-listen" disabled={!stroke.name} aria-label={`Listen to ${stroke.pinyin || stroke.name}`} onClick={() => speakTts(stroke.name)}><Volume2/></Button>{stroke.name.includes(' / ') && <span className="stroke-ambiguous-inline" title="The source records two names for this stroke"><TriangleAlert size={12} aria-hidden="true"/></span>}</span></small>
      </div></div></li>)}
    </ol></> : <div className="record-gap"><p>No unambiguous exact stroke sequence recorded for this radical form.</p></div>}
    {!sourceInHeading && <SourceInfo className="detail-footnote decomposition-footnote">{sourceNote(record)}</SourceInfo>}
  </>;
}

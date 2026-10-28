import { SourceInfo } from '@/components/tutor/source-info';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { catalog } from '@/lib/catalog-store';
import { radicalStrokes, type RadicalForm } from '@/lib/radical-strokes';
import { useWorkspace } from './workspace';

export function RadicalStrokeDecomposition({ glyph, form }: { glyph: string; form?: RadicalForm | undefined }) {
  useWorkspace().catalogVersion;
  const record = radicalStrokes(glyph, form);
  return <>
    {record?.strokes.length ? <>{record.status !== 'recorded' && <div className="record-gap"><p>{record.status === 'derived' ? 'Source-derived sequence; not independently verified.' : 'Stroke names remain ambiguous in the source; alternatives are shown.'}</p></div>}<ol className="decomposition-tree radical-stroke-sequence" aria-label={`Stroke sequence for ${glyph}`}>
      {record.strokes.map((stroke, index) => <li key={index}><div className="decomposition-node"><span>{index + 1}</span><div className="decomposition-part">
        {stroke.glyph ? <Button asChild variant="ghost" className="decomposition-glyph"><Link to="/characters" search={{ tab: 'Strokes', id: `Strokes:${stroke.glyph}` }} resetScroll={false} aria-label={`Open stroke ${index + 1}: ${stroke.name}`}><strong lang="zh-CN">{stroke.glyph}</strong></Link></Button> : null}
        <div className="vocabulary-part-facts"><span className="pinyin">{stroke.pinyin}</span><small lang="zh-CN">{stroke.name}</small></div>
      </div></div></li>)}
    </ol></> : <div className="record-gap"><p>No unambiguous exact stroke sequence recorded for this radical form.</p></div>}
    <SourceInfo className="detail-footnote decomposition-footnote">Source · {record?.source || catalog.radicalStrokes.source || 'cnchar-order 3.2.6'}<br/>{record?.sourceStatus ?? record?.status} · no official verification claimed<br/>Exact form writing order · no component breakdown inferred</SourceInfo>
  </>;
}
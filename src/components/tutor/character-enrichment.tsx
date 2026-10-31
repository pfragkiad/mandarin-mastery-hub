import { SquareDashedMousePointer } from 'lucide-react';
import { SourceInfo } from '@/components/tutor/source-info';
import { useEffect, useState } from 'react';
import type { DecompositionNode } from '@/lib/character-library';
import { gSourceDecompositions, resolveEnrichment, sameDecompositionTree, type CharacterEnrichment } from '@/lib/character-enrichment';
import { Button } from '@/components/ui/button';
import { DecompositionTree } from './decomposition-tree';
import { componentInk } from '@/lib/practice-stroke-groups';

/** Source notation keeps its brackets, operators and separators plain; every hanzi inside it gets
 *  the same thin box the breakdown rows use, so a raw expression reads like the tree it stands in for. */
const HANZI = /[\u2E80-\u2FDF\u3005\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u{20000}-\u{2EBEF}]/u;
export function SourceGlyphs({ text }: { text: string }) {
  return <>{Array.from(text, (char, index) => HANZI.test(char)
    ? <span key={index} lang="zh-CN" className="source-glyph-box">{char}</span>
    : <span key={index}>{char}</span>)}</>;
}

export function useCharacterEnrichment(character: string, tree?: DecompositionNode) {
  const [result, setResult] = useState<{ character: string; tree: DecompositionNode; record: CharacterEnrichment } | null>(null);
  useEffect(() => {
    let active = true;
    if (tree) void resolveEnrichment(character, tree).then(record => {
      if (active) setResult(record ? { character, tree, record } : null);
    });
    return () => { active = false; };
  }, [character, tree]);
  return result?.character === character && result.tree === tree ? result.record : null;
}

export function CharacterDecomposition({ character, tree, source, status }: { character: string; tree: DecompositionNode; source: string; status?: string | undefined }) {
  const record = useCharacterEnrichment(character, tree);
  return <RecordedDecomposition tree={tree} source={source} status={status} record={record}/>;
}
/** Display priority never changes the original tree or the geometry-bound stroke mapping.
 *  When a G-source tree is structurally identical to the recorded tree, the duplicate is not
 *  repeated; a short note says the structures agree instead. */
export function RecordedDecomposition({ tree, source, status, record }: { tree: DecompositionNode; source: string; status?: string | undefined; record: CharacterEnrichment | null }) {
  const alternatives = gSourceDecompositions(record);
  const matchesGSource = alternatives.some(alternative => alternative.tree && sameDecompositionTree(alternative.tree, tree));
  return <>
    {alternatives.map((alternative, index) => <div key={`${alternative.expression}-${index}`}>
      <h4 className="library-note">BabelStone · G-source<SourceInfo inline className="detail-footnote">BabelStone IDS · 2025-06-27 / Unicode 16.0<br/>Recorded qualifiers · {alternative.qualifiers}<br/>Structural description · not verified etymology or stroke geometry</SourceInfo></h4>
      {alternative.tree ? <ul className="decomposition-tree" aria-label={`BabelStone G-source ${index + 1}`}><DecompositionTree node={alternative.tree}/></ul> : <p className="enrichment-expression"><span lang="zh-CN"><SourceGlyphs text={alternative.expression}/></span><small>Source notation retained; tree unavailable.</small></p>}
    </div>)}
    {matchesGSource
      ? <p className="enrichment-expression"><small>The recorded graphical structure matches the G-source breakdown above.</small></p>
      : <>
        <h4 className="library-note">Hanzi graphical structure<SourceInfo inline className="detail-footnote">Source · {source}<br/>{status ?? 'Imported graphical structure · not verified etymology'}</SourceInfo></h4>
        <ul className="decomposition-tree" aria-label="Hanzi graphical structure"><DecompositionTree node={tree}/></ul>
      </>}
  </>;
}
export function ComponentPicker({ record, selected, onSelect }: { groupingSource?: string; onGroupingSourceChange?: ((source: string) => void) | undefined; record: CharacterEnrichment; selected: string; onSelect: (path: string) => void }) {
  return <div className="enrichment-note"><h4 className="eyebrow"><SquareDashedMousePointer size={13} aria-hidden="true"/>COMPONENT STROKES<SourceInfo inline className="detail-footnote">Make Me a Hanzi · Hanzi Writer Data 2.0.1<br/>Unreviewed mapping · actual character strokes, not substituted component outlines<br/>Stroke order powered by Hanzi Writer · character data loads online</SourceInfo></h4>
    {record.mapping.groups.length ? <><div className="component-picker">{record.mapping.groups.map((group, palette) => {
      const path = JSON.stringify(group.path);
      return <Button key={path} variant="outline" size="sm" aria-pressed={selected === path} aria-label={`Highlight ${group.glyph} strokes ${group.strokeIndices.map(i => i + 1).join(', ')}`} onClick={() => onSelect(selected === path ? '' : path)}><span className="component-color-marker" style={{ background: componentInk(palette) }}/><span lang="zh-CN">{group.glyph}</span><span>{group.strokeIndices.map(i => i + 1).join(', ')}</span></Button>;
    })}</div>{record.mapping.unknownStrokeIndices.length > 0 && <p>{record.mapping.unknownStrokeIndices.length} source strokes remain unassigned.</p>}</> : <div className="record-gap"><p>No recorded stroke-to-component mapping is available.</p></div>}
  </div>;
}

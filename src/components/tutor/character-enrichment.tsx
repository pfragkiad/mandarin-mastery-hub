import { ShieldCheck, SquareDashedMousePointer } from 'lucide-react';
import { SourceInfo } from '@/components/tutor/source-info';
import { useEffect, useState } from 'react';
import type { DecompositionNode } from '@/lib/character-library';
import { resolveEnrichment, type CharacterEnrichment } from '@/lib/character-enrichment';
import { Button } from '@/components/ui/button';
import { parseIdsTree } from '@/lib/ids-tree';
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

const comparisonNotes = {
  'exact-G-agreement': 'The recorded breakdown matches BabelStone’s G-source expression exactly.',
  'different-G-expression': 'BabelStone records a different G-source breakdown. Different structures may reflect granularity or regional forms.',
  'current-incomplete': 'The current breakdown contains unknown or missing parts; source agreement is not established.',
  'G-incomplete-or-unparseable': 'The G-source expression could not be fully compared.',
  'absent-in-BabelStone': 'This character was not found in the compared BabelStone inventory.',
};
export function EnrichmentNotes({ record }: { record: CharacterEnrichment | null }) {
  if (!record) return null;
  const teaching = record.teachingCheck;
  return <div className="enrichment-notes">
    <div className="enrichment-note"><h4 className="eyebrow"><ShieldCheck size={13} aria-hidden="true"/>SOURCE CHECK<SourceInfo inline className="detail-footnote">BabelStone IDS · 2025-06-27 / Unicode 16.0<br/>Unreviewed source annotation · not verified etymology or a regional geometry guarantee</SourceInfo></h4>
      <p className="source-check-comparison">{comparisonNotes[record.comparison.status]}</p>
      {(record.comparison.status === 'different-G-expression' || record.comparison.status === 'current-incomplete' || record.comparison.status === 'G-incomplete-or-unparseable') && record.comparison.alternatives.map((alternative, index) => {
        const tree = parseIdsTree(alternative.expression);
        return <div key={index}>
          <p className="library-note">BabelStone · {alternative.qualifiers || 'Unqualified'} · {alternative.directG ? 'Direct G' : alternative.virtualG ? 'Virtual G' : 'Other regional expression'}</p>
          {tree ? <ul className="decomposition-tree" aria-label={`BabelStone alternative ${index + 1}`}><DecompositionTree node={tree}/></ul> : <p className="enrichment-expression"><span lang="zh-CN"><SourceGlyphs text={alternative.expression}/></span><small>Source notation retained; tree unavailable.</small></p>}
        </div>;
      })}
    </div>
    {teaching && <div className="enrichment-note"><h4 className="eyebrow">TEACHING STANDARD<SourceInfo inline className="detail-footnote">GF 0014-2009 · Rule {teaching.rule} · Printed page {teaching.printedPage}<br/>One of eight checked examples · not a full standard import</SourceInfo></h4>
      <p>{teaching.expectedUnsplit ? 'This example is treated as an undivided form.' : <>The teaching example groups <span lang="zh-CN"><SourceGlyphs text={(teaching.expectedComponents ?? []).join(' + ')}/></span>.</>}
        {' '}{teaching.result === 'agrees-component-multiset' ? 'Its component multiset agrees with the recorded breakdown.' : teaching.result === 'different-stopping-rule' ? 'It uses a different stopping rule from the visual breakdown.' : 'The current breakdown is incomplete.'}</p>
    </div>}
  </div>;
}
export function CharacterEnrichmentNotes({ character, tree }: { character: string; tree: DecompositionNode }) {
  const record = useCharacterEnrichment(character, tree);
  return <EnrichmentNotes record={record}/>;
}
export function ComponentPicker({ record, selected, onSelect }: { groupingSource?: string; onGroupingSourceChange?: ((source: string) => void) | undefined; record: CharacterEnrichment; selected: string; onSelect: (path: string) => void }) {
  return <div className="enrichment-note"><h4 className="eyebrow"><SquareDashedMousePointer size={13} aria-hidden="true"/>COMPONENT STROKES<SourceInfo inline className="detail-footnote">Make Me a Hanzi · Hanzi Writer Data 2.0.1<br/>Unreviewed mapping · actual character strokes, not substituted component outlines<br/>Stroke order powered by Hanzi Writer · character data loads online</SourceInfo></h4>
    {record.mapping.groups.length ? <><div className="component-picker">{record.mapping.groups.map((group, palette) => {
      const path = JSON.stringify(group.path);
      return <Button key={path} variant="outline" size="sm" aria-pressed={selected === path} aria-label={`Highlight ${group.glyph} strokes ${group.strokeIndices.map(i => i + 1).join(', ')}`} onClick={() => onSelect(selected === path ? '' : path)}><span className="component-color-marker" style={{ background: componentInk(palette) }}/><span lang="zh-CN">{group.glyph}</span><span>{group.strokeIndices.map(i => i + 1).join(', ')}</span></Button>;
    })}</div>{record.mapping.unknownStrokeIndices.length > 0 && <p>{record.mapping.unknownStrokeIndices.length} source strokes remain unassigned.</p>}</> : <div className="record-gap"><p>No recorded stroke-to-component mapping is available.</p></div>}
  </div>;
}

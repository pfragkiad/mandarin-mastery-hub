import { useEffect, useState } from 'react';
import type { DecompositionNode } from '@/lib/character-library';
import { resolveEnrichment, type CharacterEnrichment } from '@/lib/character-enrichment';

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
    <div className="enrichment-note"><h4 className="eyebrow">SOURCE CHECK</h4>
      <p>{comparisonNotes[record.comparison.status]}</p>
      {record.comparison.status === 'different-G-expression' && record.comparison.alternatives.map((alternative, index) =>
        <p className="enrichment-expression" key={index}><span lang="zh-CN">{alternative.expression}</span><small>{alternative.qualifiers || 'Unqualified'} · {alternative.directG ? 'Direct G' : alternative.virtualG ? 'Virtual G' : 'Other regional expression'}</small></p>)}
      <p className="detail-footnote">BabelStone IDS · 2025-06-27 / Unicode 16.0<br/>Unreviewed source annotation · not verified etymology or a regional geometry guarantee</p>
    </div>
    {teaching && <div className="enrichment-note"><h4 className="eyebrow">TEACHING STANDARD</h4>
      <p>{teaching.expectedUnsplit ? 'This example is treated as an undivided form.' : <>The teaching example groups <span lang="zh-CN">{teaching.expectedComponents?.join(' + ')}</span>.</>}
        {' '}{teaching.result === 'agrees-component-multiset' ? 'Its component multiset agrees with the recorded breakdown.' : teaching.result === 'different-stopping-rule' ? 'It uses a different stopping rule from the visual breakdown.' : 'The current breakdown is incomplete.'}</p>
      <p className="detail-footnote">GF 0014-2009 · Rule {teaching.rule} · Printed page {teaching.printedPage}<br/>One of eight checked examples · not a full standard import</p>
    </div>}
  </div>;
}
export function CharacterEnrichmentNotes({ character, tree }: { character: string; tree: DecompositionNode }) {
  const record = useCharacterEnrichment(character, tree);
  return <EnrichmentNotes record={record}/>;
}
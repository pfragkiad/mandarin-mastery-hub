import { Link } from '@tanstack/react-router';
import { Columns2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { glyphIndex, libraryDestination, type DecompositionNode } from '@/lib/character-library';
import { useWorkspace } from './workspace';

const IDS_LAYOUTS: Record<string, string> = { '⿰': 'Left–right', '⿱': 'Top–bottom', '⿲': 'Left–middle–right', '⿳': 'Top–middle–bottom', '⿴': 'Surround', '⿵': 'Open below', '⿶': 'Open above', '⿷': 'Open right', '⿸': 'Upper-left wrap', '⿹': 'Upper-right wrap', '⿺': 'Lower-left wrap', '⿻': 'Overlaid', '⿼': 'Open left', '⿽': 'Lower-right wrap', '⿾': 'Mirrored', '⿿': 'Rotated' };

export function DecompositionTree({ node }: { node: DecompositionNode }) {
  const { preferences } = useWorkspace();
  const card = glyphIndex()[node.glyph];
  const destination = libraryDestination(node.glyph, preferences.includeTraditional);
  const facts = card && (card.pinyin || card.meaning) ? [card.pinyin, card.meaning].filter(Boolean).join(' · ') : '';
  const glyph = card && destination
    ? <Button asChild variant="ghost" className="decomposition-glyph"><Link to="/characters" search={destination} resetScroll={false} lang="zh-CN" title={`Open the ${card.kind.replace(/s$/, '').toLowerCase()} card for ${node.glyph}`} aria-label={`Open the library card for ${node.glyph}`}><strong>{node.glyph}</strong></Link></Button>
    : <strong lang="zh-CN">{node.glyph}</strong>;
  return <li><div className="decomposition-node"><span>{node.position}</span>{IDS_LAYOUTS[node.glyph] ? <div className="decomposition-layout" aria-label={`${IDS_LAYOUTS[node.glyph]} structure`}>{node.glyph === '⿰' ? <Columns2 aria-hidden="true"/> : <span aria-hidden="true" className="ids-operator">{node.glyph}</span>}<small>{IDS_LAYOUTS[node.glyph]}</small></div> : <div className="decomposition-part">{glyph}{facts ? <small className="decomposition-facts">{facts}</small> : null}</div>}</div>{node.children?.length ? <ul>{node.children.map((child, i) => <DecompositionTree key={`${child.position}-${i}`} node={child}/> )}</ul> : null}</li>;
}
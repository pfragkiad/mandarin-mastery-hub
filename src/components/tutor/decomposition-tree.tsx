import { Link } from '@tanstack/react-router';
import { Columns2, Columns3, Rows2, Rows3, FlipHorizontal2, RotateCw, Layers2, Minus, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { glyphIndex, libraryDestination, radicalVariantFallback, type DecompositionNode } from '@/lib/character-library';
import { glyphPresentation } from '@/lib/glyph-presentation';
import { characterRecording, playCharacter } from '@/lib/catalog-store';
import { useWorkspace } from './workspace';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { radicalIdentity } from '@/lib/radical-identities';

const IDS_LAYOUTS: Record<string, string> = { '⿰': 'Left–right', '⿱': 'Top–bottom', '⿲': 'Left–middle–right', '⿳': 'Top–middle–bottom', '⿴': 'Surround', '⿵': 'Open below', '⿶': 'Open above', '⿷': 'Open right', '⿸': 'Upper-left wrap', '⿹': 'Upper-right wrap', '⿺': 'Lower-left wrap', '⿻': 'Overlaid', '⿼': 'Open left', '⿽': 'Lower-right wrap', '⿾': 'Mirrored', '⿿': 'Rotated', '㇯': 'Subtracted' };

const layoutIcons = { '⿰': Columns2, '⿱': Rows2, '⿲': Columns3, '⿳': Rows3, '⿻': Layers2, '⿾': FlipHorizontal2, '⿿': RotateCw, '㇯': Minus };
const enclosurePaths: Record<string, string> = {
  '⿵': 'M3 21V3H21V21', '⿶': 'M3 3V21H21V3',
  '⿷': 'M21 3H3V21H21', '⿼': 'M3 3H21V21H3',
  '⿸': 'M3 21V3H21', '⿹': 'M3 3H21V21',
  '⿺': 'M3 3V21H21', '⿽': 'M21 3V21H3',
};
function LayoutIcon({ operator }: { operator: string }) {
  const LucideIcon = layoutIcons[operator as keyof typeof layoutIcons];
  if (LucideIcon) return <LucideIcon aria-hidden="true"/>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {operator === '⿴' ? <rect x="3" y="3" width="18" height="18" rx="2"/> : <path d={enclosurePaths[operator]}/>}
    <rect x="9" y="9" width="6" height="6" rx="1"/>
  </svg>;
}

/** Speaker for a decomposition component's own pronunciation. A Kangxi variant form
 *  with no recorded name presents the family heading's name and reading, exactly like
 *  the radical cards; a form with nothing recorded keeps its control disabled. */
function NodeAudio({ glyph, spoken, reading, recording, available }: { glyph: string; spoken: string | null; reading: string | null; recording: boolean; available: boolean }) {
  const { preferences } = useWorkspace();
  const label = spoken ?? glyph;
  return <Button variant="ghost" size="icon" className={`decomposition-listen${recording ? '' : ' audio-tts-only'}`} disabled={!available} aria-label={available ? `Listen to ${label}` : `No audio available for ${label}`} title={available ? recording ? 'Listen to pronunciation' : 'Browser speech · no recording for this form' : undefined} onClick={() => { if (spoken) playCharacter(spoken, preferences.slow, reading); }}><Volume2 size={13}/></Button>;
}

export function DecompositionTree({ node }: { node: DecompositionNode }) {
  const { preferences } = useWorkspace();
  const card = glyphIndex()[node.glyph];
  const destination = libraryDestination(node.glyph, preferences.includeTraditional);
  const identity = radicalIdentity(node.glyph);
  const exactRecord = card?.id.split(':').slice(1).join(':') === node.glyph;
  const classification = identity.radicals.length ? `${identity.kind === 'canonical' ? 'Kangxi radical' : 'Kangxi radical form'} ${identity.radicals.map(radical => `#${radical.number}`).join(' / ')}` : /^[?？]$/.test(node.glyph) ? 'Unknown or missing part' : /^\{\d+\}$/.test(node.glyph) ? 'Unencoded source component' : 'Graphical component · no sourced Kangxi identity';
  const dictionary = exactRecord && card?.meaning ? `Dictionary meaning: ${card.meaning}` : '';
  const presentation = card ? glyphPresentation(node.glyph, card.kind, card.pinyin, card.meaning) : null;
  const fallback = presentation?.component ? radicalVariantFallback(node.glyph, card?.pinyin ?? '') : null;
  const spoken = fallback ? fallback.spoken : exactRecord ? presentation?.speech ?? null : null;
  const reading = fallback ? fallback.reading : exactRecord ? presentation?.reading || null : null;
  const pinyin = fallback ? fallback.pinyin : exactRecord ? presentation?.reading || '' : '';
  const recording = spoken ? characterRecording(spoken, reading) : null;
  const available = usePronunciationAvailability(Boolean(recording), reading);
  const glyph = card && destination
    ? <Button asChild variant="ghost" className="decomposition-glyph"><Link to="/characters" search={destination} resetScroll={false} lang="zh-CN" title={exactRecord ? `Open the ${card.kind.replace(/s$/, '').toLowerCase()} card for ${node.glyph}` : `Open the sourced Kangxi radical for ${node.glyph}`} aria-label={`Open the library card for ${node.glyph}`}><strong>{node.glyph}</strong></Link></Button>
    : <strong lang="zh-CN">{node.glyph}</strong>;
  return <li><div className="decomposition-node"><span>{node.position}</span>{IDS_LAYOUTS[node.glyph] ? <div className="decomposition-layout" aria-label={`${IDS_LAYOUTS[node.glyph]} structure`}><LayoutIcon operator={node.glyph}/><small>{IDS_LAYOUTS[node.glyph]}</small></div> : <div className="decomposition-part">{glyph}<small className="decomposition-facts">{classification}{pinyin ? <> · <span className="pinyin">{pinyin}</span></> : null}{dictionary ? <> · {dictionary}</> : null}</small><NodeAudio glyph={node.glyph} spoken={spoken} reading={reading} available={available}/></div>}</div>{node.children?.length ? <ul>{node.children.map((child, i) => <DecompositionTree key={`${child.position}-${i}`} node={child}/> )}</ul> : null}</li>;
}

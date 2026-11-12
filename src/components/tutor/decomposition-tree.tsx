import { MeaningText } from './meaning-text';
import { openDetailsHint } from '@/lib/tile-hints';
import { useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { Columns2, Columns3, Rows2, Rows3, FlipHorizontal2, RotateCw, Layers2, Minus, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { glyphIndex, glyphScript, libraryDestination, radicalVariantFallback, type DecompositionNode } from '@/lib/character-library';
import { glyphPresentation } from '@/lib/glyph-presentation';
import { characterRecording, playCharacter } from '@/lib/catalog-store';
import { MultiReadingSpeakers, isMultiReading } from './reading-speakers';
import { useWorkspace } from './workspace';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { childOwner, contextualRadical } from '@/lib/radical-context';
import { radicalFamily } from '@/lib/radical-strokes';
import { BabelStoneComponent } from './babelstone-component';
import { useGlyphFit, useGlyphInkShift } from './glyph-fit';
import { breakdownDisplayGlyph } from '@/lib/radical-identities';

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

/** The "unknown or missing part" placeholder. The ? is a UI mark, not a Chinese glyph,
 *  and every font draws it somewhere different inside its advance box (left of centre,
 *  higher or lower), so flex centring alone leaves it visibly off-centre in the tile.
 *  Its ink is measured and nudged onto the tile's optical centre; the tile box and its
 *  dashed border never move because the shift sits on this inner element. */
function UnknownPartMark({ glyph }: { glyph: string }) {
  const markRef = useRef<HTMLSpanElement | null>(null);
  const shift = useGlyphInkShift(markRef, glyph);
  const style = shift.dx || shift.dy ? { transform: `translate(${shift.dx}px, ${shift.dy}px)` } : undefined;
  return <span ref={markRef} className="decomposition-unknown-mark" style={style}>{glyph}</span>;
}

/** Presentation for a shared glyph that context resolved to another family's form (鄱's
 *  阝 → 邑's ⻏): reading, sound, meaning and link come from that family form — its own
 *  record when it is the family heading (曰), else the family fallback (⻏ → 邑 yì). The
 *  source glyph shown in the tile is never replaced. */
function sharedFormPresentation(form: { family: number; glyph: string }, heading: string, includeTraditional: boolean) {
  const familyForm = radicalFamily(form.family)?.forms.find(item => item.character === form.glyph);
  const base = libraryDestination(heading, includeTraditional);
  const destination = base ? { ...base, ...(familyForm && form.glyph !== heading ? { variant: familyForm.key } : {}) } : undefined;
  const fallback = radicalVariantFallback(form.glyph, '', form.family);
  if (fallback) return { destination, spoken: fallback.spoken, reading: fallback.reading, pinyin: fallback.pinyin, meaning: `${fallback.meaning}; component form of ${fallback.headingGlyph}` };
  const record = glyphIndex()[form.glyph];
  const presentation = record ? glyphPresentation(form.glyph, record.kind, record.pinyin, record.meaning) : null;
  const meaning = (record?.meaning ?? '').split(';').map(part => part.trim()).filter(part => part && !/^(?:Kangxi radical\s*#?|rad\.?|radical)\s*#?\s*\d+$/i.test(part)).join('; ');
  return { destination, spoken: presentation?.speech ?? null, reading: presentation?.reading || null, pinyin: presentation?.reading || '', meaning };
}

/** One breakdown row. `owner` is the character whose declared radical applies to this node
 *  (see childOwner); without it, nodes keep their standalone source identity. */
export function DecompositionTree({ node, owner }: { node: DecompositionNode; owner?: string | undefined }) {
  const { preferences } = useWorkspace();
  // Placeholder tokens ({n}, ?) carry no glyph ink, so they skip the visual fit.
  // Same-form radical codes (⺝) draw as their radical (月) so both trees show one picture.
  const shownGlyph = breakdownDisplayGlyph(node.glyph);
  const fitGlyph = /^[?？]$/.test(node.glyph) || /^\{\d+\}$/.test(node.glyph) ? '' : shownGlyph;
  const tileTextRef = useRef<HTMLElement | null>(null);
  const glyphFit = useGlyphFit(tileTextRef, fitGlyph);
  const glyphFitStyle = glyphFit !== 1 ? { transform: `scale(${glyphFit})`, display: 'inline-block' } as const : undefined;
  const card = glyphIndex()[node.glyph];
  const context = contextualRadical(node.glyph, node.position, owner);
  const resolvedHeading = context.radicals[0]?.glyph ?? '';
  const shared = context.form ? sharedFormPresentation(context.form, resolvedHeading, preferences.includeTraditional) : null;
  const destination = shared ? shared.destination : libraryDestination(node.glyph, preferences.includeTraditional);
  const exactRecord = card?.id.split(':').slice(1).join(':') === node.glyph;
  const classification = context.radicals.length ? `Kangxi radical ${context.radicals.map(radical => `#${radical.number}`).join(' / ')}` : /^[?？]$/.test(node.glyph) ? 'Unknown or missing part' : 'Graphical component';
  const dictionary = shared ? shared.meaning : exactRecord && card?.meaning ? card.meaning.split(';').map(part => part.trim()).filter(part => part && !/^(?:Kangxi radical\s*#?|rad\.?|radical)\s*#?\s*\d+$/i.test(part)).join('; ') : '';
  const presentation = card ? glyphPresentation(node.glyph, card.kind, card.pinyin, card.meaning) : null;
  const fallback = !shared && presentation?.component ? radicalVariantFallback(node.glyph, card?.pinyin ?? '') : null;
  const spoken = shared ? shared.spoken : fallback ? fallback.spoken : exactRecord ? presentation?.speech ?? null : null;
  const reading = shared ? shared.reading : fallback ? fallback.reading : exactRecord ? presentation?.reading || null : null;
  const pinyin = shared ? shared.pinyin : fallback ? fallback.pinyin : exactRecord ? presentation?.reading || '' : '';
  const recording = spoken ? characterRecording(spoken, reading) : null;
  const available = usePronunciationAvailability(Boolean(recording), reading);
  // Say why a context-resolved badge differs from the glyph's standalone identity.
  const radicalTitle = context.basis === 'declared' ? `Declared radical of ${owner} (Unihan)` : context.basis === 'position' ? `${node.position[0]?.toUpperCase()}${node.position.slice(1)}-side ${node.glyph} is the ${resolvedHeading} form` : undefined;
  const linkTitle = shared ? `Open Kangxi radical #${context.radicals[0]?.number} ${resolvedHeading}` : exactRecord ? `Open the ${card?.kind.replace(/s$/, '').toLowerCase()} card for ${node.glyph}` : `Open the sourced Kangxi radical for ${node.glyph}`;
  if (/^\{\d+\}$/.test(node.glyph)) return <li><div className="decomposition-node"><span>{node.position}</span><BabelStoneComponent token={node.glyph}/></div></li>;
  // A bare ? (or ？) is a data gap in the recorded sources, not an error: give
  // the placeholder glyph a muted, dashed tile plus a tooltip saying so.
  const unknownPart = /^[?？]$/.test(node.glyph);
  const traditional = glyphScript(node.glyph) === 'Traditional';
  // A node resolved to a Kangxi radical (context.radicals) gets the gold 部 corner stamp
  // and ink; a traditional radical form keeps the purple 繁 mark instead (CSS decides).
  const isRadical = context.radicals.length > 0;
  const glyph = (card || shared) && destination
    ? <Button asChild variant="ghost" className={`decomposition-glyph${traditional ? ' traditional-character' : ''}${isRadical ? ' is-radical' : ''}`}><Link to="/characters" search={destination} resetScroll={false} lang="zh-CN" title={openDetailsHint(node.glyph, destination.tab)} aria-label={`${linkTitle} · ${openDetailsHint(node.glyph, destination.tab)}`}><strong ref={tileTextRef} style={glyphFitStyle}>{shownGlyph}</strong></Link></Button>
    : <strong ref={tileTextRef} style={glyphFitStyle} lang="zh-CN" className={`decomposition-glyph decomposition-glyph-static${traditional ? ' traditional-character' : ''}${isRadical ? ' is-radical' : ''}${unknownPart ? ' decomposition-glyph-unknown' : ''}`} title={unknownPart ? 'Part not recorded in the source data' : undefined} aria-label={unknownPart ? 'Unknown or missing part' : undefined}>{unknownPart ? <UnknownPartMark glyph={shownGlyph}/> : shownGlyph}</strong>;
  return <li><div className="decomposition-node"><span>{node.position}</span>{IDS_LAYOUTS[node.glyph] ? <div className="decomposition-layout" aria-label={`${IDS_LAYOUTS[node.glyph]} structure`}><LayoutIcon operator={node.glyph}/><small>{IDS_LAYOUTS[node.glyph]}</small></div> : <div className="decomposition-part">{glyph}<small className="decomposition-facts"><span className="decomposition-facts-row">{/* Omit the empty pronunciation slot so its flex gap never indents a classification-only row. */}{(pinyin || spoken) ? <span className="decomposition-pronunciation">{spoken && reading && pinyin === reading && isMultiReading(reading) ? <MultiReadingSpeakers spoken={spoken} reading={reading} variant="inline"/> : <>{pinyin ? <span className="pinyin">{pinyin}</span> : null}{spoken ? <NodeAudio glyph={node.glyph} spoken={spoken} reading={reading} recording={Boolean(recording)} available={available}/> : null}</>}</span> : null}{context.radicals.length ? context.radicals.map(radical => <span key={radical.id} className="word-hsk-id radical-tag" title={radicalTitle}>Radical #{radical.number}</span>) : !dictionary ? <span className="decomposition-classification">{classification}</span> : null}{traditional && <span className="word-hsk-id traditional-pill" title="Traditional-form record">Traditional</span>}</span>{(dictionary || fallback?.meaning) ? <span className="decomposition-meaning"><MeaningText text={dictionary || fallback?.meaning || ''}/></span> : null}</small></div>}</div>{node.children?.length ? <ul>{node.children.map((child, i) => <DecompositionTree key={`${child.position}-${i}`} node={child} owner={childOwner(node, owner)}/> )}</ul> : null}</li>;
}

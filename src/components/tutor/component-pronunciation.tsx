import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { glyphIndex, radicalVariantFallback } from '@/lib/character-library';
import { glyphPresentation } from '@/lib/glyph-presentation';
import { characterRecording, playCharacter } from '@/lib/catalog-store';
import { useWorkspace } from './workspace';
import { usePronunciationAvailability } from './use-pronunciation-availability';

/** Exact component readings only; family speech is used only for recorded variant fallback. */
export function ComponentPronunciation({ glyph }: { glyph: string }) {
  const { preferences } = useWorkspace();
  const card = glyphIndex()[glyph];
  const exact = card?.id.split(':').slice(1).join(':') === glyph;
  const presentation = card ? glyphPresentation(glyph, card.kind, card.pinyin, card.meaning) : null;
  const fallback = presentation?.component ? radicalVariantFallback(glyph, card?.pinyin ?? '') : null;
  const spoken = fallback?.spoken ?? (exact ? presentation?.speech ?? null : null);
  const reading = fallback?.reading ?? (exact ? presentation?.reading || null : null);
  const pinyin = fallback?.pinyin ?? (exact ? presentation?.reading || '' : '');
  const recording = spoken ? characterRecording(spoken, reading) : null;
  const available = usePronunciationAvailability(Boolean(recording), reading);
  return <span className="component-pronunciation">{pinyin && <span className="pinyin">{pinyin}</span>}<Button variant="ghost" size="icon" className={`decomposition-listen${recording ? '' : ' audio-tts-only'}`} disabled={!available} aria-label={available ? `Listen to ${spoken ?? glyph}` : `No audio available for ${glyph}`} title={available ? 'Listen to component pronunciation' : 'No recorded component pronunciation'} onClick={() => { if (spoken) void playCharacter(spoken, preferences.slow, reading); }}><Volume2 size={13}/></Button></span>;
}
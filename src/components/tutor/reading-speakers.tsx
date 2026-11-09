import { Fragment, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { characterRecording, playCharacter } from '@/lib/catalog-store';
import { useWorkspace } from './workspace';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { TileSpeaker } from './tile-speaker';

// One speaker per recorded reading of a glyph ("liào / liǎo" → liào 🔊 / liǎo 🔊).
// Purpose: a glyph whose catalogue reading joins several readings with " / " never plays
// the joined string (it matches no recording and would fall back to TTS); each reading gets
// its own control that requests that exact reading's recording through the common audio
// pipeline (exact character-reading recording → validated Mandarin TTS).
// Inputs: `spoken` (glyph text to pronounce), `reading` (the recorded reading string),
// `variant` picks the surrounding control style so each surface keeps its own look.
// Callers render this only when isMultiReading(reading); single readings keep their own markup.

/** Readings recorded in one catalogue field, split only on the " / " separator. */
export const splitReadings = (reading: string | null | undefined) => (reading ?? '').split('/').map(part => part.trim()).filter(Boolean);
export const isMultiReading = (reading: string | null | undefined) => splitReadings(reading).length > 1;

export type ReadingSpeakerVariant = 'header' | 'tile' | 'inline' | 'example' | 'practice';

const buttonClass: Record<Exclude<ReadingSpeakerVariant, 'tile'>, string> = {
  header: '',
  practice: 'practice-listen',
  inline: 'decomposition-listen',
  example: 'example-listen',
};

/** Speaker for one exact reading. Errors go to `onError` when given, else show inline. */
export function GlyphReadingSpeaker({ spoken, reading, variant, onError }: { spoken: string; reading: string; variant: ReadingSpeakerVariant; onError?: ((message: string | null) => void) | undefined }) {
  const { preferences } = useWorkspace();
  const [error, setError] = useState<string | null>(null);
  const recording = characterRecording(spoken, reading);
  const available = usePronunciationAvailability(Boolean(recording), reading);
  const report = onError ?? setError;
  const play = async () => report(await playCharacter(spoken, preferences.slow, reading));
  const label = `Listen to ${spoken} ${reading}`;
  const title = available ? recording ? `Listen to ${reading} · Recording` : `${reading} · Browser speech · no recording` : undefined;
  const control = variant === 'tile'
    ? <TileSpeaker available={available} hasRecording={Boolean(recording)} label={label} unavailableLabel={`No audio available for ${spoken} ${reading}`} {...(title ? { title } : {})} onActivate={() => { void play(); }}/>
    : <Button variant="ghost" size="icon" className={`${buttonClass[variant]}${recording ? '' : ' audio-tts-only'}`} disabled={!available} aria-label={available ? label : `No audio available for ${spoken} ${reading}`} title={title} onClick={() => void play()}>{variant === 'inline' ? <Volume2 size={13}/> : <Volume2/>}</Button>;
  return <>{control}{!onError && error && <span role="status" className="example-audio-error">{error}</span>}</>;
}

/** "reading 🔊 / reading 🔊": every reading beside its own speaker. `prefix` (e.g. "Name · ")
 *  precedes the first reading; `textClassName` styles the reading text like the surface's pinyin. */
export function MultiReadingSpeakers({ spoken, reading, variant, textClassName = 'pinyin', prefix, onError }: { spoken: string; reading: string; variant: ReadingSpeakerVariant; textClassName?: string; prefix?: string | undefined; onError?: ((message: string | null) => void) | undefined }) {
  const parts = splitReadings(reading);
  return <span className="multi-reading" role="group" aria-label={`Readings of ${spoken}`}>
    {parts.map((part, index) => <Fragment key={`${part}-${index}`}>
      {index > 0 && <span className={`multi-reading-separator ${textClassName}`} aria-hidden="true">/</span>}
      <span className="multi-reading-part"><span className={textClassName}>{index === 0 && prefix ? prefix : ''}{part}</span><GlyphReadingSpeaker spoken={spoken} reading={part} variant={variant} onError={onError}/></span>
    </Fragment>)}
  </span>;
}

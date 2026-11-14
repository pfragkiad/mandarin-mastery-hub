// Shared pieces of the Pinyin guide: the tone-shape icon and the recording player
// hook. Every mode (chart and the three games) uses these so playback and slow
// speed behave alike.
import { useCallback, useEffect, useRef, useState } from 'react';
import { playRecordingUrl, stopRecording } from '@/lib/audio';
import { hasRecording, soundId, type PinyinData, type PinyinSound, type Tone } from '@/lib/pinyin-guide';

/** Pitch contour of a tone (high level, rising, dipping, falling; neutral = a light dot). Decorative. */
export function ToneContour({ tone, className = '' }: { tone: Tone; className?: string }) {
  const path = tone === 1 ? 'M12 14 L88 14' : tone === 2 ? 'M12 48 L88 12' : tone === 3 ? 'M12 30 Q40 64 56 56 T88 16' : tone === 4 ? 'M12 12 L88 56' : '';
  return <svg viewBox="0 0 100 70" className={`tone-contour ${className}`} aria-hidden="true" focusable="false">
    <path d="M6 66 L94 66" className="tone-contour-base" />
    {tone === 5 ? <circle cx="50" cy="44" r="7" /> : <path d={path} />}
  </svg>;
}

/**
 * Play exact recordings only. Inputs: the loaded data and the slow preference. State: the sound id now playing, whether a
 * multi-clip sequence is running, and the last error. `sequence` chains clips (all tones) and is cancelled by any new play/stop.
 */
export function usePinyinPlayer(data: PinyinData | null, slow: boolean) {
  const [playing, setPlaying] = useState<string | null>(null);
  // True only while a chain of several clips (Play all) runs, so callers can offer
  // Stop for a sequence without flashing it during a short single-tone clip.
  const [sequencing, setSequencing] = useState(false);
  const [error, setError] = useState('');
  const ticket = useRef(0);
  // Every path that ends playback (done, missing clip, failed clip, stop) also ends the sequence.
  const idle = useCallback(() => { setPlaying(null); setSequencing(false); }, []);
  const playChain = useCallback(async (sounds: PinyinSound[]) => {
    const mine = ++ticket.current;
    setError('');
    setSequencing(sounds.length > 1);
    for (const sound of sounds) {
      if (mine !== ticket.current) return;
      const recording = data && hasRecording(data, sound.base, sound.tone) ? data.recordings[sound.id] : null;
      if (!recording) { idle(); setError('No recording exists for this sound.'); return; }
      setPlaying(sound.id);
      const finished = new Promise<void>(resolve => {
        void playRecordingUrl(recording.url, slow, resolve).then(ok => {
          if (!ok) { if (mine === ticket.current) { setError('The recording could not play. Try again.'); idle(); } ticket.current++; resolve(); }
        });
      });
      await finished;
      // A short gap keeps chained tones distinct.
      if (mine === ticket.current) await new Promise(resolve => setTimeout(resolve, 260));
    }
    if (mine === ticket.current) idle();
  }, [data, slow, idle]);
  const play = useCallback((sound: PinyinSound) => playChain([sound]), [playChain]);
  const stop = useCallback(() => { ticket.current++; stopRecording(); idle(); }, [idle]);
  useEffect(() => () => { ticket.current++; stopRecording(); }, []);
  return { playing, sequencing, error, play, sequence: playChain, stop, clearError: () => setError('') };
}
export type PinyinPlayer = ReturnType<typeof usePinyinPlayer>;

export const sound = (base: string, tone: Tone): PinyinSound => ({ id: soundId(base, tone), base, tone });

// Shared pieces of the Pinyin guide: the tone-shape icon, the recording player
// hook and the browser-remembered progress hook. Every mode (chart and the
// three quizzes) uses these so playback, slow speed and progress behave alike.
import { useCallback, useEffect, useRef, useState } from 'react';
import { playRecordingUrl, stopRecording } from '@/lib/audio';
import { hasRecording, soundId, type PinyinData, type PinyinSound, type Tone } from '@/lib/pinyin-guide';
import { PINYIN_PROGRESS_KEY, parseProgress, recordSound, type PinyinProgress } from '@/lib/pinyin-progress';

/** Pitch contour of a tone (high level, rising, dipping, falling; neutral = a light dot). Decorative. */
export function ToneContour({ tone, className = '' }: { tone: Tone; className?: string }) {
  const path = tone === 1 ? 'M12 14 L88 14' : tone === 2 ? 'M12 48 L88 12' : tone === 3 ? 'M12 30 Q40 64 56 56 T88 16' : tone === 4 ? 'M12 12 L88 56' : '';
  return <svg viewBox="0 0 100 70" className={`tone-contour ${className}`} aria-hidden="true" focusable="false">
    <path d="M6 66 L94 66" className="tone-contour-base" />
    {tone === 5 ? <circle cx="50" cy="44" r="7" /> : <path d={path} />}
  </svg>;
}

/**
 * Play exact recordings only. Inputs: the loaded data, the slow preference and
 * an `onHeard` callback (progress). State: the sound id now playing and the last
 * error. `sequence` chains clips (all tones) and is cancelled by any new play/stop.
 */
export function usePinyinPlayer(data: PinyinData | null, slow: boolean, onHeard?: (id: string) => void) {
  const [playing, setPlaying] = useState<string | null>(null);
  const [error, setError] = useState('');
  const ticket = useRef(0);
  const heard = useRef(onHeard);
  heard.current = onHeard;
  const playChain = useCallback(async (sounds: PinyinSound[]) => {
    const mine = ++ticket.current;
    setError('');
    for (const sound of sounds) {
      if (mine !== ticket.current) return;
      const recording = data && hasRecording(data, sound.base, sound.tone) ? data.recordings[sound.id] : null;
      if (!recording) { setPlaying(null); setError('No recording exists for this sound.'); return; }
      setPlaying(sound.id);
      const finished = new Promise<void>(resolve => {
        void playRecordingUrl(recording.url, slow, resolve).then(ok => {
          if (!ok) { if (mine === ticket.current) { setError('The recording could not play. Try again.'); setPlaying(null); } ticket.current++; resolve(); }
          else heard.current?.(sound.id);
        });
      });
      await finished;
      // A short gap keeps chained tones distinct.
      if (mine === ticket.current) await new Promise(resolve => setTimeout(resolve, 260));
    }
    if (mine === ticket.current) setPlaying(null);
  }, [data, slow]);
  const play = useCallback((sound: PinyinSound) => playChain([sound]), [playChain]);
  const stop = useCallback(() => { ticket.current++; stopRecording(); setPlaying(null); }, []);
  useEffect(() => () => { ticket.current++; stopRecording(); }, []);
  return { playing, error, play, sequence: playChain, stop, clearError: () => setError('') };
}
export type PinyinPlayer = ReturnType<typeof usePinyinPlayer>;

/** Progress lives in this browser; it is read after mount so the server render matches. */
export function usePinyinProgress() {
  const [progress, setProgress] = useState<PinyinProgress>({});
  useEffect(() => { setProgress(parseProgress(window.localStorage.getItem(PINYIN_PROGRESS_KEY))); }, []);
  const update = useCallback((next: (prior: PinyinProgress) => PinyinProgress) => {
    setProgress(prior => {
      const value = next(prior);
      try { window.localStorage.setItem(PINYIN_PROGRESS_KEY, JSON.stringify(value)); } catch { /* storage full or blocked: keep the session value */ }
      return value;
    });
  }, []);
  const record = useCallback((id: string, action: 'heard' | 'right' | 'wrong') => update(prior => recordSound(prior, id, action)), [update]);
  const reset = useCallback(() => update(() => ({})), [update]);
  return { progress, record, reset };
}

export const sound = (base: string, tone: Tone): PinyinSound => ({ id: soundId(base, tone), base, tone });

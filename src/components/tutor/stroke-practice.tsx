import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Eye, EyeOff, Lightbulb, Pause, PenLine, Play, Printer, RotateCcw, Volume2 } from 'lucide-react';
import type HanziWriter from 'hanzi-writer';
import { Button } from '@/components/ui/button';
import { libraryEntries } from '@/lib/character-library';
import { strokeExamples } from '@/lib/stroke-examples';
import { characterRecording, playCharacter } from '@/lib/catalog-store';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { useWorkspace } from './workspace';
import { PracticeSheet } from './practice-sheet';
import { SPEEDS, DEFAULT_SPEED_INDEX } from './writing-practice';

const toHex = (value: string) => {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return undefined;
  ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
  return `#${Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3).map(c => c.toString(16).padStart(2, '0')).join('')}`;
};

/** The word a voice can say for a stroke: the Chinese name the source records (横).
 * A stroke glyph (㇐) has no sound of its own and an English note is not a pronunciation,
 * so anything that isn't Chinese leaves the control with nothing to speak. */
export function strokeSpeech(entry?: { note: string; pinyin: string }) {
  const name = entry?.note.split(' · ')[0]?.trim() ?? '';
  const reading = entry?.pinyin.split(' / ')[0] || null;
  return { name: /^[㐀-鿿]+$/.test(name) ? name : null, reading: /^[㐀-鿿]+$/.test(name) ? reading : null };
}

/** Watch and trace the real Hanzi Writer outline of one stroke, taken from an explicit representative character. */
export function StrokePractice({ glyph }: { glyph: string }) {
  const { catalogVersion, theme, preferences } = useWorkspace();
  const entry = libraryEntries('Strokes').find(item => item.hanzi === glyph);
  // A stroke glyph (㇐) has no sound of its own — the stroke's Chinese name (横) is what a voice can say.
  const { name: strokeName, reading } = strokeSpeech(entry);
  const recording = strokeName ? characterRecording(strokeName, reading) : null;
  const audioAvailable = usePronunciationAvailability(Boolean(recording), reading);
  const [audioError, setAudioError] = useState(false);
  const listen = async () => setAudioError(strokeName ? Boolean(await playCharacter(strokeName, preferences.slow, reading)) : true);
  const example = strokeExamples[glyph];
  const target = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<'idle' | 'watch' | 'trace' | 'memory'>('idle');
  const [message, setMessage] = useState('Loading stroke…');
  const [sheet, setSheet] = useState(false);
  const [outline, setOutline] = useState<string | null>(null);
  const [guide, setGuide] = useState(true);
  const [speedIndex, setSpeedIndex] = useState(DEFAULT_SPEED_INDEX);
  const speedRef = useRef(SPEEDS[speedIndex] ?? 0.5);
  speedRef.current = SPEEDS[speedIndex] ?? 0.5;

  useEffect(() => {
    if (!example || !target.current) return;
    let active = true;
    const node = target.current;
    node.innerHTML = ''; setReady(false); setMode('idle'); setMessage('Loading stroke…');
    import('hanzi-writer').then(({ default: Writer }) => {
      if (!active) return;
      const style = getComputedStyle(document.documentElement);
      const ink = toHex(style.getPropertyValue('--primary').trim());
      const outline = toHex(style.getPropertyValue('--writer-outline').trim());
      const accent = toHex(style.getPropertyValue('--terracotta').trim());
      writer.current = Writer.create(node, example.character, {
        width: 300, height: 300, padding: 22, showOutline: guide, strokeAnimationSpeed: speedRef.current, drawingWidth: 6,
        ...(ink ? { strokeColor: ink } : {}), ...(outline ? { outlineColor: outline } : {}), ...(accent ? { drawingColor: accent, highlightColor: accent } : {}),
        charDataLoader: (char, onLoad, onError) => {
          fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/${encodeURIComponent(char)}.json`)
            .then(res => (res.ok ? res.json() : Promise.reject(new Error('no data'))))
            .then((data: { strokes: string[]; medians: number[][][] }) => {
              const path = data.strokes[example.strokeIndex]; const median = data.medians[example.strokeIndex];
              if (!path || !median) throw new Error('missing stroke');
              if (active) setOutline(path);
              onLoad({ strokes: [path], medians: [median] } as never);
            })
            .catch(err => onError(err));
        },
        onLoadCharDataSuccess: () => { if (active) { setReady(true); setMessage('Watch the stroke, then try it yourself.'); } },
        onLoadCharDataError: () => { if (active) setMessage('Stroke data couldn’t load. Please try again.'); },
      });
    }).catch(() => { if (active) setMessage('Writing practice couldn’t load.'); });
    return () => { active = false; writer.current?.cancelQuiz(); writer.current = null; node.innerHTML = ''; };
  }, [example, theme, Boolean(entry)]);

  const setSpeed = (instance: HanziWriter) => { (instance as unknown as { _options: { strokeAnimationSpeed: number } })._options.strokeAnimationSpeed = speedRef.current; };
  const watch = () => {
    const w = writer.current; if (!w) return;
    w.cancelQuiz(); setSpeed(w); setMode('watch'); setMessage('Watch the direction and where the stroke starts…');
    void w.animateCharacter({ onComplete: () => { setMode('idle'); setMessage('Now trace it yourself, or watch again.'); } });
  };
  const practice = () => {
    const w = writer.current; if (!w) return;
    setMode('trace'); setMessage(guide ? 'Trace the stroke over the guide.' : 'Write the stroke from memory.');
    void w.quiz({
      showHintAfterMisses: 2,
      onMistake: () => setMessage('Try again — check the starting point, direction and shape.'),
      onComplete: () => { setMode('idle'); setMessage('Stroke complete! Practice again when you’re ready.'); },
    });
  };
  const reset = () => { const w = writer.current; if (!w) return; w.cancelQuiz(); if (guide) void w.showOutline({ duration: 0 }); void w.showCharacter({ duration: 0 }); setMode('idle'); setMessage('Ready. Watch the stroke or start another attempt.'); };

  if (!entry) return <p className="library-note">{catalogVersion ? 'This stroke is not in the library.' : 'Loading stroke data…'}</p>;
  return <div className="page-enter"><div className="page-heading"><div><div className="eyebrow">笔画 · THE ART OF WRITING</div><h1>One stroke at a time.</h1><p>Find the rhythm. Build the character. Make your mark.</p></div><span className="heading-hanzi">书写<span>shū xiě</span></span></div><div className="practice-layout">
    <section className="writing-tool"><div className="tool-top"><span className="eyebrow">WATCH · TRACE · REMEMBER</span><Button variant="ghost" size="sm" onClick={() => { const next = !guide; setGuide(next); if (next) void writer.current?.showOutline(); else void writer.current?.hideOutline(); }}>{guide ? <EyeOff/> : <Eye/>}{guide ? 'Hide guide' : 'Show guide'}</Button></div>
      {example ? <>
        <div className="writing-grid"><div ref={target} className="hanzi-target" aria-label={`Stroke ${glyph} writing area`}/></div>
        <p className="writer-status" role="status">{message}</p>
        <div className="writer-controls">
          <Button disabled={!ready} onClick={mode === 'watch' ? () => { void writer.current?.pauseAnimation(); setMode('idle'); setMessage('Paused. Play to start again.'); } : watch}>{mode === 'watch' ? <Pause/> : <Play/>}{mode === 'watch' ? 'Pause' : 'Play stroke'}</Button>
          <Button disabled={!ready} variant="outline" size="icon" title="Reset stroke" aria-label="Reset stroke" onClick={reset}><RotateCcw/></Button>
          <Button disabled={!ready} variant="outline" onClick={practice}><PenLine/>Practice</Button>
        </div>
        <label className="writer-speed">Animation speed<input type="range" min={0} max={SPEEDS.length - 1} step={1} value={speedIndex} onChange={e => setSpeedIndex(Number(e.target.value))}/><span>{SPEEDS[speedIndex]}×</span></label>
      </> : <div className="record-gap"><p>No representative brush outline is recorded for this stroke yet, so it can’t be animated. None is inferred.</p></div>}
    </section><section className="practice-info"><span className="eyebrow">YOUR WRITING PRACTICE</span>
      <h2>Get to know <span lang="zh-CN">{glyph}</span></h2>
      <p className="practice-meaning"><span className="practice-text">{entry.pinyin ? <span className="pinyin">{entry.pinyin}</span> : <span className="pinyin">Pinyin not recorded</span>}<Button variant="ghost" size="icon" className={`practice-listen${audioAvailable ? '' : ' audio-tts-only'}`} disabled={!audioAvailable} aria-label={audioAvailable ? `Listen to ${strokeName ?? glyph}` : `No audio available for ${strokeName ?? glyph}`} title={audioAvailable ? recording ? 'Listen to pronunciation' : 'Browser speech · no recording for this stroke name' : undefined} onClick={listen}><Volume2/></Button>{entry.meaning ? <span className="practice-translation">{entry.meaning}</span> : <span className="meaning-missing">No English meaning recorded yet</span>}</span><span className="practice-kind">Stroke</span></p>
      {audioError && <p role="status" className="meaning-missing">Audio isn’t available in this browser.</p>}
      <p>Every stroke has a starting point and a direction. Watch how it moves, then practice tracing it yourself.</p>
      <div className="character-facts"><div><strong>1</strong><span>Stroke</span></div><div><strong lang="zh-CN">{strokeName ?? '—'}</strong><span>Name</span></div><div>{example ? <Link to="/strokes" search={{ character: example.character }}><strong lang="zh-CN">{example.character}</strong></Link> : <strong>—</strong>}<span>{example ? `Example · stroke ${example.strokeIndex + 1}` : 'Example'}</span></div></div>
      <Button variant="outline" size="sm" className="practice-print-button" disabled={!outline} onClick={() => setSheet(true)}><Printer/>Print practice sheet</Button>
      <div className="practice-tip"><h3><Lightbulb size={16}/>A small writing tip</h3><p>Find the starting point first, then keep one smooth movement until the stroke ends. Press a little at the start and ease off where it tapers.</p></div>
      <p className="source-note">Stroke inventory · Unicode 18.0 Appendix F. Outline powered by Hanzi Writer Data (Make Me a Hanzi).</p>
    </section>
    {sheet && outline && <PracticeSheet text={glyph} pinyin={entry.pinyin || undefined} meaning={entry.meaning || undefined} outlines={{ [glyph]: { strokes: [outline] } }} onClose={() => setSheet(false)}/>}
  </div></div>;
}

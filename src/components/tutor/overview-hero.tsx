import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { openDetailsHint } from '@/lib/tile-hints';
import { vocabularyKind } from '@/lib/mandarin';
import { Volume2, Bookmark } from 'lucide-react';
import { DetailsIcon, PracticeIcon } from './practice-icons';
import type HanziWriter from 'hanzi-writer';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';
import { MeaningText } from './meaning-text';
import { dailyCharacter, greeting, overviewWordDestination } from '@/lib/overview';
import { libraryEntries, libraryDestination, savedGlyphEntry, savedGlyphDestination, type LibraryEntry, type LibraryKind } from '@/lib/character-library';
import { characterAudioRequest, characterRecording, playCharacter } from '@/lib/catalog-store';
import { ExamplePronunciation } from './example-pronunciation';
import { MultiReadingSpeakers, isMultiReading } from './reading-speakers';
import { usePronunciationAvailability } from './use-pronunciation-availability';
import { SoundChartLink } from './sound-chart-link';

function cssColorToHex(value: string) {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return undefined;
  ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
  const p = ctx.getImageData(0, 0, 1, 1).data;
  return `#${Array.from(p).slice(0, 3).map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

/** The character square is sized by `--daily-glyph-size` (styles.css, .daily-hero-card), which is
 *  smaller on phones. Hanzi Writer's SVG carries width/height attributes but no
 *  viewBox, so CSS cannot scale the drawing — the writer is built at the square's rendered size
 *  (read from layout, since the variable may be a clamp() expression) and re-dimensioned when it changes. */
function dailyGlyphSize(box: HTMLElement) {
  const rendered = Math.round(box.getBoundingClientRect().width);
  return rendered > 0 ? rendered : 300;
}

/** Draws the character once in stroke order, then hands over to the learner's chosen font. */
function StrokeReveal({ hanzi }: { hanzi: string }) {
  const target = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDone(false);
    let active = true;
    let writer: HanziWriter | undefined;
    let observer: ResizeObserver | undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setDone(true); return; }
    import('hanzi-writer').then(({ default: Writer }) => {
      const host = target.current;
      const box = host?.parentElement ?? host;
      if (!active || !host || !box) return;
      host.innerHTML = '';
      const ink = cssColorToHex(getComputedStyle(document.documentElement).getPropertyValue('--primary').trim());
      let size = dailyGlyphSize(box);
      writer = Writer.create(host, hanzi, {
        width: size, height: size, padding: 10, showOutline: false, showCharacter: false,
        strokeAnimationSpeed: 1.4, delayBetweenStrokes: 120, ...(ink ? { strokeColor: ink } : {}),
        onLoadCharDataError: () => active && setDone(true),
      });
      // Rotating a tablet or switching display size moves --daily-glyph-size; keep the ink in step.
      observer = new ResizeObserver(() => {
        const next = dailyGlyphSize(box);
        if (!writer || next === size) return;
        size = next;
        writer.updateDimensions({ width: next, height: next, padding: 10 });
      });
      observer.observe(box);
      writer.animateCharacter({ onComplete: () => { if (active) setTimeout(() => active && setDone(true), 350); } });
    }).catch(() => active && setDone(true));
    return () => { active = false; observer?.disconnect(); writer = undefined; };
  }, [hanzi]);
  return <div className={`daily-glyph ${done ? 'is-done' : ''}`}>
    <div ref={target} className="daily-glyph-writer" aria-hidden="true"/>
    <strong lang="zh-CN" className="daily-glyph-font">{hanzi}</strong>
  </div>;
}

export function useDailyCharacter() {
  const { items, catalogVersion } = useWorkspace();
  const [now, setNow] = useState<Date>();
  useEffect(() => setNow(new Date()), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const entries = useMemo(() => libraryEntries('Characters'), [catalogVersion]);
  return { now, entry: now ? dailyCharacter(entries, items, now) : undefined };
}

export function DailyCharacterHero({ children }: { children: React.ReactNode }) {
  const { preferences } = useWorkspace();
  const { now, entry } = useDailyCharacter();
  const hello = greeting(now?.getHours() ?? 9);
  const component = entry?.decomposition?.root.children?.find(child => child.glyph && child.glyph !== entry.hanzi)?.glyph;
  const destination = entry ? libraryDestination(entry.hanzi, preferences.includeTraditional) : undefined;
  return <section className="daily-hero" aria-label="Character of the day">
    <div className="daily-hero-copy">
      {/* Greeting laid out like a glyph tile: hanzi on the left, reading over translation on its right. */}
      <h1><span lang="zh-CN" className="daily-greeting-hanzi">{hello.hanzi}</span>
        <span className="daily-greeting-facts">
          {/* Reading + the shared speaker (same as tiles); no recording exists, so it uses Mandarin speech. */}
          <span className="example-pinyin-row">{preferences.pinyin && <span className="pinyin daily-greeting-pinyin">{hello.pinyin}</span>}<ExamplePronunciation request={characterAudioRequest(hello.hanzi, hello.pinyin)} label={hello.hanzi}/></span>
          <span className="daily-greeting-en">{hello.english}.</span>
        </span>
      </h1>
      <p>One character a day, a few words around it, and a little practice.</p>
      {children}
    </div>
    <div className="daily-hero-card">
      {component && <span className="daily-hero-ghost" aria-hidden="true" lang="zh-CN">{component}</span>}
      <div className="eyebrow daily-hero-label">CHARACTER OF THE DAY</div>
      {entry ? <>
        <DailyPinyin entry={entry} slow={preferences.slow} showPinyin={preferences.pinyin} chartLinks={preferences.soundChartLinks !== false}/>
        <StrokeReveal hanzi={entry.hanzi}/>
        <h2 className="daily-hero-meaning" title={entry.meaning}><MeaningText text={entry.meaning}/></h2>
        <div className="daily-hero-actions">
          {destination && <Button asChild variant="outline" size="sm"><Link to="/characters" search={destination}><DetailsIcon aria-hidden="true"/>Details</Link></Button>}
          <Button asChild variant="outline" size="sm"><Link to="/strokes" search={{ character: entry.hanzi, mode: 'trace' }}><PracticeIcon aria-hidden="true"/>Practice</Link></Button>
        </div>
      </> : <div className="daily-glyph is-loading" aria-hidden="true"/>}
    </div>
  </section>;
}

/** The reading and its audio control on one line, above the character. `chartLinks` (the
 *  "Sound chart links on cards" setting) adds each reading's Sound chart link after its speaker. */
function DailyPinyin({ entry, slow, showPinyin, chartLinks }: { entry: LibraryEntry; slow: boolean; showPinyin: boolean; chartLinks: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const available = usePronunciationAvailability(Boolean(characterRecording(entry.hanzi, entry.pinyin)), entry.pinyin);
  // Several readings: each beside its own speaker (hidden pinyin keeps one per reading too).
  if (isMultiReading(entry.pinyin)) return <div className="daily-hero-pinyin">
    <MultiReadingSpeakers spoken={entry.hanzi} reading={entry.pinyin} variant="header" textClassName={showPinyin ? 'pinyin' : 'sr-only'} onError={setError} chartFrom={chartLinks ? entry.hanzi : undefined}/>
    {error && <p className="library-note" role="status">{error}</p>}
  </div>;
  return <div className="daily-hero-pinyin">
    {showPinyin && <span className="pinyin">{entry.pinyin}</span>}
    <Button variant="ghost" size="icon" disabled={!available} aria-label={available ? `Listen to ${entry.hanzi}` : `No audio available for ${entry.hanzi}`} onClick={async () => setError(await playCharacter(entry.hanzi, slow, entry.pinyin))}><Volume2/></Button>
    {chartLinks && entry.pinyin && <SoundChartLink reading={entry.pinyin} from={entry.hanzi} variant="header"/>}
    {error && <p className="library-note" role="status">{error}</p>}
  </div>;
}

type SavedRecord = { id: string; hanzi: string; pinyin: string; kind: string; to: '/vocabulary' | '/characters'; search: Record<string, unknown> };

/** Session bookmarks as a quick row; hidden when nothing is saved. */
export function SavedStrip() {
  const { saved, items, preferences, catalogVersion } = useWorkspace();
  const records = useMemo(() => saved.flatMap((id): SavedRecord[] => {
    const word = items.find(w => w.id === id);
    if (word) return [{ id, hanzi: word.hanzi, pinyin: word.pinyin, kind: vocabularyKind(word), to: '/vocabulary' as const, search: overviewWordDestination(word) as Record<string, unknown> }];
    const kind = id.split(':')[0] as LibraryKind;
    if (!['Characters', 'Radicals', 'Components', 'Strokes'].includes(kind)) return [];
    const entry = savedGlyphEntry(id);
    return entry ? [{ id, hanzi: entry.hanzi, pinyin: entry.pinyin, kind, to: '/characters' as const, search: savedGlyphDestination(entry) as Record<string, unknown> }] : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }).reverse(), [saved, items, catalogVersion]);
  if (!records.length) return null;
  return <section className="saved-strip" aria-label="Pick up where you left off">
    <div className="eyebrow"><Bookmark size={13} aria-hidden="true"/>PICK UP WHERE YOU LEFT OFF</div>
    <div className="saved-strip-row">{records.map(r => <Link key={r.id} to={r.to} search={r.search as never} className="saved-chip" title={openDetailsHint(r.hanzi, r.kind)}>{preferences.pinyin && r.pinyin && <span className="pinyin">{r.pinyin}</span>}<strong lang="zh-CN">{r.hanzi}</strong></Link>)}</div>
  </section>;
}

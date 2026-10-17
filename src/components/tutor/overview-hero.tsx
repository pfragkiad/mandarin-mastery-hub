import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Volume2, Library, PenLine, BookOpen, Bookmark } from 'lucide-react';
import type HanziWriter from 'hanzi-writer';
import { Button } from '@/components/ui/button';
import { useWorkspace } from './workspace';
import { dailyCharacter, greeting, overviewWordDestination } from '@/lib/overview';
import { libraryEntries, libraryDestination, type LibraryEntry, type LibraryKind } from '@/lib/character-library';
import { characterRecording, playCharacter } from '@/lib/catalog-store';
import { usePronunciationAvailability } from './use-pronunciation-availability';

function cssColorToHex(value: string) {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return undefined;
  ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
  const p = ctx.getImageData(0, 0, 1, 1).data;
  return `#${Array.from(p).slice(0, 3).map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Draws the character once in stroke order, then hands over to the learner's chosen font. */
function StrokeReveal({ hanzi }: { hanzi: string }) {
  const target = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDone(false);
    let active = true;
    let writer: HanziWriter | undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setDone(true); return; }
    import('hanzi-writer').then(({ default: Writer }) => {
      if (!active || !target.current) return;
      target.current.innerHTML = '';
      const ink = cssColorToHex(getComputedStyle(document.documentElement).getPropertyValue('--primary').trim());
      writer = Writer.create(target.current, hanzi, {
        width: 300, height: 300, padding: 10, showOutline: false, showCharacter: false,
        strokeAnimationSpeed: 1.4, delayBetweenStrokes: 120, ...(ink ? { strokeColor: ink } : {}),
        onLoadCharDataError: () => active && setDone(true),
      });
      writer.animateCharacter({ onComplete: () => { if (active) setTimeout(() => active && setDone(true), 350); } });
    }).catch(() => active && setDone(true));
    return () => { active = false; writer = undefined; };
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
      <div className="eyebrow">{now ? now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase() : '\u00a0'}</div>
      <h1><span lang="zh-CN" className="daily-greeting-hanzi">{hello.hanzi}</span><span className="daily-greeting-en">{hello.english}.</span></h1>
      {preferences.pinyin && <span className="pinyin daily-greeting-pinyin">{hello.pinyin}</span>}
      <p>One character a day, a few words around it, and a little practice.</p>
      {children}
    </div>
    <div className="daily-hero-card">
      {component && <span className="daily-hero-ghost" aria-hidden="true" lang="zh-CN">{component}</span>}
      <div className="eyebrow daily-hero-label">CHARACTER OF THE DAY</div>
      {entry ? <>
        <StrokeReveal hanzi={entry.hanzi}/>
        <DailyMeta entry={entry} slow={preferences.slow} showPinyin={preferences.pinyin}/>
        <div className="daily-hero-actions">
          {destination && <Button asChild variant="outline" size="sm"><Link to="/characters" search={destination}><Library/>Open in Glyphs</Link></Button>}
          <Button asChild variant="outline" size="sm"><Link to="/strokes" search={{ character: entry.hanzi }}><PenLine/>Practice writing</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link to="/vocabulary" search={{ q: entry.hanzi }}><BookOpen/>Words using it</Link></Button>
        </div>
      </> : <div className="daily-glyph is-loading" aria-hidden="true"/>}
    </div>
  </section>;
}

function DailyMeta({ entry, slow, showPinyin }: { entry: LibraryEntry; slow: boolean; showPinyin: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const available = usePronunciationAvailability(Boolean(characterRecording(entry.hanzi, entry.pinyin)), entry.pinyin);
  return <div className="daily-hero-meta">
    <div>{showPinyin && <span className="pinyin">{entry.pinyin}</span>}<h2 title={entry.meaning}>{entry.meaning}</h2></div>
    <Button variant="ghost" size="icon" disabled={!available} aria-label={available ? `Listen to ${entry.hanzi}` : `No audio available for ${entry.hanzi}`} onClick={async () => setError(await playCharacter(entry.hanzi, slow, entry.pinyin))}><Volume2/></Button>
    {error && <p className="library-note" role="status">{error}</p>}
  </div>;
}

type SavedRecord = { id: string; hanzi: string; pinyin: string; to: '/vocabulary' | '/characters'; search: Record<string, unknown> };

/** Session bookmarks as a quick row; hidden when nothing is saved. */
export function SavedStrip() {
  const { saved, items, preferences, catalogVersion } = useWorkspace();
  const records = useMemo(() => saved.flatMap((id): SavedRecord[] => {
    const word = items.find(w => w.id === id);
    if (word) return [{ id, hanzi: word.hanzi, pinyin: word.pinyin, to: '/vocabulary' as const, search: overviewWordDestination(word) as Record<string, unknown> }];
    const kind = id.split(':')[0] as LibraryKind;
    if (!['Characters', 'Radicals', 'Components', 'Strokes'].includes(kind)) return [];
    const entry = libraryEntries(kind).find(e => e.id === id);
    return entry ? [{ id, hanzi: entry.hanzi, pinyin: entry.pinyin, to: '/characters' as const, search: { tab: kind, id } as Record<string, unknown> }] : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }).reverse(), [saved, items, catalogVersion]);
  if (!records.length) return null;
  return <section className="saved-strip" aria-label="Pick up where you left off">
    <div className="eyebrow"><Bookmark size={13} aria-hidden="true"/>PICK UP WHERE YOU LEFT OFF</div>
    <div className="saved-strip-row">{records.map(r => <Link key={r.id} to={r.to} search={r.search as never} className="saved-chip"><strong lang="zh-CN">{r.hanzi}</strong>{preferences.pinyin && r.pinyin && <span className="pinyin">{r.pinyin}</span>}</Link>)}</div>
  </section>;
}

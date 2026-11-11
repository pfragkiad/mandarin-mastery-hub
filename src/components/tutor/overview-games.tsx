import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Play, Volume2 } from 'lucide-react';
import type HanziWriter from 'hanzi-writer';
import { HANZI_GAMES, PINYIN_GAMES, HanziIcon, PinyinGamesIcon, type GameEntry } from './game-catalog';
import { useWorkspace } from './workspace';

/**
 * Start page games: all five games in two labelled groups — Hanzi games
 * (characters/words) and Pinyin games (recorded syllables). No inputs or state;
 * the list itself comes from game-catalog so names, icons and destinations match
 * the side menu.
 *
 * One markup, two looks (CSS only, src/styles.css "Start games"):
 * - wider than 700px: preview tiles — a small decorative picture of the game,
 *   then the name, a short line and a Play cue; the whole tile is the link.
 * - phones: compact rows — the menu icon in a rounded square, name, a one-line
 *   description and a round Play button; again the whole row is the link.
 */
export function OverviewGames() {
  return <section className="overview-games" aria-labelledby="overview-games-title">
    <div className="eyebrow" id="overview-games-title">GAMES</div>
    <div className="overview-game-groups">
      <GameGroup title="Hanzi games" note="Characters, radicals and words" icon={<HanziIcon/>} games={HANZI_GAMES}/>
      <GameGroup title="Pinyin games" note="Real recorded syllables" icon={<PinyinGamesIcon/>} games={PINYIN_GAMES}/>
    </div>
  </section>;
}

function GameGroup({ title, note, icon, games }: { title: string; note: string; icon: React.ReactNode; games: GameEntry[] }) {
  return <section className="overview-game-group" aria-label={title}>
    <h2><span className="overview-game-group-icon" aria-hidden="true">{icon}</span><span className="overview-game-group-title">{title}</span><span className="overview-game-group-note">{note}</span></h2>
    <div className="overview-game-list">{games.map(game => <Link key={game.key} to={game.to} search={game.mode ? { mode: game.mode } : {}} className="overview-game-card" aria-label={`Play ${game.label.toLowerCase()}`}>
      <span className="overview-game-preview" aria-hidden="true"><GamePreview game={game.key}/></span>
      <span className="overview-game-icon" aria-hidden="true"><game.icon/></span>
      <span className="overview-game-text">
        <strong>{game.label}</strong>
        <span className="overview-game-line">{game.line}</span>
      </span>
      <span className="overview-game-play" aria-hidden="true"><span className="overview-game-play-dot"><Play/></span><span className="overview-game-play-label">Play</span></span>
    </Link>)}</div>
  </section>;
}

/**
 * Decorative picture at the top of each wide-screen tile (hidden on phones and from
 * screen readers). These are illustrations of how each game looks, not lesson data:
 * the drawing game writes part of 我 from its recorded Hanzi Writer Data strokes (see
 * DrawingPreview), and no reading, tone or audio is attached to anything here. The syllables shown (bān, pān, hǎo) are real Sound chart
 * syllables with recordings, typed as one syllable the way the quiz asks. Input: the game key.
 */
function GamePreview({ game }: { game: string }) {
  switch (game) {
    case 'flashcards':
      return <span className="game-preview-cards"><span/><span lang="zh-CN">地</span></span>;
    case 'drawing':
      return <DrawingPreview/>;
    case 'tones':
      return <span className="game-preview-tones">{[
        ['M5 9H23', 'ā'], ['M5 16L23 4', 'á'], ['M5 5Q14 20 23 5', 'ǎ'], ['M5 4L23 16', 'à'],
      ].map(([d, mark], i) => <span key={mark} className={i === 2 ? 'is-picked' : undefined}>
        <svg viewBox="0 0 28 20"><path d={d}/></svg><span>{mark}</span>
      </span>)}</span>;
    case 'alikes':
      return <span className="game-preview-alikes"><span><Volume2/>bān</span><i>≈</i><span><Volume2/>pān</span></span>;
    case 'type':
      return <span className="game-preview-type"><span className="game-preview-type-speaker"><Volume2/></span><span>hǎo</span><span className="game-preview-caret"/></span>;
    default:
      return null;
  }
}

/* Drawing-game picture: a small Hanzi Writer square that writes the first strokes of 我
   and stops partway, like a learner mid-character. Size and padding match the CSS box
   (.game-preview-drawing); the writer's SVG has no viewBox, so it is built at this size. */
const PREVIEW_HANZI = '我';
const PREVIEW_STROKES = 5; // of 7 recorded strokes — enough to read as 我, clearly unfinished
const PREVIEW_SIZE = 96;
const PREVIEW_PAD = 6;
const PREVIEW_SCALE = (PREVIEW_SIZE - 2 * PREVIEW_PAD) / 1024;

/** A CSS colour token as #rrggbb, because Hanzi Writer takes literal colours only. */
function tokenHex(token: string) {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return undefined;
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  ctx.fillRect(0, 0, 1, 1);
  return `#${Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3).map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Inputs: none (theme from the workspace, so the ink is rebuilt in the new colour).
 * State: `pen` — where the pen dot rests once the partial write finishes.
 * Tricky bits: stroke geometry comes only from loadStrokeGeometry (recorded Hanzi Writer
 * Data), loaded lazily with Hanzi Writer itself; if it fails the square stays an empty
 * guide — nothing is sketched in its place. The pen dot sits on the last drawn stroke's
 * recorded median end, mapped from Hanzi Writer's 1024 space (y bounds [-124, 900]).
 * Writing starts only when the tile scrolls into view; reduced motion draws instantly.
 */
function DrawingPreview() {
  const { theme } = useWorkspace();
  const host = useRef<HTMLSpanElement>(null);
  const [pen, setPen] = useState<readonly [number, number] | null>(null);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let active = true;
    let writer: HanziWriter | undefined;
    let observer: IntersectionObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setPen(null);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    Promise.all([import('hanzi-writer'), import('@/lib/character-enrichment').then(m => m.loadStrokeGeometry(PREVIEW_HANZI))]).then(([{ default: Writer }, { data }]) => {
      if (!active) return;
      node.innerHTML = '';
      const ink = tokenHex('--primary');
      const count = Math.min(PREVIEW_STROKES, data.strokes.length);
      const instance = Writer.create(node, PREVIEW_HANZI, {
        width: PREVIEW_SIZE, height: PREVIEW_SIZE, padding: PREVIEW_PAD, showCharacter: false, showOutline: false,
        strokeAnimationSpeed: reduced ? 50 : 1.1, delayBetweenStrokes: 0,
        charDataLoader: (_glyph, onLoad) => onLoad(data), ...(ink ? { strokeColor: ink } : {}),
      });
      writer = instance;
      const end = data.medians[count - 1]?.at(-1);
      const write = (index: number) => {
        if (!active) return;
        if (index >= count) { if (end) setPen([PREVIEW_PAD + end[0] * PREVIEW_SCALE, PREVIEW_PAD + (900 - end[1]) * PREVIEW_SCALE]); return; }
        void instance.animateStroke(index, { onComplete: () => { timer = setTimeout(() => write(index + 1), reduced ? 0 : 180); } });
      };
      observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer?.disconnect();
        write(0);
      });
      observer.observe(node);
    }).catch(() => { /* no recorded strokes: leave the empty guide */ });
    return () => { active = false; observer?.disconnect(); clearTimeout(timer); writer = undefined; node.innerHTML = ''; };
  }, [theme]);
  const half = PREVIEW_SIZE / 2;
  return <span className="game-preview-drawing">
    <svg viewBox={`0 0 ${PREVIEW_SIZE} ${PREVIEW_SIZE}`}>
      <path className="game-preview-guide" d={`M0.5 0.5H${PREVIEW_SIZE - 0.5}V${PREVIEW_SIZE - 0.5}H0.5ZM0 ${half}H${PREVIEW_SIZE}M${half} 0V${PREVIEW_SIZE}`}/>
    </svg>
    <span ref={host} className="game-preview-writer"/>
    {pen && <svg viewBox={`0 0 ${PREVIEW_SIZE} ${PREVIEW_SIZE}`}><circle className="game-preview-pen" cx={pen[0]} cy={pen[1]} r="4"/></svg>}
  </span>;
}

import { Link } from '@tanstack/react-router';
import { AudioLines, Play, Volume2 } from 'lucide-react';
import { HANZI_GAMES, PINYIN_GAMES, HanziIcon, type GameEntry } from './game-catalog';

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
      <GameGroup title="Pinyin games" note="Real recorded syllables" icon={<AudioLines/>} games={PINYIN_GAMES}/>
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
 * the drawing-game strokes are a schematic sketch, and no reading, tone or audio is
 * attached to anything here. The syllables shown (bān, pān, hǎo) are real Sound chart
 * syllables with recordings, typed as one syllable the way the quiz asks. Input: the game key.
 */
function GamePreview({ game }: { game: string }) {
  switch (game) {
    case 'flashcards':
      return <span className="game-preview-cards"><span/><span lang="zh-CN">地</span></span>;
    case 'drawing':
      return <svg className="game-preview-drawing" viewBox="0 0 160 120">
        <path className="game-preview-guide" d="M10 60H150M80 6V114"/>
        <path className="game-preview-ink" d="M52 50H108M80 22V96M46 96H80"/>
        <circle className="game-preview-pen" cx="80" cy="96" r="5"/>
      </svg>;
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

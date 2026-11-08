import { Link } from '@tanstack/react-router';
import { AudioLines, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HANZI_GAMES, PINYIN_GAMES, HanziIcon, type GameEntry } from './game-catalog';

/**
 * Start page games: all five games in two labelled groups — Hanzi games
 * (characters/words) and Pinyin games (recorded syllables). Each game is a small
 * card with its icon, a one-line description and a Play link. No inputs or state;
 * the list itself comes from game-catalog so it matches the sidebar.
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
  return <section className="overview-game-group" aria-label={title} style={{ '--game-count': games.length } as React.CSSProperties}>
    <h2><span className="overview-game-group-icon" aria-hidden="true">{icon}</span>{title}<span className="overview-game-group-note">{note}</span></h2>
    <div className="overview-game-list">{games.map(game => <article key={game.key} className="overview-game-card">
      <span className="overview-game-icon" aria-hidden="true"><game.icon/></span>
      <h3>{game.label}</h3>
      <p>{game.line}</p>
      <Button asChild size="sm" className="overview-game-play"><Link to={game.to} search={game.mode ? { mode: game.mode } : {}} aria-label={`Play ${game.label.toLowerCase()}`}><Play/>Play</Link></Button>
    </article>)}</div>
  </section>;
}

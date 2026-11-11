import { useNavigate } from '@tanstack/react-router';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HANZI_GAMES, PINYIN_GAMES } from './game-catalog';
import { useActivePill } from '@/lib/use-active-pill';

const ALL_GAMES = [...HANZI_GAMES, ...PINYIN_GAMES];
export type GameKey = (typeof ALL_GAMES)[number]['key'];

/**
 * Phone-only pill row switching between all five games (the phone "Games" tab
 * covers them all). It renders on Flashcards, the Drawing game and the three
 * Pinyin quiz modes; CSS hides .game-tabs above 850px, where the side menu's
 * Games group does this job.
 *
 * Inputs: the current game's key from game-catalog and an optional
 * `onBeforeNavigate` (the Pinyin page stops its player before switching mode,
 * because that page stays mounted). No state: picking a pill navigates to the
 * game's own route — Pinyin games keep their `mode` in URL search — so each
 * game keeps its own URL filters and preserved round, and history restores it.
 */
export function GameTabs({ current, onBeforeNavigate }: { current: GameKey; onBeforeNavigate?: () => void }) {
  const navigate = useNavigate();
  const pills = useActivePill(current);
  return <Tabs value={current} onValueChange={value => {
    const game = ALL_GAMES.find(g => g.key === value);
    if (!game || game.key === current) return;
    onBeforeNavigate?.();
    void (game.mode ? navigate({ to: '/pinyin', search: { mode: game.mode } }) : navigate({ to: game.to }));
  }} className="catalog-tabs game-tabs">
    <TabsList ref={pills} aria-label="Games" className="page-pills">{ALL_GAMES.map(g => <TabsTrigger key={g.key} value={g.key}>{g.label}</TabsTrigger>)}</TabsList>
  </Tabs>;
}

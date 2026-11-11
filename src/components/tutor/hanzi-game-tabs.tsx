import { useNavigate } from '@tanstack/react-router';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HANZI_GAMES } from './game-catalog';

/**
 * Flashcards | Drawing game switch shown at the top of both Hanzi game pages on
 * phones only (CSS hides .hanzi-game-tabs above 850px, where the side menu's
 * sub-items do this job). Input: the current game's key from game-catalog. It
 * holds no state; picking a tab navigates to that game's own route, so each
 * game keeps its own URL filters and its preserved round.
 */
export function HanziGameTabs({ current }: { current: 'flashcards' | 'drawing' }) {
  const navigate = useNavigate();
  return <Tabs value={current} onValueChange={value => { const game = HANZI_GAMES.find(g => g.key === value); if (game && game.key !== current) void navigate({ to: game.to }); }} className="catalog-tabs hanzi-game-tabs">
    <TabsList aria-label="Hanzi games">{HANZI_GAMES.map(g => <TabsTrigger key={g.key} value={g.key}>{g.label}</TabsTrigger>)}</TabsList>
  </Tabs>;
}

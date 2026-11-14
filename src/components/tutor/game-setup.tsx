import { useId, type ReactNode } from 'react';

/**
 * Shared game setup box used by every game (Flashcards, Drawing, Tone quiz, Sound-alikes,
 * Type what you hear), so all setups read in one order:
 *   "What to practise" (filters: which records feed the next round)
 *   "How" (round options: direction, deck size, switches)
 *   footer: a plain summary on the left, the start action on the right.
 * Inputs: `filters` (usually a DraftFilterForm with showCount off, since `summary` carries the
 * count), `children` (round options), `summary` (text/nodes) and `action` (the start button;
 * omitted while a Pinyin question is open). Owns no game state: children keep their own
 * draft/session state, so applying filters still only changes the next pool.
 */
export function GameSetup({ filters, children, summary, action }: { filters: ReactNode; children: ReactNode; summary?: ReactNode; action?: ReactNode }) {
  const id = useId();
  return <section className="game-setup" aria-label="Game setup">
    <div className="game-setup-group" role="group" aria-labelledby={`${id}-what`}>
      <h2 className="game-setup-label" id={`${id}-what`}>What to practise</h2>
      {filters}
    </div>
    <div className="game-setup-group" role="group" aria-labelledby={`${id}-how`}>
      <h2 className="game-setup-label" id={`${id}-how`}>How</h2>
      <div className="game-options">{children}</div>
    </div>
    {(summary || action) && <div className="game-setup-footer">
      <span className="game-setup-summary" aria-live="polite">{summary}</span>
      {action && <div className="flash-start">{action}</div>}
    </div>}
  </section>;
}

/** Plain "x of y cards" summary for the card games; never claims cards when the pool is empty. */
export function deckSummary(roundSize: number, poolSize: number) {
  if (!poolSize) return 'No cards match';
  return `${roundSize.toLocaleString('en-US')} of ${poolSize.toLocaleString('en-US')} ${poolSize === 1 ? 'card' : 'cards'}`;
}

/** Card games' note under the setup: only loading or an empty selection; no "ready" banner. */
export function GameReady({ available, loading = false }: { available: boolean; loading?: boolean }) {
  if (available && !loading) return null;
  return <section className="game-ready" role="status"><h2>{loading ? 'Loading the library…' : available ? 'Ready when you are.' : 'No cards in this selection.'}</h2></section>;
}

import { useId, type ReactNode } from 'react';

/** Shared settings and feedback layout for all five games. Filters and round controls
 * keep their own URL/session state; count, recorded preview, selection and Start share
 * a feedback column that stacks below settings when the available width is limited. */
export function GameSetup({ filters, children, summary, action, matchCount, unit = 'cards', preview, selection }: { filters: ReactNode; children: ReactNode; summary?: ReactNode; action?: ReactNode; matchCount?: number; unit?: string; preview?: ReactNode; selection?: ReactNode }) {
  const id = useId();
  return <section className="game-setup" aria-label="Game setup">
    <div className="game-setup-settings">
    <div className="game-setup-group" role="group" aria-labelledby={`${id}-what`}>
      <h2 className="game-setup-label" id={`${id}-what`}>What to practise</h2>
      {filters}
    </div>
    <div className="game-setup-group" role="group" aria-labelledby={`${id}-how`}>
      <h2 className="game-setup-label" id={`${id}-how`}>How</h2>
      <div className="game-options">{children}</div>
    </div>
    </div>
    <aside className="game-setup-feedback" aria-label="Selected pool">
      {preview && <div className="game-setup-preview" aria-label="Preview">{preview}</div>}
      {matchCount !== undefined && <div className="game-match-count" aria-live="polite"><strong>{matchCount.toLocaleString('en-US')}</strong><span>{unit} match your selection</span></div>}
      {selection && <p className="game-selection-summary">{selection}</p>}
    {(summary || action) && <div className="game-setup-footer">
      <span className="game-setup-summary" aria-live="polite">{summary}</span>
      {action && <div className="flash-start">{action}</div>}
    </div>}
    </aside>
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

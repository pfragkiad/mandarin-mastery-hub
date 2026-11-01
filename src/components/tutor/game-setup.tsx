import type { ReactNode } from 'react';

/** Shared unframed setup: filters above independent next-round options.
 * Children own their draft/session state; this layout owns no game state. */
export function GameSetup({ filters, children }: { filters: ReactNode; children: ReactNode }) {
  return <section className="game-setup" aria-label="Game setup">{filters}<div className="game-options">{children}</div></section>;
}

/** Both games share a quiet ready state without duplicating matched totals. */
export function GameReady({ available, loading = false }: { available: boolean; loading?: boolean }) {
  return <section className="game-ready" role="status"><h2>{loading ? 'Loading the library…' : available ? 'Ready when you are.' : 'No cards in this selection.'}</h2></section>;
}
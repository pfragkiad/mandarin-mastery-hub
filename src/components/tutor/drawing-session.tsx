import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { DrawingCard, DrawingResult } from '@/lib/drawing-game';

export type DrawingBoardSnapshot = { result: DrawingResult; mistakes: number; progress: { completed: number; total: number }; guide: boolean };
/** A running drawing round: deck, answers so far, the restored board, plus the early End,
 * unticked review cards, the play bar's settings summary and whether it replays missed cards. */
type DrawingSession = { deckSize: number | 'all'; deck: DrawingCard[] | null; answers: { entry: DrawingCard; result: DrawingResult }[]; round: number; board?: DrawingBoardSnapshot | undefined; ended?: boolean; skipped?: string[]; label?: string; isReview?: boolean };
const empty: DrawingSession = { deckSize: 10, deck: null, answers: [], round: 0 };
const Context = createContext<[DrawingSession, Dispatch<SetStateAction<DrawingSession>>] | null>(null);

/** Root-owned, session-only round survives route changes without storing records
 * in browser storage or sharing mutable state between server requests. */
export function DrawingSessionProvider({ children }: { children: ReactNode }) {
  const session = useState<DrawingSession>(empty);
  return <Context.Provider value={session}>{children}</Context.Provider>;
}

/** Standalone component tests get isolated local state; the app uses root state. */
export function useDrawingSession() {
  const shared = useContext(Context);
  const local = useState<DrawingSession>(empty);
  return shared ?? local;
}
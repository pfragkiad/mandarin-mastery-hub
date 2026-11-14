// Shared play/results chrome for every game (Flashcards, Drawing game, Tone quiz,
// Sound-alikes, Type what you hear), so all rounds look and behave the same:
//  - GamePlayBar: while a round runs the setup card collapses into one line — a settings
//    chip (the round's summary; clicking it reopens the setup below, changes apply to the
//    next round), Restart and End. End asks inline ("End now? Yes, end / Keep going") once
//    at least one answer has been given; before that it ends straight away.
//  - useRoundEnd: the End/confirm state plus the Esc shortcut (Esc ends, Esc again keeps going).
//  - GameResults + MissedTick: the results card — score, answered line, the missed list with
//    a tick per record (untick to leave it out of the next round) and the next-round actions.
// Owns no round data: each game keeps its own deck/answers and passes callbacks in.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

/**
 * End/confirm state for a running round. `answered` decides whether End needs confirming;
 * `onFinish` shows results with the answers so far, `onQuit` returns to the setup.
 * Esc is handled here (also inside text fields) only while `active`.
 */
export function useRoundEnd({ active, answered, onFinish, onQuit }: { active: boolean; answered: number; onFinish: () => void; onQuit: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const requestEnd = () => { if (answered === 0) { setConfirming(false); onQuit(); } else setConfirming(true); };
  const confirmEnd = () => { setConfirming(false); onFinish(); };
  const keepGoing = () => setConfirming(false);
  useEffect(() => { if (!active) setConfirming(false); }, [active]);
  const latest = useRef({ active, confirming, requestEnd });
  latest.current = { active, confirming, requestEnd };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.metaKey || event.ctrlKey || event.altKey) return;
      const { active: on, confirming: asking, requestEnd: end } = latest.current;
      if (!on || event.defaultPrevented) return;
      event.preventDefault();
      if (asking) setConfirming(false); else end();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return { confirming, requestEnd, confirmEnd, keepGoing };
}
export type RoundEnd = ReturnType<typeof useRoundEnd>;

/** One-line bar shown instead of the setup while playing. `summary` is the chip text. */
export function GamePlayBar({ summary, settingsOpen, onToggleSettings, onRestart, restartDisabled, restartLabel = 'Restart', end }: {
  summary: ReactNode; settingsOpen: boolean; onToggleSettings: () => void; onRestart: () => void; restartDisabled?: boolean; restartLabel?: string; end: RoundEnd;
}) {
  return <div className="game-play-bar">
    <button type="button" className="game-play-chip" aria-expanded={settingsOpen} onClick={onToggleSettings} title="Change settings for the next round">
      <SlidersHorizontal />{summary}
    </button>
    <div className="game-play-actions">
      <Button variant="outline" onClick={onRestart} disabled={restartDisabled}><RotateCcw />{restartLabel}</Button>
      {end.confirming ? <span className="game-play-confirm" role="group" aria-label="End this round?">
        <span>End now?</span>
        <Button variant="outline" className="game-play-end-yes" onClick={end.confirmEnd} autoFocus>Yes, end</Button>
        <Button variant="outline" onClick={end.keepGoing}>Keep going</Button>
      </span> : <Button variant="ghost" onClick={end.requestEnd}><X />End</Button>}
    </div>
  </div>;
}

/**
 * Results card. `score`/`total`/`unit` make the big "7 / 10 known" line, `sub` the answered
 * line; `listTitle` + `children` (MissedTick rows) form the missed list, shown only when
 * `children` has rows; `empty` replaces it otherwise. `actions` are the next-round buttons.
 */
export function GameResults({ eyebrow, score, total, unit, sub, listTitle, listKind, children, hasList, empty, extra, actions, note }: {
  eyebrow: string; score: number; total: number; unit: string; sub: ReactNode; listTitle: string; listKind: 'sounds' | 'cards' | 'drawn';
  children?: ReactNode; hasList: boolean; empty?: ReactNode; extra?: ReactNode; actions: ReactNode; note?: ReactNode;
}) {
  return <section className="game-results" aria-label="Results">
    <div className="game-results-eyebrow">{eyebrow}</div>
    <p className="game-results-score"><strong>{score} / {total}</strong> {unit}</p>
    <p className="game-results-sub">{sub}</p>
    {hasList ? <>
      <div className="game-results-head"><span>{listTitle}</span><small>Untick any you want to skip</small></div>
      <ul className={`game-missed is-${listKind}`} aria-label={listTitle}>{children}</ul>
    </> : empty && <p className="game-results-perfect">{empty}</p>}
    {extra}
    <div className="game-results-actions">{actions}</div>
    {note && <p className="game-results-note">{note}</p>}
  </section>;
}

/** One missed-list row: the tick (kept for the next round unless unticked) and its cells. */
export function MissedTick({ label, kept, onToggle, children }: { label: string; kept: boolean; onToggle: () => void; children: ReactNode }) {
  return <li className={kept ? '' : 'is-skipped'}>
    <Checkbox checked={kept} onCheckedChange={onToggle} aria-label={`Keep ${label} for the next round`} />
    {children}
  </li>;
}

/** Status pill on a drawing review row: why the card is there (passed, or drawn with hints). */
export function ReviewReason({ reason }: { reason: 'passed' | 'guided' }) {
  return <span className={`game-missed-reason is-${reason}`}>{reason === 'passed' ? 'Passed' : 'Needed hints'}</span>;
}

/** Toggle one id in an unticked ("skipped") list. */
export const toggleSkipped = (skipped: readonly string[], id: string) => skipped.includes(id) ? skipped.filter(s => s !== id) : [...skipped, id];

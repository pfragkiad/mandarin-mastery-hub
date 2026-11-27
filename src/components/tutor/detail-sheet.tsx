import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NavigationShortcuts } from './navigation-shortcuts';
import { detailTrail, historyEntry, historyPosition, visitAt, type TrailStep } from '@/lib/detail-trail';

/** How long a form switch may hold the previous content height (see DetailSheet). */
const HOLD_MS = 1500;

/** True below the width where the library's side detail column stacks under the cards. */
export function useNarrowLibrary(maxWidth = 850) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const update = () => setNarrow(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [maxWidth]);
  return narrow;
}

/**
 * Where Close goes (pure, so the rule is testable):
 * - the newest trail step that is not this card's own form switch (襾 → 西 steps are
 *   skipped, so switching forms never makes Close walk back through them): the previous,
 *   different card, or the page that recorded itself before opening the window (lesson,
 *   Hanzi finder, Practice, Flashcards, Sound chart);
 * - otherwise the entry just before the window opened, when it shows another page (Start,
 *   a game, search from another page);
 * - otherwise null: the window was opened from its own grid (or a fresh tab), so Close
 *   returns to the grid as before.
 * A step counts only when it lies inside this window's history (at or after the entry
 * before it opened) and that entry still holds the same key, so a stale step left by an
 * earlier visit never sends Close somewhere else.
 */
export function closeTarget(trail: TrailStep[], openedAt: number | null, current: number | undefined, pathname: string): { index: number; label: string | null } | null {
  if (openedAt === null || current === undefined) return null;
  for (let i = trail.length - 1; i >= 0; i -= 1) {
    const step = trail[i]!;
    if (step.sameCard) continue;
    const live = step.index !== undefined && step.index >= openedAt - 1 && step.index < current && (step.key === undefined || visitAt(step.index)?.key === undefined || visitAt(step.index)?.key === step.key);
    if (live) return { index: step.index!, label: step.label };
    break;
  }
  const before = visitAt(openedAt - 1);
  return before && before.pathname !== pathname && openedAt - 1 < current ? { index: openedAt - 1, label: null } : null;
}

/**
 * Modal top-centred reference with a stationary bar:
 * - Back (only after following a link inside the window) returns to the previous details,
 *   stepping over this card's own form switches exactly like Close, so switching forms
 *   never changes where Back lands;
 * - "‹ 12 of 103 ›" steps to neighbour cards in the grid (not history) and resets Back;
 *   offered only when the window was opened from its grid (closeTarget null);
 * - Close behaves like Back to the page the window came from (closeTarget), except that
 *   form switches on the same card are stepped over; opened from the grid it returns to
 *   the grid and focuses this record's card, resetting Back.
 * Inputs: `label` (short glyph shown on Back for the next window), `position`/`total`
 * in the browsed list (position < 0 hides the grid arrows: record not in the list), and
 * `neighbourLabel`, what the middle arrows step through ("card", "tone pair"), so their
 * tooltip never names the wrong thing on a page whose grid holds pairs rather than records.
 * State: `openedAt`, the history index of the entry where this window first appeared.
 */
export function DetailSheet({ open, title, label, position = -1, total = 0, neighbourLabel = 'card', onClose, onPrevious, onNext, children }: {
  open: boolean; title: string; label?: string; position?: number; total?: number; neighbourLabel?: string; onClose: () => void; onPrevious?: (() => void) | undefined; onNext?: (() => void) | undefined; children: ReactNode;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const trail = useSyncExternalStore(detailTrail.subscribe, detailTrail.get, detailTrail.get);
  // Back's target is the newest step that is not this card's own form switch: a form
  // switch only changes the shown form, so Back must land where Close would.
  const back = [...trail].reverse().find(step => !step.sameCard);
  // Reset the panel's scroll for a different record (below); also drop a Back step
  // once history has returned to it (our Back button or the browser's). Steps are
  // keyed by history entry, not URL: switching 亻 → 人 → 亻 by links is a new entry
  // for 亻 and must keep Back, not be mistaken for a return.
  // A form switch (simplified ↔ traditional, radical variants) is the same card: the reader
  // keeps their place. The click records the panel's scroll and content height; the new form
  // remounts its details, which are briefly shorter (notes and breakdowns load after mount),
  // so before paint the content is pinned to the old height and the scroll put back. The pin
  // lifts once the new content is at least as tall, or after HOLD_MS for a shorter form.
  // Stamped with the click time, so a click that never changed the card cannot affect a
  // much later, different card.
  const content = useRef<HTMLDivElement>(null);
  const formSwitch = useRef<{ at: number; top: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const kept = formSwitch.current; formSwitch.current = null;
    const panel = body.current, inner = content.current;
    if (!kept || Date.now() - kept.at > 3000 || !panel || !inner) { panel?.scrollTo?.({ top: 0 }); return; }
    inner.style.minHeight = `${kept.height}px`;
    panel.scrollTop = kept.top;
    const release = () => { inner.style.minHeight = ''; observer?.disconnect(); clearTimeout(timer); };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      if (inner.firstElementChild instanceof HTMLElement && inner.firstElementChild.offsetHeight >= kept.height - 1) release();
    });
    if (inner.firstElementChild) observer?.observe(inner.firstElementChild);
    const timer = setTimeout(release, HOLD_MS);
    return release;
  }, [title]);
  useEffect(() => { detailTrail.sync(historyEntry()); }, [title]);
  // Read after mount (history is browser-only); the window keeps it while it stays open,
  // through form switches, neighbour steps and links to other cards in the same library.
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  useEffect(() => { setOpenedAt(historyPosition().index ?? null); }, []);
  const current = openedAt === null ? undefined : historyPosition().index;
  const target = closeTarget(trail, openedAt, current, typeof window === 'undefined' ? '' : window.location.pathname);
  const close = () => {
    // Recomputed at click time from the live history entry, never a stale render.
    const now = historyPosition().index;
    const goal = closeTarget(detailTrail.get(), openedAt, now, window.location.pathname);
    if (goal && now !== undefined) { window.history.go(goal.index - now); return; }
    detailTrail.clear(); onClose();
  };
  const goBack = () => {
    // Recomputed at click time: jump straight to the target entry so the same-card
    // form-switch entries after it are skipped, never walked through one by one.
    const now = historyPosition().index;
    const step = [...detailTrail.get()].reverse().find(s => !s.sameCard);
    if (step?.index !== undefined && now !== undefined && step.index < now) { window.history.go(step.index - now); return; }
    window.history.back();
  };
  const fromGrid = !target;
  const step = (go?: () => void) => fromGrid && go ? () => { detailTrail.clear(); go(); } : undefined;
  const previous = step(onPrevious), next = step(onNext);
  const inList = fromGrid && position >= 0 && total > 0;
  const closeLabel = target ? `Close and return to ${target.label ?? 'the previous page'}` : 'Close and show card in list';
  return <Dialog modal open={open} onOpenChange={value => { if (!value) close(); }}>
    <DialogPortal><DialogOverlay/><DialogPrimitive.Content className="detail-sheet"
      onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
      onCloseAutoFocus={event => { event.preventDefault(); if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true }); }}
      // A click on the dimmed backdrop closes the window (via onOpenChange).
      // Clicks inside portaled popovers/dropdowns that belong to this window
      // (hint cards, source notes, reveal menus) or on a toast must not.
      onInteractOutside={event => {
        if (event.target instanceof Element && event.target.closest('[data-radix-popper-content-wrapper], [data-sonner-toaster]')) event.preventDefault();
      }}
      onKeyDown={event => {
        // Reuse button callbacks, but leave editing, widget navigation and
        // modified/browser shortcuts to the control that owns those keystrokes.
        if (!open || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"], [role="slider"], [role="combobox"], [role="radio"], [role="tab"]')) return;
        const navigate = event.key === 'ArrowLeft' ? previous : event.key === 'ArrowRight' ? next : undefined;
        if (!navigate) return;
        event.preventDefault();
        navigate();
      }}>
      <DialogTitle className="sr-only">{title}</DialogTitle>
      <DialogDescription className="sr-only">Record details</DialogDescription>
      <div className="detail-sheet-bar">
        <div className="detail-sheet-start">
          {back && <Button variant="ghost" size="sm" className="detail-sheet-back" title={`Back to ${back.label}`} aria-label={`Back to ${back.label}`} onClick={goBack}><ArrowLeft/><span>{back.label}</span></Button>}
        </div>
        {inList && <div className="detail-sheet-nav" role="group" aria-label={`Neighbouring ${neighbourLabel}s in this list`}>
          <Button variant="ghost" size="icon" aria-label={`Previous ${neighbourLabel} in this list`} title={`Previous ${neighbourLabel} in this list`} disabled={!previous} onClick={previous}><ChevronLeft/></Button>
          <span className="detail-sheet-position">{(position + 1).toLocaleString('en-US')} of {total.toLocaleString('en-US')}</span>
          <Button variant="ghost" size="icon" aria-label={`Next ${neighbourLabel} in this list`} title={`Next ${neighbourLabel} in this list`} disabled={!next} onClick={next}><ChevronRight/></Button>
        </div>}
        <div className="detail-sheet-end">
          {inList && <NavigationShortcuts context="records"/>}
          <Button variant="ghost" size="icon" className="close-x" aria-label={closeLabel} title={closeLabel} onClick={close}><X/></Button>
        </div>
      </div>
      {/* A link followed inside the window remembers this record for Back. */}
      <div ref={body} className="detail-sheet-body" onClickCapture={event => {
        const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
        if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        // A link to the page already shown (the selected form tile) adds no history entry.
        if ((link as HTMLAnchorElement).href === window.location.href) return;
        // The card's own form switch keeps the same card: Close steps over that entry
        // and the panel keeps its scroll position.
        // Related tiles change the displayed exact record, not the navigation destination.
        // Limit this to tiles: source/spelling-note links still navigate normally.
        const sameCard = Boolean(link.closest('.form-switch, .related-forms .related-form-choice'));
        if (sameCard) formSwitch.current = { at: Date.now(), top: event.currentTarget.scrollTop, height: content.current?.offsetHeight ?? 0 };
        detailTrail.push({ label: label ?? title, href: historyEntry(), ...(sameCard ? { sameCard: true } : {}) });
      }}><div ref={content}>{children}</div>
      </div>
    </DialogPrimitive.Content></DialogPortal>
  </Dialog>;
}

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NavigationShortcuts } from './navigation-shortcuts';
import { detailTrail } from '@/lib/detail-trail';

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
 * Modal top-centred reference with a stationary bar:
 * - Back (only after following a link inside the window) returns to the previous details;
 * - "‹ 12 of 103 ›" steps to neighbour cards in the grid (not history) and resets Back;
 * - Close returns to the grid and focuses this record's card, resetting Back.
 * Inputs: `label` (short glyph shown on Back for the next window), `position`/`total`
 * in the browsed list (position < 0 hides the grid arrows: record not in the list).
 */
export function DetailSheet({ open, title, label, position = -1, total = 0, onClose, onPrevious, onNext, children }: {
  open: boolean; title: string; label?: string; position?: number; total?: number; onClose: () => void; onPrevious?: (() => void) | undefined; onNext?: (() => void) | undefined; children: ReactNode;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const trail = useSyncExternalStore(detailTrail.subscribe, detailTrail.get, detailTrail.get);
  const back = trail.at(-1);
  // Reset only the panel's scroll for a different record; also drop a Back step
  // once history has returned to it (our Back button or the browser's).
  useEffect(() => { body.current?.scrollTo?.({ top: 0 }); detailTrail.sync(window.location.href); }, [title]);
  const close = () => { detailTrail.clear(); onClose(); };
  const step = (go?: () => void) => go && (() => { detailTrail.clear(); go(); });
  const previous = step(onPrevious), next = step(onNext);
  const inList = position >= 0 && total > 0;
  return <Dialog modal open={open} onOpenChange={value => { if (!value) close(); }}>
    <DialogPortal><DialogOverlay/><DialogPrimitive.Content className="detail-sheet"
      onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
      onCloseAutoFocus={event => { event.preventDefault(); if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true }); }}
      onInteractOutside={event => event.preventDefault()}
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
          {back && <Button variant="ghost" size="sm" className="detail-sheet-back" title={`Back to ${back.label}`} aria-label={`Back to ${back.label}`} onClick={() => window.history.back()}><ArrowLeft/><span lang="zh">{back.label}</span></Button>}
        </div>
        {inList && <div className="detail-sheet-nav" role="group" aria-label="Neighbouring cards in this list">
          <Button variant="ghost" size="icon" aria-label="Previous card in this list" title="Previous card in this list" disabled={!previous} onClick={previous}><ChevronLeft/></Button>
          <span className="detail-sheet-position">{(position + 1).toLocaleString('en-US')} of {total.toLocaleString('en-US')}</span>
          <Button variant="ghost" size="icon" aria-label="Next card in this list" title="Next card in this list" disabled={!next} onClick={next}><ChevronRight/></Button>
        </div>}
        <div className="detail-sheet-end">
          {inList && <NavigationShortcuts context="records"/>}
          <Button variant="ghost" size="icon" aria-label="Close and show card in list" title="Close and show card in list" onClick={close}><X/></Button>
        </div>
      </div>
      {/* A link followed inside the window remembers this record for Back. */}
      <div ref={body} className="detail-sheet-body" onClickCapture={event => {
        const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
        if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        detailTrail.push({ label: label ?? title, href: window.location.href });
      }}>{children}</div>
    </DialogPrimitive.Content></DialogPortal>
  </Dialog>;
}

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NavigationShortcuts } from './navigation-shortcuts';

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

/** Modal top-centred reference with a stationary navigation bar. */
export function DetailSheet({ open, title, onClose, onPrevious, onNext, children }: {
  open: boolean; title: string; onClose: () => void; onPrevious?: (() => void) | undefined; onNext?: (() => void) | undefined; children: ReactNode;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  const body = useRef<HTMLDivElement>(null);
  // Reset only the panel's scroll for a different record; closing should restore
  // focus without moving the library list behind the modal.
  useEffect(() => { body.current?.scrollTo?.({ top: 0 }); }, [title]);
  return <Dialog modal open={open} onOpenChange={next => { if (!next) onClose(); }}>
    <DialogPortal><DialogOverlay/><DialogPrimitive.Content className="detail-sheet"
      onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
      onCloseAutoFocus={event => { event.preventDefault(); if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true }); }}
      onInteractOutside={event => event.preventDefault()}
      onKeyDown={event => {
        // Reuse button callbacks, but leave editing, widget navigation and
        // modified/browser shortcuts to the control that owns those keystrokes.
        if (!open || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"], [role="slider"], [role="combobox"], [role="radio"], [role="tab"]')) return;
        const navigate = event.key === 'ArrowLeft' ? onPrevious : event.key === 'ArrowRight' ? onNext : undefined;
        if (!navigate) return;
        event.preventDefault();
        navigate();
      }}>
      <DialogTitle className="sr-only">{title}</DialogTitle>
      <DialogDescription className="sr-only">Record details</DialogDescription>
      <div className="detail-sheet-bar">
        <div className="detail-sheet-nav">
          <Button variant="ghost" size="icon" aria-label="Previous record" disabled={!onPrevious} onClick={onPrevious}><ChevronLeft/></Button>
          <Button variant="ghost" size="icon" aria-label="Next record" disabled={!onNext} onClick={onNext}><ChevronRight/></Button>
          <NavigationShortcuts context="records"/>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close details" onClick={onClose}><X/></Button>
      </div>
      <div ref={body} className="detail-sheet-body">{children}</div>
    </DialogPrimitive.Content></DialogPortal>
  </Dialog>;
}

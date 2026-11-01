import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
  useEffect(() => { body.current?.scrollTo?.({ top: 0 }); }, [title]);
  return <Dialog modal open={open} onOpenChange={next => { if (!next) onClose(); }}>
    <DialogPortal><DialogOverlay/><DialogPrimitive.Content className="detail-sheet"
      onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
      onCloseAutoFocus={event => { event.preventDefault(); if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true }); }}
      onInteractOutside={event => event.preventDefault()}>
      <DialogTitle className="sr-only">{title}</DialogTitle>
      <DialogDescription className="sr-only">Record details</DialogDescription>
      <div className="detail-sheet-bar">
        <div className="detail-sheet-nav">
          <Button variant="ghost" size="icon" aria-label="Previous record" disabled={!onPrevious} onClick={onPrevious}><ChevronLeft/></Button>
          <Button variant="ghost" size="icon" aria-label="Next record" disabled={!onNext} onClick={onNext}><ChevronRight/></Button>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close details" onClick={onClose}><X/></Button>
      </div>
      <div ref={body} className="detail-sheet-body">{children}</div>
    </DialogPrimitive.Content></DialogPortal>
  </Dialog>;
}

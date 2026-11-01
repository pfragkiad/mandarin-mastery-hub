import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogPortal, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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

/** Nonmodal centred reference: the card list remains clickable and scrollable. */
export function DetailSheet({ open, title, onClose, onPrevious, onNext, children }: {
  open: boolean; title: string; onClose: () => void; onPrevious?: (() => void) | undefined; onNext?: (() => void) | undefined; children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; startY: number; distance: number } | null>(null);
  const suppressClick = useRef(false);
  const resetDrag = () => {
    drag.current = null;
    panel.current?.style.removeProperty('transform');
    panel.current?.classList.remove('detail-sheet-dragging');
  };
  useEffect(() => { resetDrag(); }, [open]);
  useEffect(() => { body.current?.scrollTo?.({ top: 0 }); }, [title]);
  return <Dialog modal={false} open={open} onOpenChange={next => { if (!next) onClose(); }}>
    <DialogPortal><DialogPrimitive.Content ref={panel} className="detail-sheet"
      onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
      onCloseAutoFocus={event => { event.preventDefault(); if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true }); }}
      onInteractOutside={event => event.preventDefault()}>
      <DialogTitle className="sr-only">{title}</DialogTitle>
      <DialogDescription className="sr-only">Record details</DialogDescription>
      <div className="detail-sheet-bar">
        <Button variant="ghost" className="detail-sheet-handle" aria-label="Close details using handle" title="Close details"
          onPointerDown={event => {
            if (!event.isPrimary || event.button !== 0) return;
            suppressClick.current = false;
            drag.current = { pointerId: event.pointerId, startY: event.clientY, distance: 0 };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={event => {
            const current = drag.current;
            if (!current || current.pointerId !== event.pointerId) return;
            current.distance = event.clientY - current.startY;
            if (Math.abs(current.distance) > 8) suppressClick.current = true;
            if (suppressClick.current) {
              panel.current?.classList.add('detail-sheet-dragging');
              panel.current?.style.setProperty('transform', `translate(-50%, calc(-50% + ${Math.max(0, current.distance)}px))`);
            }
          }}
          onPointerUp={event => {
            const current = drag.current;
            if (!current || current.pointerId !== event.pointerId) return;
            const dismiss = current.distance >= 60;
            resetDrag();
            if (dismiss) onClose();
          }}
          onPointerCancel={() => { suppressClick.current = true; resetDrag(); }}
          onLostPointerCapture={resetDrag}
          onClick={event => {
            if (event.detail === 0 || !suppressClick.current) onClose();
            suppressClick.current = false;
          }}
        ><span aria-hidden="true"/></Button>
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

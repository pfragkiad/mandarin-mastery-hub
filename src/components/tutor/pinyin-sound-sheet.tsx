// Small-screen (≤850px) home of the Sound chart's selected-syllable card: the same modal,
// top-anchored window as the Glyphs/Vocabulary details (shared .detail-sheet styles), so
// the card's top edge never moves when a tone adds or removes its "In a character" list —
// only its bottom grows, and the body scrolls on its own.
// Inputs: `open`, the syllable `title`, the card's Back step (`back`, from soundTrail) with
// `onBack`, the syllable's `position`/`total` among the cards the grid currently shows
// (position < 0 hides the arrows), `onPrevious`/`onNext`, `onClose` and `onClosed` (runs
// after the window has gone so the chart can focus the syllable's grid card).
// Left/Right keys step like the arrow buttons, except inside editable controls or with
// modifier keys, exactly like DetailSheet.
import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function PinyinSoundSheet({ open, title, back, position, total, onBack, onPrevious, onNext, onClose, onClosed, children }: {
  open: boolean; title: string; back?: { label: string; lang?: string | undefined } | undefined; position: number; total: number;
  onBack: () => void; onPrevious?: (() => void) | undefined; onNext?: (() => void) | undefined; onClose: () => void; onClosed: () => void; children: ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null);
  // A different syllable starts at the top of the window; tone changes keep the scroll.
  useEffect(() => { body.current?.scrollTo?.({ top: 0 }); }, [title]);
  const inList = position >= 0 && total > 0;
  return <Dialog modal open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <DialogPortal><DialogOverlay/><DialogPrimitive.Content className="detail-sheet pinyin-sound-sheet"
      onCloseAutoFocus={event => { event.preventDefault(); onClosed(); }}
      // A click on the dimmed backdrop closes the window (via onOpenChange);
      // clicks inside portaled popovers or on a toast must not.
      onInteractOutside={event => {
        if (event.target instanceof Element && event.target.closest('[data-radix-popper-content-wrapper], [data-sonner-toaster]')) event.preventDefault();
      }}
      onKeyDown={event => {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"], [role="slider"], [role="switch"]')) return;
        const go = event.key === 'ArrowLeft' ? onPrevious : event.key === 'ArrowRight' ? onNext : undefined;
        if (!go) return;
        event.preventDefault();
        go();
      }}>
      <DialogTitle className="sr-only">{title}</DialogTitle>
      <DialogDescription className="sr-only">Selected sound</DialogDescription>
      <div className="detail-sheet-bar">
        <div className="detail-sheet-start">
          {back && <Button variant="ghost" size="sm" className="detail-sheet-back" title={`Back to ${back.label}`} aria-label={`Back to ${back.label}`} onClick={onBack}><ArrowLeft/><span lang={back.lang ?? 'zh-Latn-pinyin'}>{back.label}</span></Button>}
        </div>
        {inList && <div className="detail-sheet-nav" role="group" aria-label="Neighbouring syllables in the chart">
          <Button variant="ghost" size="icon" aria-label="Previous syllable" title="Previous syllable" disabled={!onPrevious} onClick={onPrevious}><ChevronLeft/></Button>
          <span className="detail-sheet-position">{(position + 1).toLocaleString('en-US')} of {total.toLocaleString('en-US')}</span>
          <Button variant="ghost" size="icon" aria-label="Next syllable" title="Next syllable" disabled={!onNext} onClick={onNext}><ChevronRight/></Button>
        </div>}
        <div className="detail-sheet-end">
          <Button variant="ghost" size="icon" className="close-x" aria-label="Close and show the syllable in the chart" title="Close" onClick={onClose}><X/></Button>
        </div>
      </div>
      <div ref={body} className="detail-sheet-body">{children}</div>
    </DialogPrimitive.Content></DialogPortal>
  </Dialog>;
}

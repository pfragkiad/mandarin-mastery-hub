import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
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

/** Bottom sheet holding a record's detail on small screens, with previous/next stepping. */
export function DetailSheet({ open, title, onClose, onPrevious, onNext, children }: {
  open: boolean; title: string; onClose: () => void; onPrevious?: (() => void) | undefined; onNext?: (() => void) | undefined; children: ReactNode;
}) {
  return <Sheet open={open} onOpenChange={next => { if (!next) onClose(); }}>
    <SheetContent side="bottom" className="detail-sheet [&>button.absolute]:hidden">
      <SheetTitle className="sr-only">{title}</SheetTitle>
      <SheetDescription className="sr-only">Record details</SheetDescription>
      <div className="detail-sheet-bar">
        <span className="detail-sheet-handle" aria-hidden="true"/>
        <div className="detail-sheet-nav">
          <Button variant="ghost" size="icon" aria-label="Previous record" disabled={!onPrevious} onClick={onPrevious}><ChevronLeft/></Button>
          <Button variant="ghost" size="icon" aria-label="Next record" disabled={!onNext} onClick={onNext}><ChevronRight/></Button>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close details" onClick={onClose}><X/></Button>
      </div>
      <div className="detail-sheet-body">{children}</div>
    </SheetContent>
  </Sheet>;
}

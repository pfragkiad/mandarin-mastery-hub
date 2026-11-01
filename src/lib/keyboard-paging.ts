import { useEffect } from 'react';

/** Page arrows step once, PageUp/Down jump ten, Home/End reach boundaries.
 * Modal records own their separate navigation; editing and widgets keep their keys. */
export function useKeyboardPaging({ current, pages, onPageChange, disabled = false }: {
  current: number;
  pages: number;
  onPageChange: (page: number) => void;
  /** True while a floating record sheet is open: paging must not steal the keys. */
  disabled?: boolean;
}) {
  useEffect(() => {
    if (pages <= 1 || disabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="combobox"], [role="radio"], [role="tab"], [role="menu"], [role="dialog"]')) return;
      event.preventDefault();
      const delta = event.key === 'PageDown' ? 10 : event.key === 'PageUp' ? -10 : event.key === 'ArrowRight' ? 1 : -1;
      const destination = event.key === 'Home' ? 1 : event.key === 'End' ? pages : current + delta;
      const next = Math.min(pages, Math.max(1, destination));
      if (next !== current) onPageChange(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, pages, onPageChange, disabled]);
}

import { useEffect } from 'react';

/** PageUp/PageDown move the catalog one page, unless a detail sheet is open, the user is typing or using modifiers. */
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
      if (event.key !== 'PageUp' && event.key !== 'PageDown') return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
      event.preventDefault();
      const next = Math.min(pages, Math.max(1, current + (event.key === 'PageDown' ? 1 : -1)));
      if (next !== current) onPageChange(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, pages, onPageChange]);
}

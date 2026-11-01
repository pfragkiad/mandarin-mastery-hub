import { useMemo, useSyncExternalStore, type ReactNode } from 'react';

const painted = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

/** Feedback updates independently of the expensive library/results owner. */
export function useDetailLoading() {
  return useMemo(() => {
    let busy = false;
    let revision = 0;
    const listeners = new Set<() => void>();
    const publish = (value: boolean) => { busy = value; listeners.forEach(listener => listener()); };
    const store = {
      subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
      snapshot: () => busy,
      run: async (id: string, action: () => unknown) => {
        const current = ++revision;
        const cards = [...document.querySelectorAll<HTMLElement>('.library-page .word-card')];
        cards.forEach(card => card.classList.toggle('is-selected', card.dataset.entryId === id));
        const cursor = document.createElement('style');
        cursor.textContent = '* { cursor: wait !important; }';
        document.head.appendChild(cursor);
        publish(true);
        try {
          await painted();
          if (current !== revision) return;
          await action();
          await painted();
        } finally {
          cursor.remove();
          if (current === revision) publish(false);
        }
      },
    };
    return store;
  }, []);
}

export function DetailLoading({ loading, children }: { loading: ReturnType<typeof useDetailLoading>; children: ReactNode }) {
  const busy = useSyncExternalStore(loading.subscribe, loading.snapshot, () => false);
  return <div className={`detail-loading-boundary${busy ? ' is-loading' : ''}`} aria-busy={busy}>
    {children}
    {busy && <section className="catalog-detail detail-loading-placeholder" role="status" aria-label="Loading details"><span className="sr-only">Loading details…</span><div className="detail-loading-line short"/><div className="detail-loading-glyph"/><div className="detail-loading-line"/><div className="detail-loading-line short"/><div className="detail-loading-divider"/><div className="detail-loading-line"/><div className="detail-loading-line"/><div className="detail-loading-line short"/></section>}
  </div>;
}
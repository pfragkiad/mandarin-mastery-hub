import { useMemo, useSyncExternalStore, type ReactNode } from 'react';

const painted = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

/** Feedback updates independently of the expensive library/results owner. */
export function useDetailLoading() {
  return useMemo(() => {
    let busy = false;
    let revision = 0;
    // Newer selections supersede older pending clicks. An older completion must
    // never clear the busy state belonging to the newer navigation.
    const listeners = new Set<() => void>();
    const publish = (value: boolean) => { busy = value; listeners.forEach(listener => listener()); };
    const store = {
      subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
      snapshot: () => busy,
      run: async (id: string, action: () => unknown) => {
        const current = ++revision;
        const cards = [...document.querySelectorAll<HTMLElement>('.library-page .word-card')];
        // Give immediate feedback without rerendering the expensive results owner;
        // the eventual URL-backed selection remains the authoritative state.
        cards.forEach(card => card.classList.toggle('is-selected', card.dataset['entryId'] === id));
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

/**
 * Keeps the current detail visible while the next one loads; the reference
 * content switches as a whole once the new record commits — no placeholder.
 */
export function DetailLoading({ loading, children }: { loading: ReturnType<typeof useDetailLoading>; children: ReactNode }) {
  const busy = useSyncExternalStore(loading.subscribe, loading.snapshot, () => false);
  return <div className="detail-loading-boundary" aria-busy={busy}>{children}</div>;
}

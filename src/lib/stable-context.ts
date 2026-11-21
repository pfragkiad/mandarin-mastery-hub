import { createContext, type Context } from 'react';

/**
 * Hot-reload-stable React context (stable-context.ts).
 *
 * Purpose: a provider and its consumer hook must share the *same* context object. During
 * development, a data change (e.g. a new vocabulary.json) makes Vite re-run a provider module
 * that cannot Fast Refresh; the re-run calls createContext again, and any consumer that picks up
 * the new module reads a context no mounted provider fills — "WorkspaceProvider is required" and
 * a blank page — until a full reload.
 *
 * Inputs: a unique `key` per context and its default value. With HMR active, the first context
 * made under a key is kept on globalThis and reused by later re-runs, so the mounted provider and
 * every refreshed hook keep matching. Without HMR (production and SSR builds) it is a plain
 * createContext, so nothing is shared or retained outside dev.
 */
export function stableContext<T>(key: string, defaultValue: T): Context<T> {
  if (!import.meta.hot) return createContext(defaultValue);
  const store = ((globalThis as { __tutorStableContexts?: Map<string, Context<unknown>> }).__tutorStableContexts ??= new Map());
  const existing = store.get(key) as Context<T> | undefined;
  if (existing) return existing;
  const created = createContext(defaultValue);
  store.set(key, created as Context<unknown>);
  return created;
}

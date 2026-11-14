import { useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * Header section switcher data published by the page that owns it.
 *
 * The header (shell.tsx → section-picker.tsx) knows every page's sections and builds
 * their links itself, from the URL, so its label renders correctly on the first
 * paint. Only two things live in the page: the per-section record counts (the
 * Glyphs catalogue and the Vocabulary list compute them) and an optional
 * `beforeSwitch` hook (the Pinyin quizzes stop their player before leaving). The
 * page publishes them here with usePublishSections; the header reads them with
 * useSectionStats. Browser-safe, no data imports. Counts are keyed by the
 * section key the header uses (e.g. 'Components', 'word').
 */
export type SectionExtra = { count: number; tone: 'traditional' | 'family'; hint: string };
export type SectionStat = { count: number; extras?: SectionExtra[] };
type Published = { stats: Record<string, SectionStat>; beforeSwitch?: () => void };

const EMPTY: Published = { stats: {} };
let snapshot: Published = EMPTY;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** Header side: the counts and hook the current page published (empty when none). */
export function useSectionStats(): Published {
  return useSyncExternalStore(subscribe, () => snapshot, () => EMPTY);
}

/**
 * Page side: publish this page's section counts and/or switch hook while it is
 * mounted. Republishes only when the counts change (compared by value), and keeps
 * the latest `beforeSwitch` behind a stable wrapper so a new closure each render
 * never republishes. Unmounting clears it, unless another page already replaced it.
 */
export function usePublishSections(stats: Record<string, SectionStat> | null, beforeSwitch?: () => void) {
  const hook = useRef(beforeSwitch);
  hook.current = beforeSwitch;
  const hasHook = Boolean(beforeSwitch);
  const key = JSON.stringify(stats ?? {});
  useEffect(() => {
    const mine: Published = { stats: JSON.parse(key) as Record<string, SectionStat>, ...(hasHook ? { beforeSwitch: () => hook.current?.() } : {}) };
    snapshot = mine;
    emit();
    return () => { if (snapshot === mine) { snapshot = EMPTY; emit(); } };
  }, [key, hasHook]);
}

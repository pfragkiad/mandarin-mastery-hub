import { useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { lineCount } from './use-side-fit';
import { splitTopLevel } from '@/lib/vocabulary-meaning';

/**
 * Library-card translation trimming: a translation that would wrap to more than `maxLines`
 * (4+ lines in the unclamped Comfortable list view) drops its last semicolon-separated sense,
 * one at a time, until it fits; the first sense always stays. Display-only — the recorded
 * meaning, the card's title tooltip and the detail card keep every sense.
 *
 * Inputs: `ref` — the card body (`.word-open`), whose translation is `.word-meaning` /
 * `.catalog-entry-meaning`; `text` — the plain meaning string; `maxLines` — the most lines kept.
 * State: how many senses are shown. Returns the text to render.
 *
 * Tricky logic:
 * - Unclamped translations (Comfortable stacked cards) are measured by rendered line count.
 * - Clamped translations (Compact grid's two lines, Comfortable side layout, few-forms' three)
 *   trim when content is taller than the clamp (scrollHeight > clientHeight): the card shows
 *   whole senses up to its line limit instead of cutting the text with an ellipsis.
 * - useSideFit may stack/unstack the body after this hook measured (row sync runs in a
 *   microtask), so a ResizeObserver on the translation re-checks; it only ever trims further,
 *   since trimming itself changes the height. The count resets to every sense only when the card
 *   body's own width changes (a real resize), never on the translation's size, so the two fits
 *   cannot oscillate. Updates from observers use flushSync so no over-long frame is painted.
 */
export function useSenseTrim(ref: RefObject<HTMLElement | null>, text: string, maxLines = 3): string {
  const senses = useMemo(() => splitSenses(text), [text]);
  const [shown, setShown] = useState(senses.length);
  useLayoutEffect(() => { setShown(senses.length); }, [senses]);
  // Each render re-measures; a trim re-renders synchronously before paint until it fits.
  useLayoutEffect(() => {
    const meaning = meaningOf(ref.current);
    if (meaning && shown > 1 && overLimit(meaning, maxLines)) setShown(shown - 1);
  });
  useLayoutEffect(() => {
    const body = ref.current;
    if (!body || typeof ResizeObserver === 'undefined' || senses.length < 2) return;
    let width = body.getBoundingClientRect().width;
    const bodyObserver = new ResizeObserver(() => {
      const next = body.getBoundingClientRect().width;
      if (Math.abs(next - width) < 0.5) return;
      width = next;
      flushSync(() => setShown(senses.length));
    });
    const meaningObserver = new ResizeObserver(() => {
      const meaning = meaningOf(body);
      if (meaning && overLimit(meaning, maxLines)) flushSync(() => setShown(count => Math.max(1, count - 1)));
    });
    bodyObserver.observe(body);
    const meaning = meaningOf(body);
    if (meaning) meaningObserver.observe(meaning);
    return () => { bodyObserver.disconnect(); meaningObserver.disconnect(); };
  }, [ref, senses, maxLines]);
  return senses.length > 1 ? joinSenses(senses.slice(0, Math.max(1, shown))) : text;
}

/** Top-level semicolon senses ("heart; mind; soul"); semicolons inside brackets never split. */
export function splitSenses(text: string): string[] {
  return splitTopLevel(text, /[;；]/);
}

export function joinSenses(senses: string[]): string {
  return senses.join('; ');
}

function meaningOf(body: HTMLElement | null): HTMLElement | null {
  return body?.querySelector<HTMLElement>('.word-meaning, .catalog-entry-meaning') ?? null;
}

function overLimit(meaning: HTMLElement, maxLines: number): boolean {
  const style = getComputedStyle(meaning) as CSSStyleDeclaration & { webkitLineClamp?: string };
  const clamp = style.webkitLineClamp ?? style.getPropertyValue('-webkit-line-clamp');
  if (clamp && clamp !== 'none') {
    // Clamped card: hidden overflow means a trailing sense can drop (the clamp keeps the rest).
    return meaning.scrollHeight > meaning.clientHeight + 1;
  }
  return lineCount(meaning) > maxLines;
}

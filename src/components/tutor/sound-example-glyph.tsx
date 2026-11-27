import type { ReactNode } from 'react';
import { HintChar, useLessonHints, type HintWord } from './lesson-hints';

/** Sound-detail example tile: the shared quick card carries exact character/word
 * navigation. When hints are off, retain the caller's original link or selection. */
export function SoundExampleGlyph({ glyph, word = null, className = '', fallback }: { glyph: string; word?: HintWord | null; className?: string; fallback: ReactNode }) {
  const hints = useLessonHints();
  if (!hints?.enabled) return <>{fallback}</>;
  return <HintChar glyph={glyph} word={word} className={`decomposition-glyph ${className}`.trim()}><strong>{glyph}</strong></HintChar>;
}
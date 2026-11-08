import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { AudioAttachment } from '@/lib/audio';
import type { CharacterScript } from '@/lib/learning-preferences';
import type { LibraryKind } from '@/lib/character-library';

/** One dealt flashcard: an exact vocabulary record or library glyph (ids kept intact). */
export type FlashCard = { id: string; hanzi: string; pinyin: string; meaning: string; libraryKind?: LibraryKind; radicalVariant?: string; radicalHeadingId?: string; script?: CharacterScript; audio?: AudioAttachment | null };

/**
 * Everything a running flashcard round needs to continue exactly where it was:
 * the dealt deck, position, whether the current card is turned over, missed cards,
 * round counters and the round options (front side, deck size, pinyin, repeat).
 */
export type FlashcardSession = {
  direction: 'zh' | 'en'; showFrontPinyin: boolean; deckSize: number | 'all'; repeat: boolean;
  deck: FlashCard[] | null; index: number; flipped: boolean; missed: FlashCard[]; round: number; total: number;
};
const empty: FlashcardSession = { direction: 'zh', showFrontPinyin: false, deckSize: 10, repeat: false, deck: null, index: 0, flipped: false, missed: [], round: 1, total: 0 };
const Context = createContext<[FlashcardSession, Dispatch<SetStateAction<FlashcardSession>>] | null>(null);

/** Root-owned, session-only round: opening a card's details and coming Back resumes
 * the same card (still turned over) without storing records in browser storage. */
export function FlashcardSessionProvider({ children }: { children: ReactNode }) {
  const session = useState<FlashcardSession>(empty);
  return <Context.Provider value={session}>{children}</Context.Provider>;
}

/** Standalone component tests get isolated local state; the app uses root state. */
export function useFlashcardSession() {
  const shared = useContext(Context);
  const local = useState<FlashcardSession>(empty);
  return shared ?? local;
}

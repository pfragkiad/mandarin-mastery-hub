import { AlignLeft, PenTool, Puzzle, Quote, ScrollText, Sprout, Type } from 'lucide-react';
import type { GameIcon } from '@/components/tutor/game-catalog';

/**
 * The library section icons, shared by the sidebar sub-items (shell.tsx) and the
 * Start page random cards (overview-discovery.tsx), so a section's icon never
 * differs between the menu and the cards. No state.
 */
export type SectionName = 'Characters' | 'Components' | 'Radicals' | 'Strokes' | 'Words' | 'Idioms' | 'Phrases';

// `satisfies` keeps every entry's own lucide type (so a caller can pass size/aria-hidden)
// while still requiring one icon per library section.
export const sectionIcons = { Characters: Type, Radicals: Sprout, Components: Puzzle, Strokes: PenTool, Words: AlignLeft, Idioms: ScrollText, Phrases: Quote } satisfies Record<SectionName, GameIcon>;

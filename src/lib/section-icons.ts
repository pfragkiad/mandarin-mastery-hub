import { AlignLeft, PenTool, Puzzle, Quote, Sprout, Type } from 'lucide-react';
import type { GameIcon } from '@/components/tutor/game-catalog';

/**
 * The library section icons, shared by the sidebar sub-items (shell.tsx) and the
 * Start page random cards (overview-discovery.tsx), so a section's icon never
 * differs between the menu and the cards. No state.
 */
export const sectionIcons: Record<string, GameIcon> = { Characters: Type, Radicals: Sprout, Components: Puzzle, Strokes: PenTool, Words: AlignLeft, Phrases: Quote };

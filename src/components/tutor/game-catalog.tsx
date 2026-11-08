import { Activity, Ear, Keyboard, Layers, type LucideIcon } from 'lucide-react';
import { PracticeIcon } from './practice-icons';

/**
 * Nav/Start icon for Hanzi games: the character 字 drawn as an SVG so it sizes and
 * colours like the lucide icons beside it (currentColor, 24×24 viewBox). No state.
 */
export function HanziIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor" aria-hidden="true" {...props}><text x="12" y="19.5" textAnchor="middle" fontSize="20" fontWeight="600" lang="zh-CN">字</text></svg>;
}

/**
 * The five games, in their two families. The sidebar and the Start page both read
 * this list, so a game's name, icon and destination never drift between them.
 * Pinyin games open the Pinyin page in their quiz mode (URL search `mode`).
 */
export type GameEntry = { key: string; label: string; line: string; icon: LucideIcon; to: '/flashcards' | '/drawing' | '/pinyin'; mode?: 'tones' | 'alikes' | 'type' };

export const HANZI_GAMES: GameEntry[] = [
  { key: 'flashcards', label: 'Flashcards', line: 'How much will you remember? A second chance at the ones you miss.', icon: Layers, to: '/flashcards' },
  { key: 'drawing', label: 'Drawing game', line: 'Write characters, radicals and words without the guide.', icon: PracticeIcon, to: '/drawing' },
];

export const PINYIN_GAMES: GameEntry[] = [
  { key: 'tones', label: 'Tone quiz', line: 'Hear a recorded syllable and pick its tone.', icon: Activity, to: '/pinyin', mode: 'tones' },
  { key: 'alikes', label: 'Sound-alikes', line: 'Tell apart syllables that sound close.', icon: Ear, to: '/pinyin', mode: 'alikes' },
  { key: 'type', label: 'Type what you hear', line: 'Listen, then type the pinyin with its tone.', icon: Keyboard, to: '/pinyin', mode: 'type' },
];

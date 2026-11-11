import { Ear, Icon, Keyboard, type IconNode, type LucideProps } from 'lucide-react';
import { PracticeIcon } from './practice-icons';

/**
 * Text-glyph icon: one character drawn inside a 24×24 SVG so it sizes and colours
 * like the lucide line icons beside it (currentColor, width/height follow CSS).
 * Inputs: the glyph, its font size/baseline in the 24-unit box, and the language tag
 * (so CJK glyphs use the CJK font); weight 500 gives stems about as thick as a
 * lucide 2-unit stroke, so text and line icons read at one weight. No state.
 */
function TextGlyphIcon({ glyph, fontSize, baseline, lang, ...props }: React.SVGProps<SVGSVGElement> & { glyph: string; fontSize: number; baseline: number; lang: string }) {
  return <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor" aria-hidden="true" {...props}><text x="12" y={baseline} textAnchor="middle" fontSize={fontSize} fontWeight={500} lang={lang}>{glyph}</text></svg>;
}

/** Hanzi games: the character 字 — the strip's clearest icon. */
export function HanziIcon(props: React.SVGProps<SVGSVGElement>) {
  return <TextGlyphIcon glyph="字" fontSize={20} baseline={19.5} lang="zh-CN" {...props}/>;
}

/**
 * Tone quiz: the pinyin tone mark ǎ (third tone), self-explanatory to anyone
 * learning pinyin. A lowercase Latin letter is small for its em box, so it is set
 * larger than 字 to fill the same visual footprint as the line icons.
 */
export function ToneIcon(props: React.SVGProps<SVGSVGElement>) {
  return <TextGlyphIcon glyph="ǎ" fontSize={27} baseline={20} lang="zh-Latn-pinyin" {...props}/>;
}

/**
 * Flashcards: a stack of two cards — a front card with a second card peeking out
 * behind its top-right corner — drawn on lucide's 24-unit grid with its 2-unit
 * stroke, so it matches the other line icons. Replaces the generic "layers" icon.
 */
const cardStackNode: IconNode = [
  ['rect', { x: '2', y: '8', width: '15', height: '13', rx: '2', key: 'front-card' }],
  ['path', { d: 'M6 8V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3', key: 'back-card' }],
];
export function FlashcardsIcon(props: LucideProps) {
  return <Icon iconNode={cardStackNode} {...props}/>;
}

/** Any icon the game lists accept: lucide icons and the text-glyph icons above. */
export type GameIcon = React.ComponentType<{ className?: string }>;

/**
 * The five games, in their two families. The sidebar and the Start page both read
 * this list, so a game's name, icon and destination never drift between them.
 * Pinyin games open the Pinyin page in their quiz mode (URL search `mode`).
 */
export type GameEntry = { key: string; label: string; line: string; icon: GameIcon; to: '/flashcards' | '/drawing' | '/pinyin'; mode?: 'tones' | 'alikes' | 'type' };

export const HANZI_GAMES: GameEntry[] = [
  { key: 'flashcards', label: 'Flashcards', line: 'How much will you remember? A second chance at the ones you miss.', icon: FlashcardsIcon, to: '/flashcards' },
  { key: 'drawing', label: 'Drawing game', line: 'Write characters, radicals and words without the guide.', icon: PracticeIcon, to: '/drawing' },
];

export const PINYIN_GAMES: GameEntry[] = [
  { key: 'tones', label: 'Tone quiz', line: 'Hear a recorded syllable and pick its tone.', icon: ToneIcon, to: '/pinyin', mode: 'tones' },
  { key: 'alikes', label: 'Sound-alikes', line: 'Tell apart syllables that sound close.', icon: Ear, to: '/pinyin', mode: 'alikes' },
  { key: 'type', label: 'Type what you hear', line: 'Listen, then type the pinyin with its tone.', icon: Keyboard, to: '/pinyin', mode: 'type' },
];

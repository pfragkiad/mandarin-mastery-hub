import { Brush, Icon, type IconNode, type LucideProps } from 'lucide-react';

/**
 * Practice action icons. Practice uses a brush (not a pen, which reads as "edit");
 * Practice Expert (Recall mode) is the same brush with a larger gold crown in the
 * free top-left corner of the 24×24 grid, so both read as one family at any size.
 * Inputs: standard lucide props (size, className, …); no state.
 */
export const PracticeIcon = Brush;

// Lucide's brush paths plus a gold crown drawn at x 1–13, y 1–10 — the brush runs
// bottom-left to top-right, so that corner never overlaps it. Colour comes from the
// .expert-crown rule (--expert-gold token) so it themes with light/dark mode.
const expertNode: IconNode = [
  ['path', { d: 'm11 10 3 3', key: 'brush-tip' }],
  ['path', { d: 'M6.5 21A3.5 3.5 0 1 0 3 17.5a2.62 2.62 0 0 1-.708 1.792A1 1 0 0 0 3 21z', key: 'brush-head' }],
  ['path', { d: 'M9.969 17.031 21.378 5.624a1 1 0 0 0-3.002-3.002L6.967 14.031', key: 'brush-handle' }],
  ['path', { d: 'M1 10V2.5l3.4 2.9L7 1l2.6 4.4L13 2.5V10z', className: 'expert-crown', strokeWidth: '1.2', strokeLinejoin: 'round', key: 'crown' }],
];

export function ExpertPracticeIcon(props: LucideProps) {
  return <Icon iconNode={expertNode} {...props}/>;
}

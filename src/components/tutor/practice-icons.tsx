import { Brush, Icon, type IconNode, type LucideProps } from 'lucide-react';

/**
 * Practice action icons. Practice uses a brush (not a pen, which reads as "edit");
 * Practice Expert (Recall mode) is the same brush with a small filled crown in the
 * free top-left corner of the 24×24 grid, so both read as one family at any size.
 * Inputs: standard lucide props (size, className, …); no state.
 */
export const PracticeIcon = Brush;

// Lucide's brush paths plus a compact crown drawn at x 1.5–10.5, y 1.5–8 —
// the brush runs bottom-left to top-right, so that corner never overlaps it.
const expertNode: IconNode = [
  ['path', { d: 'm11 10 3 3', key: 'brush-tip' }],
  ['path', { d: 'M6.5 21A3.5 3.5 0 1 0 3 17.5a2.62 2.62 0 0 1-.708 1.792A1 1 0 0 0 3 21z', key: 'brush-head' }],
  ['path', { d: 'M9.969 17.031 21.378 5.624a1 1 0 0 0-3.002-3.002L6.967 14.031', key: 'brush-handle' }],
  ['path', { d: 'M2 8 2 2.8l2.4 2.1L6 1.8l1.6 3.1L10 2.8V8z', fill: 'currentColor', strokeWidth: 1.2, strokeLinejoin: 'round', key: 'crown' }],
];

export function ExpertPracticeIcon(props: LucideProps) {
  return <Icon iconNode={expertNode} {...props}/>;
}

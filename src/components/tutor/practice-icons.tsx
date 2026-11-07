import { Brush, Icon, type IconNode, type LucideProps } from 'lucide-react';

/**
 * Card action icons (Practice, Practice Expert, Details). Practice uses a brush (not a pen, which reads as "edit");
 * Practice Expert (Recall mode) is the same brush with a larger gold crown in the
 * free top-left corner of the 24×24 grid, so both read as one family at any size.
 * Inputs: standard lucide props (size, className, …); no state.
 */
export const PracticeIcon = Brush;

// Lucide's brush paths plus a gold crown drawn at x 1–12, y 1–9 — the brush runs
// bottom-left to top-right, so that corner never overlaps it. Colour comes from the
// .expert-crown rule (--expert-gold token) so it themes with light/dark mode.
const expertNode: IconNode = [
  ['path', { d: 'm11 10 3 3', key: 'brush-tip' }],
  ['path', { d: 'M6.5 21A3.5 3.5 0 1 0 3 17.5a2.62 2.62 0 0 1-.708 1.792A1 1 0 0 0 3 21z', key: 'brush-head' }],
  ['path', { d: 'M9.969 17.031 21.378 5.624a1 1 0 0 0-3.002-3.002L6.967 14.031', key: 'brush-handle' }],
  ['path', { d: 'M.8 9V2.2l3.2 2.7L6.6.8l2.6 4.1 3.2-2.7V9z', className: 'expert-crown', strokeWidth: '1.2', strokeLinejoin: 'round', key: 'crown' }],
];

export function ExpertPracticeIcon(props: LucideProps) {
  return <Icon iconNode={expertNode} {...props}/>;
}

/**
 * Details action icon: a solid (bold) info disc with the "i" cut out, so it reads
 * differently from the thin outlined (i) source-note buttons elsewhere. The cut-out
 * uses the even-odd fill rule, so it shows the card surface beneath in any theme.
 */
const detailsNode: IconNode = [
  ['path', { d: 'M12 1.5a10.5 10.5 0 1 0 0 21a10.5 10.5 0 1 0 0-21Z M10.75 10.25h2.5v7.5h-2.5Z M12 5.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3Z', fill: 'currentColor', fillRule: 'evenodd', stroke: 'none', key: 'details-disc' }],
];

export function DetailsIcon(props: LucideProps) {
  return <Icon iconNode={detailsNode} {...props}/>;
}

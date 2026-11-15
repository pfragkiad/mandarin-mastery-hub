/**
 * The gold "Radical #N" pill on a library card's top row (Characters, Components and Radicals).
 *
 * Inputs: `number` — the exact sourced Kangxi radical index, `title` — the provenance tooltip
 * (recorded Unihan radical assignment vs. the component's own sourced identity).
 *
 * Both label forms are rendered: the full "Radical #159" and the abbreviated "Rad. #159". CSS
 * shows the full one by default and the short one only while the row carries
 * `data-radical-short`, which useRadicalPillLabel sets after measuring that the full label
 * really would wrap the row (styles.css "Radical pill abbreviation"). So the abbreviation is
 * the last try before the row drops onto a second line, never a replacement for the full label.
 *
 * Tricky logic: both inner spans are `aria-hidden` and the pill carries its own accessible name,
 * so shortening the visible text never changes what a screen reader announces.
 */
export function RadicalPill({ number, title }: { number: number; title: string }) {
  return <span className="word-hsk-id" title={title} aria-label={`Kangxi radical ${number}`}>
    <span className="radical-pill-full" aria-hidden="true">Radical #{number}</span>
    <span className="radical-pill-short" aria-hidden="true">Rad. #{number}</span>
  </span>;
}

import type { CSSProperties, ReactNode } from 'react';

/**
 * Library grid loading placeholder (section-placeholder.tsx): one card-shaped skeleton in the
 * grid's first (top-left) slot while the grid's records are not on screen yet.
 *
 * Purpose: an empty results area reads as "nothing to show", so the Glyphs grid would otherwise
 * flash a bare box (and the "No matching records" note) before its fetched records arrive, and
 * the Vocabulary grids would flash one before their bundled records mount. One skeleton is
 * enough to say "a card is coming here" without pretending the page is full.
 *
 * Inputs: none — it carries no record, so it can never be read as a real entry. It mirrors the
 * real card's own structure (`.word-card` > `.word-card-top` / `.word-open.catalog-entry` /
 * `.word-card-bottom`) so Compact and Comfortable (list) lay it out with the same rules, and the
 * glyph box reuses `.tile-form`, which both views already size.
 *
 * Tricky logic: the footer deliberately keeps the `.word-card-bottom` class the column-fit hook
 * measures (use-footer-fit-columns.ts) — that hook only counts `a`/`button` children, and this
 * footer has none, so a skeleton can never drop the grid to fewer columns. `aria-hidden` keeps it
 * out of the accessibility tree: the page heading already announces the load.
 */
export function GridCardPlaceholder() {
  const bar = (width: number | string, height?: number) => <span className="section-placeholder-block" style={{ width, ...(height ? { height } : {}) }}/>;
  return <article className="word-card catalog-card grid-card-placeholder" aria-hidden="true">
    <div className="word-card-top">
      <span className="word-level-wrap">{bar(58)}{bar(30)}</span>
      <span className="catalog-card-indicators">{bar(13, 13)}{bar(13, 13)}</span>
    </div>
    <div className="word-open catalog-entry">
      <span className="word-character">
        <span className="pinyin">{bar(62)}</span>
        <span className="tile-hanzi-row" style={{ '--forms-per-row': 1 } as CSSProperties}><span className="tile-form"/></span>
      </span>
      <span className="word-meaning catalog-entry-meaning">{bar('78%')}{bar('46%')}</span>
    </div>
    <div className="word-card-bottom">{bar(64)}{bar(24, 24)}</div>
  </article>;
}

/**
 * Loading placeholder for a lazily filled detail-card section ("In a character", Etymology).
 * Inputs: the section's real eyebrow heading (icon + label) and which shape to sketch —
 * `tiles` (glyph box + two text lines per row, like parent-character rows) or `text` (a
 * captioned paragraph, like a source note). Purely presentational: it never hints at the
 * content, and the owner section still hides itself if the load ends with nothing to show.
 * The pulse stops under prefers-reduced-motion via the global reduced-motion rule.
 */
export function SectionPlaceholder({ heading, label, shape, rows = 3 }: { heading: ReactNode; label: string; shape: 'tiles' | 'text'; rows?: number }) {
  return <section className="glyph-usage-section section-placeholder" aria-label={label} aria-busy="true">
    <h3 className="eyebrow">{heading}</h3>
    <span className="sr-only">Loading {label.toLowerCase()}…</span>
    {shape === 'tiles'
      ? <div className="glyph-usage-parents" aria-hidden="true">{Array.from({ length: rows }, (_, i) => <div className="section-placeholder-row" key={i}>
          <span className="section-placeholder-block section-placeholder-tile"/>
          <span className="section-placeholder-lines"><span className="section-placeholder-block" style={{ width: '38%' }}/><span className="section-placeholder-block" style={{ width: `${72 - i * 9}%` }}/></span>
        </div>)}</div>
      : <div className="section-placeholder-lines" aria-hidden="true">{Array.from({ length: rows }, (_, i) => <span className="section-placeholder-block" key={i} style={{ width: i === 0 ? '34%' : i === rows - 1 ? '58%' : '92%' }}/>)}</div>}
  </section>;
}

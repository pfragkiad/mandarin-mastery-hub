import type { ReactNode } from 'react';

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

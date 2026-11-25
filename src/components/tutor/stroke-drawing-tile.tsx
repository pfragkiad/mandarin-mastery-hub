import { useEffect, useState } from 'react';
import { loadStrokeGeometry } from '@/lib/character-enrichment';
import { strokeExamples } from '@/lib/stroke-examples';

/** Second preview tile on a Strokes library card: renders the exact recorded
 *  Hanzi Writer brush outline used in Practice (`strokeExamples[glyph]`), in the
 *  same 1024×1024 coordinate space and baseline (`scale(1, -1) translate(0, -900)`).
 *  Inputs: the exact stroke glyph. State: the resolved SVG path string (or null
 *  while loading / on error). Fails closed (returns null) when no verified
 *  representative example exists for the glyph. */
export function StrokeDrawingTile({ glyph }: { glyph: string }) {
  const example = strokeExamples[glyph];
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    setPath(null);
    if (!example) return;
    let active = true;
    loadStrokeGeometry(example.character)
      .then(({ data }) => {
        if (!active) return;
        const stroke = data.strokes[example.strokeIndex];
        const median = data.medians[example.strokeIndex];
        if (data.strokes.length !== data.medians.length || !stroke || !median || median.length < 2) return;
        setPath(stroke);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [example]);

  if (!example) return null;
  return (
    <span className="tile-form stroke-drawing-tile" aria-hidden="true">
      {path && (
        <svg viewBox="0 0 1024 1024" className="stroke-drawing-svg">
          <g transform="scale(1, -1) translate(0, -900)">
            <path d={path} />
          </g>
        </svg>
      )}
    </span>
  );
}
import { useEffect, useState } from 'react';
import { resolveBabelStoneComponent, type BabelStoneComponent as ComponentDefinition } from '@/lib/babelstone-components';
import { SourceInfo } from './source-info';

/** This is a font-specific source glyph, never a lexical character/library link. */
export function BabelStoneComponent({ token }: { token: string }) {
  const [resolved, setResolved] = useState<{ token: string; definition: ComponentDefinition; fontReady: boolean } | null>(null);
  useEffect(() => {
    let active = true;
    void resolveBabelStoneComponent(token).then(async definition => {
      if (!definition || !active) return;
      setResolved({ token, definition, fontReady: false });
      if (definition.codePoint === null) return;
      try {
        const faces = await document.fonts.load('32px "BabelStone Han PUA"', String.fromCodePoint(definition.codePoint));
        if (active && faces.length) setResolved({ token, definition, fontReady: true });
      } catch { /* Retain a legible source ID if the font cannot load. */ }
    }).catch(() => {});
    return () => { active = false; };
  }, [token]);
  const current = resolved?.token === token ? resolved : null;
  const definition = current?.definition;
  const glyph = current?.fontReady && definition?.codePoint !== null && definition?.codePoint !== undefined
    ? String.fromCodePoint(definition.codePoint) : null;
  return <div className="decomposition-part babelstone-component" data-component-id={definition?.id ?? token.slice(1, -1)}>
    {glyph
      ? <strong className="decomposition-glyph decomposition-glyph-static babelstone-pua-glyph" aria-label={`BabelStone component ${definition?.id}`}>{glyph}</strong>
      : <span className="babelstone-component-id">{token}</span>}
    <small className="decomposition-facts babelstone-component-facts">
      <span className="decomposition-meaning">{definition?.description ?? 'Numbered BabelStone component'}</span>
      <span className="babelstone-component-source">BabelStone component {definition?.id ?? token.slice(1, -1)}<SourceInfo inline className="detail-footnote">
        BabelStone IDS.TXT · 2025-06-27<br/>
        {definition?.codePoint ? <>BabelStone Han PUA · U+{definition.codePoint.toString(16).toUpperCase()}<br/></> : null}
        {definition?.suggestedSubstitution ? <>Suggested substitution: {definition.suggestedSubstitution} · may be approximate, not an exact identity<br/></> : null}
        Font-specific graphical component · no inferred pronunciation, meaning or stroke order
      </SourceInfo></span>
    </small>
  </div>;
}
import { SourceInfo } from '@/components/tutor/source-info';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { catalog } from '@/lib/catalog-store';
import { glyphIndex, libraryDestination } from '@/lib/character-library';
import { ComponentPronunciation } from './component-pronunciation';
import { stripKangxiLabel } from './characters-page';
import { radicalIdentity } from '@/lib/radical-identities';
import { useWorkspace } from './workspace';

export function RadicalIdentityNote({ glyph }: { glyph: string }) {
  const { preferences } = useWorkspace();
  const identity = radicalIdentity(glyph);
  const sources = identity.sourceIds.flatMap(id => catalog.radicalIdentities.sources[id] ? [catalog.radicalIdentities.sources[id]] : []);
  return <div className="decomposition-section">
    <h3 className="eyebrow">KANGXI IDENTITY{identity.radicals.length ? <SourceInfo inline className="detail-footnote identity-footnote">{identity.kind === 'canonical' ? 'Canonical Kangxi radical.' : 'Sourced Kangxi radical form.'}{identity.equivalentGlyphs.length > 0 && <><br/>Unicode-equivalent forms · <span lang="zh-CN">{identity.equivalentGlyphs.join(' · ')}</span></>}<br/>Source · {[...new Set(sources.map(source => `${source.provider} ${source.version}`))].join(' · ')} · Unicode License V3</SourceInfo> : null}</h3>
    {identity.radicals.length ? <div className="decomposition-part">{identity.radicals.map(radical => {
      const destination = libraryDestination(radical.glyph, preferences.includeTraditional);
      return <span key={radical.id} className="kangxi-identity-item">{destination
        ? <Button asChild variant="ghost" className="decomposition-glyph"><Link to="/characters" search={destination} resetScroll={false} aria-label={`Open Kangxi radical ${radical.number}`}><strong lang="zh-CN">{radical.glyph}</strong></Link></Button>
        : <strong lang="zh-CN" className="decomposition-glyph decomposition-glyph-static">{radical.glyph}</strong>}<ComponentPronunciation glyph={radical.glyph}/>{glyphIndex()[radical.glyph]?.meaning && <span className="kangxi-identity-meaning">{stripKangxiLabel(glyphIndex()[radical.glyph]?.meaning ?? '')}</span>}<span className="word-hsk-id kangxi-identity-badge">Radical #{radical.number}</span></span>;
    })}</div> : <div className="record-gap"><p>Graphical component; no sourced Kangxi radical identity in the imported mappings.</p></div>}
  </div>;
}

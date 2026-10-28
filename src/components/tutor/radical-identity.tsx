import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { catalog } from '@/lib/catalog-store';
import { libraryDestination } from '@/lib/character-library';
import { radicalIdentity } from '@/lib/radical-identities';
import { useWorkspace } from './workspace';

export function RadicalIdentityNote({ glyph }: { glyph: string }) {
  const { preferences } = useWorkspace();
  const identity = radicalIdentity(glyph);
  const sources = identity.sourceIds.flatMap(id => catalog.radicalIdentities.sources[id] ? [catalog.radicalIdentities.sources[id]] : []);
  return <div className="decomposition-section">
    <h3 className="eyebrow">KANGXI IDENTITY</h3>
    {identity.radicals.length ? <>
      <p className="decomposition-note">{identity.kind === 'canonical' ? 'Canonical Kangxi radical.' : 'Sourced Kangxi radical form.'}</p>
      <div className="decomposition-part">{identity.radicals.map(radical => {
        const destination = libraryDestination(radical.glyph, preferences.includeTraditional);
        return destination ? <Button key={radical.id} asChild variant="ghost" className="decomposition-glyph"><Link to="/characters" search={destination} resetScroll={false} aria-label={`Open Kangxi radical ${radical.number}`}><strong lang="zh-CN">{radical.glyph}</strong><small>Kangxi #{radical.number}</small></Link></Button> : <span key={radical.id}>{radical.glyph} · Kangxi #{radical.number}</span>;
      })}</div>
      {identity.equivalentGlyphs.length > 0 && <p className="decomposition-note">Unicode-equivalent forms: <span lang="zh-CN">{identity.equivalentGlyphs.join(' · ')}</span></p>}
      <p className="detail-footnote identity-footnote">Source · {[...new Set(sources.map(source => `${source.provider} ${source.version}`))].join(' · ')}<br/>Unicode License V3</p>
    </> : <div className="record-gap"><p>Graphical component; no sourced Kangxi radical identity in the imported mappings.</p></div>}
  </div>;
}
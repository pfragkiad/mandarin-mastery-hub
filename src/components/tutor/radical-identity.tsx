import { SourceInfo } from '@/components/tutor/source-info';
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
    <h3 className="eyebrow">KANGXI IDENTITY{identity.radicals.length ? <SourceInfo inline className="detail-footnote identity-footnote">{identity.kind === 'canonical' ? 'Canonical Kangxi radical.' : 'Sourced Kangxi radical form.'}{identity.equivalentGlyphs.length > 0 && <><br/>Unicode-equivalent forms · <span lang="zh-CN">{identity.equivalentGlyphs.join(' · ')}</span></>}<br/>Source · {[...new Set(sources.map(source => `${source.provider} ${source.version}`))].join(' · ')} · Unicode License V3</SourceInfo> : null}</h3>
    {identity.radicals.length ? <div className="decomposition-part">{identity.radicals.map(radical => {
      const destination = libraryDestination(radical.glyph, preferences.includeTraditional);
      return destination ? <Button key={radical.id} asChild variant="ghost" className="decomposition-glyph"><Link to="/characters" search={destination} resetScroll={false} aria-label={`Open Kangxi radical ${radical.number}`}><strong lang="zh-CN">{radical.glyph}</strong><small>Kangxi #{radical.number}</small></Link></Button> : <span key={radical.id}>{radical.glyph} · Kangxi #{radical.number}</span>;
    })}</div> : <div className="record-gap"><p>Graphical component; no sourced Kangxi radical identity in the imported mappings.</p></div>}
  </div>;
}

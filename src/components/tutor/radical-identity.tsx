import { SourceInfo } from '@/components/tutor/source-info';
import { openDetailsHint } from '@/lib/tile-hints';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { catalog } from '@/lib/catalog-store';
import { glyphIndex, libraryDestination } from '@/lib/character-library';
import { ComponentPronunciation } from './component-pronunciation';
import { stripKangxiLabel } from './characters-page';
import { ExampleCardMeta } from './sentence-section';
import { radicalIdentity } from '@/lib/radical-identities';
import { cardMeaning } from '@/lib/glyph-presentation';
import { useWorkspace } from './workspace';

export function RadicalIdentityNote({ glyph }: { glyph: string }) {
  const { preferences } = useWorkspace();
  const identity = radicalIdentity(glyph);
  const sources = identity.sourceIds.flatMap(id => catalog.radicalIdentities.sources[id] ? [catalog.radicalIdentities.sources[id]] : []);
  return <div className="decomposition-section">
    <h3 className="eyebrow">KANGXI IDENTITY{identity.radicals.length ? <SourceInfo inline className="detail-footnote identity-footnote">{identity.kind === 'canonical' ? 'Canonical Kangxi radical.' : 'Sourced Kangxi radical form.'}{identity.equivalentGlyphs.length > 0 && <><br/>Unicode-equivalent forms · <span lang="zh-CN">{identity.equivalentGlyphs.join(' · ')}</span></>}<br/>Source · {[...new Set(sources.map(source => `${source.provider} ${source.version}`))].join(' · ')} · Unicode License V3</SourceInfo> : null}</h3>
    {identity.radicals.length ? <div className="kangxi-identity-rows">{identity.radicals.map(radical => {
      const destination = libraryDestination(radical.glyph, preferences.includeTraditional);
      // Reviewed per-reading meanings (干 gān / gàn) join with " / " like the grid card (cardMeaning
      // fails closed to the recorded text); no related-character pointers on a radical.
      const record = glyphIndex()[radical.glyph];
      const meaning = record?.meaning ? cardMeaning(radical.glyph, record.pinyin, record.meaning) : undefined;
      // Same small grid card as "In a character": Radical #N header, then the tile beside
      // reading + speaker and the recorded meaning.
      return <div key={radical.id} className="glyph-usage-example kangxi-identity-card">
        <ExampleCardMeta identity={<span className="word-hsk-id kangxi-identity-badge">Radical #{radical.number}</span>}/>
        <div className="glyph-usage-reference kangxi-identity-item">{destination
          ? <Button asChild variant="ghost" className="decomposition-glyph is-radical"><Link to="/characters" search={destination} resetScroll={false} title={openDetailsHint(radical.glyph, destination.tab)} aria-label={`Kangxi radical ${radical.number} · ${openDetailsHint(radical.glyph, destination.tab)}`}><strong lang="zh-CN">{radical.glyph}</strong></Link></Button>
          : <strong lang="zh-CN" className="decomposition-glyph decomposition-glyph-static is-radical">{radical.glyph}</strong>}<span className="glyph-usage-facts"><span className="glyph-usage-facts-row"><ComponentPronunciation glyph={radical.glyph}/></span>{meaning && <span className="glyph-usage-meaning kangxi-identity-meaning">{stripKangxiLabel(meaning)}</span>}</span></div>
      </div>;
    })}</div> : <div className="record-gap"><p>Graphical component; no sourced Kangxi radical identity in the imported mappings.</p></div>}
  </div>;
}

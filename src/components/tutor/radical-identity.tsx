import { SourceInfo } from '@/components/tutor/source-info';
import { ArrowUpRight } from 'lucide-react';
import { openDetailsHint } from '@/lib/tile-hints';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { catalog } from '@/lib/catalog-store';
import { glyphIndex, libraryDestination } from '@/lib/character-library';
import { ComponentPronunciation } from './component-pronunciation';
import { stripKangxiLabel } from './characters-page';
import { ExampleCardMeta } from './sentence-section';
import { radicalIdentity, type RadicalLink } from '@/lib/radical-identities';
// The Radicals library icon (section-icons.ts), so this heading's mark matches the
// sidebar/Start card mark for the same section instead of inventing a second one.
import { sectionIcons } from '@/lib/section-icons';

const RadicalIcon = sectionIcons.Radicals;
import { cardMeaning } from '@/lib/glyph-presentation';
import { useWorkspace } from './workspace';

export function RadicalIdentityNote({ glyph, fallbackRadical }: { glyph: string; fallbackRadical?: RadicalLink | undefined }) {
  const { preferences } = useWorkspace();
  const identity = radicalIdentity(glyph);
  const radicals = identity.radicals.length ? identity.radicals : fallbackRadical ? [fallbackRadical] : [];
  const sources = identity.sourceIds.flatMap(id => catalog.radicalIdentities.sources[id] ? [catalog.radicalIdentities.sources[id]] : []);
  return <div className="decomposition-section">
    <h3 className="eyebrow"><RadicalIcon size={13} aria-hidden="true"/>KANGXI IDENTITY{radicals.length ? <SourceInfo inline className="detail-footnote identity-footnote">{identity.kind === 'canonical' ? 'Canonical Kangxi radical.' : 'Sourced Kangxi radical form.'}{identity.equivalentGlyphs.length > 0 && <><br/>Unicode-equivalent forms · <span lang="zh-CN">{identity.equivalentGlyphs.join(' · ')}</span></>}<br/>Source · {sources.length ? `${[...new Set(sources.map(source => `${source.provider} ${source.version}`))].join(' · ')} · Unicode License V3` : 'Radical families'}</SourceInfo> : null}</h3>
    {radicals.length ? <div className="kangxi-identity-rows">{radicals.map(radical => {
      const destination = libraryDestination(radical.glyph, preferences.includeTraditional);
      // Reviewed per-reading meanings (干 gān / gàn) join with " / " like the grid card (cardMeaning
      // fails closed to the recorded text); no related-character pointers on a radical.
      const record = glyphIndex()[radical.glyph];
      const meaning = record?.meaning ? cardMeaning(radical.glyph, record.pinyin, record.meaning) : undefined;
      // Same small grid card as "In a character": Radical #N header, then the tile beside
      // reading + speaker and the recorded meaning.
      return <div key={radical.id} className="glyph-usage-example kangxi-identity-card">
        <ExampleCardMeta identity={<span className="word-hsk-id kangxi-identity-badge">Radical #{radical.number}</span>} link={destination
          // The shared top-right arrow opens the same radical card the tile does.
          ? <Link to="/characters" search={destination} resetScroll={false} className="detail-arrow-link" title={openDetailsHint(radical.glyph, destination.tab)} aria-label={openDetailsHint(radical.glyph, destination.tab)}><ArrowUpRight aria-hidden="true"/></Link>
          : undefined}/>
        <div className="glyph-usage-reference kangxi-identity-item">{destination
          ? <Button asChild variant="ghost" className="decomposition-glyph is-radical"><Link to="/characters" search={destination} resetScroll={false} title={openDetailsHint(radical.glyph, destination.tab)} aria-label={`Kangxi radical ${radical.number} · ${openDetailsHint(radical.glyph, destination.tab)}`}><strong lang="zh-CN">{radical.glyph}</strong></Link></Button>
          : <strong lang="zh-CN" className="decomposition-glyph decomposition-glyph-static is-radical">{radical.glyph}</strong>}<span className="glyph-usage-facts"><span className="glyph-usage-facts-row"><ComponentPronunciation glyph={radical.glyph}/></span>{meaning && <span className="glyph-usage-meaning kangxi-identity-meaning">{stripKangxiLabel(meaning)}</span>}</span></div>
      </div>;
    })}</div> : <div className="record-gap"><p>Graphical component; no sourced Kangxi radical identity in the imported mappings.</p></div>}
  </div>;
}

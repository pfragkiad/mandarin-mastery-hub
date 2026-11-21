import { useEffect, useMemo, useState } from 'react';
import { openDetailsHint } from '@/lib/tile-hints';
import { Link } from '@tanstack/react-router';
import { Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { libraryEntries, type LibraryEntry, type LibraryKind } from '@/lib/character-library';
import { glyphUsage, glyphParentCharactersGSource, radicalParentCharacters } from '@/lib/glyph-usage';
import { useWorkspace } from './workspace';
import { MeaningText } from './meaning-text';
import { SentenceExample } from './sentence-example';
import { SentenceSection } from './sentence-section';
import { ExamplePronunciation } from './example-pronunciation';
import { MultiReadingSpeakers, isMultiReading } from './reading-speakers';
import { characterAudioRequest } from '@/lib/catalog-store';
import { usageOrder, usageRank } from '@/lib/usage-frequency';
import { radicalIdentity } from '@/lib/radical-identities';
import { UsageLabel } from './usage-label';
import { SectionPlaceholder } from './section-placeholder';

/** Component parents resolve through lazily loaded BabelStone G-source trees; null while loading. */
export function useGSourceParents(entry: LibraryEntry, kind: LibraryKind | null, includeTraditional: boolean, catalogVersion: number): LibraryEntry[] | null {
  const [parents, setParents] = useState<LibraryEntry[] | null>(null);
  useEffect(() => {
    if (kind !== 'Components') { setParents(null); return; }
    let cancelled = false;
    setParents(null);
    glyphParentCharactersGSource(entry, libraryEntries('Characters'), includeTraditional)
      .then(rows => { if (!cancelled) setParents(rows); });
    return () => { cancelled = true; };
  }, [entry, kind, includeTraditional, catalogVersion]);
  return parents;
}

/** Radical parents: dictionary radical assignment, with multi-form families checked against
 * lazily loaded BabelStone G-source trees; null while loading. `familyGlyph` is the family
 * heading the dictionary assignment names (variant cards pass it). */
export function useRadicalParents(entry: LibraryEntry, kind: LibraryKind, includeTraditional: boolean, catalogVersion: number, familyGlyph?: string): LibraryEntry[] | null {
  const [parents, setParents] = useState<LibraryEntry[] | null>(null);
  useEffect(() => {
    if (kind !== 'Radicals') { setParents(null); return; }
    let cancelled = false;
    setParents(null);
    radicalParentCharacters(entry, libraryEntries('Characters'), includeTraditional, familyGlyph)
      .then(rows => { if (!cancelled) setParents(rows); });
    return () => { cancelled = true; };
  }, [entry, kind, includeTraditional, catalogVersion, familyGlyph]);
  return parents;
}

export function GlyphUsageExamples({ entry, kind, familyGlyph }: { entry: LibraryEntry; kind: LibraryKind; familyGlyph?: string | undefined }) {
  const { items, preferences, catalogVersion } = useWorkspace();
  const examples = useMemo(() => glyphUsage(entry, kind, items, libraryEntries('Characters'), preferences.includeTraditional), [entry, kind, items, preferences.includeTraditional, catalogVersion]);
  const gSourceParents = useGSourceParents(entry, kind, preferences.includeTraditional, catalogVersion);
  const radicalParents = useRadicalParents(entry, kind, preferences.includeTraditional, catalogVersion, familyGlyph);
  const loadedParents = kind === 'Components' ? gSourceParents : radicalParents;
  const parents = loadedParents?.slice(0, 6) ?? [];
  // While the BabelStone sidecars load (up to ~20s on a first component card), show a pulsing
  // placeholder in the section's own shape; once loaded with no sourced parent characters, hide
  // the whole "In a character" section (owner choice).
  if ((kind === 'Components' || kind === 'Radicals') && loadedParents === null) return <SectionPlaceholder heading={<><Type size={13} aria-hidden="true"/>IN A CHARACTER</>} label="In a character" shape="tiles"/>;
  if ((kind === 'Components' || kind === 'Radicals') && !parents.length) return null;
  if (kind === 'Components' || kind === 'Radicals') return <section className="glyph-usage-section" aria-label="In a character">
    <h3 className="eyebrow"><Type size={13} aria-hidden="true"/>IN A CHARACTER</h3>
    <div className="glyph-usage-parents">{parents.map(parent => <div className="glyph-usage-reference" key={parent.id}>
      {/* Traditional parents keep the purple tile used everywhere else; script comes from exact record metadata, never shape inference. A parent that is itself a sourced Kangxi radical wears the gold 部 stamp. */}
      <Button asChild variant="ghost" className={`decomposition-glyph${parent.script === 'Traditional' ? ' traditional-character' : ''}${radicalIdentity(parent.hanzi).radicals.length ? ' is-radical' : ''}`}><Link to="/characters" search={{ tab: 'Characters', id: parent.id }} resetScroll={false} title={openDetailsHint(parent.hanzi, 'Characters')} aria-label={openDetailsHint(parent.hanzi, 'Characters')}><strong lang="zh-CN">{parent.hanzi}</strong></Link></Button>
      {/* Two lines beside the tile, as in Decomposition: reading + speaker, then the parent's
          rank (+ Traditional pill) on top, meaning below. The speaker sits right after the reading
          instead of in a shared column, so it never drifts away from short readings. The rank is
          the same label the Sound chart's "In a character" rows use: the parent is a Characters
          record (its link keeps that record ID), so it is the exact supplied Characters-scope rank,
          shown only once the lazily loaded usage sidecar is installed — never estimated. */}
      <span className="glyph-usage-facts">
        {((preferences.pinyin && parent.pinyin) || usageOrder.loaded || parent.script === 'Traditional') && <span className="glyph-usage-facts-row">
          {preferences.pinyin && parent.pinyin && <span className="example-pinyin-row">{isMultiReading(parent.pinyin) ? <MultiReadingSpeakers spoken={parent.hanzi} reading={parent.pinyin} variant="example"/> : <><span className="pinyin">{parent.pinyin}</span><ExamplePronunciation request={characterAudioRequest(parent.hanzi, parent.pinyin)} label={`character ${parent.hanzi}`}/></>}</span>}
          {usageOrder.loaded && <UsageLabel rank={usageRank(parent, 'Characters', preferences.includeTraditional)} kind="Characters" compact/>}
          {parent.script === 'Traditional' && <span className="word-hsk-id traditional-pill" title="Traditional-form record">Traditional</span>}
        </span>}
        <span className="glyph-usage-meaning"><MeaningText text={parent.meaning}/></span>
      </span>
    </div>)}</div>
  </section>;
  // "In a sentence" always shows for characters, even with no recorded example, so
  // "Find more examples" (external search of the exact hanzi) is always reachable.
  return <SentenceSection hanzi={entry.hanzi}>
    {examples.map(({ word, sentence }) => <div className="glyph-usage-example" key={word.id}>
      <SentenceExample heading="" sentence={sentence ? word.sentence : word.hanzi} pinyin={sentence ? word.sentencePinyin : word.pinyin} translation={sentence ? word.translation : word.meaning} audioRequest={sentence ? { text: word.sentence, reading: word.sentencePinyin ?? null, audio: word.entry?.examples[0]?.audio ?? null } : { ...characterAudioRequest(word.hanzi, word.pinyin), audio: word.audio ?? null }} />
    </div>)}
  </SentenceSection>;
}

import { useEffect, useMemo, useState } from 'react';
import { openDetailsHint } from '@/lib/tile-hints';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Puzzle, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { libraryEntries, type LibraryEntry, type LibraryKind } from '@/lib/character-library';
import { glyphUsage, glyphParentCharactersGSource, radicalParentCharacters } from '@/lib/glyph-usage';
import { idiomsForCharacter, loadIdioms } from '@/lib/idioms';
import type { Word } from '@/lib/mandarin';
import { primarySubtopicLabel } from '@/lib/vocabulary-subtopics';
import { useWorkspace } from './workspace';
import { MeaningText } from './meaning-text';
import { SentenceExample } from './sentence-example';
import { MoreExamples, SentenceHints, SentenceSection } from './sentence-section';
import { ExamplePronunciation } from './example-pronunciation';
import { MultiReadingSpeakers, isMultiReading } from './reading-speakers';
import { characterAudioRequest } from '@/lib/catalog-store';
import { usageOrder, usageRank } from '@/lib/usage-frequency';
import { radicalIdentity } from '@/lib/radical-identities';
import { UsageLabel } from './usage-label';
import { SectionPlaceholder } from './section-placeholder';
import { loadCharacterHskExample, type CharacterHskExample } from '@/lib/character-hsk-examples';
import { isLearningExample, loadCharacterTatoebaExample, ownSentencePinyin, type CharacterTatoebaExample } from '@/lib/character-tatoeba-examples';
import { TatoebaSentenceSource } from './tatoeba-sentence-source';

/** Optional sourced examples, fetched only for a Characters detail card.
 * Vocabulary/lessons stay first and Tatoeba may add a separately annotated
 * sentence. Bind state to the exact record so navigation cannot flash old text.
 */
function useFallbackExample(recordId: string, enabled: boolean, lessonEnabled: boolean) {
  const [loaded, setLoaded] = useState<{ recordId: string; hsk: CharacterHskExample | null; tatoeba: CharacterTatoebaExample | null } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      const tatoebaRequest = loadCharacterTatoebaExample(recordId);
      const hsk = lessonEnabled ? await loadCharacterHskExample(recordId) : null;
      if (cancelled) return;
      setLoaded({ recordId, hsk, tatoeba: null });
      const tatoeba = await tatoebaRequest;
      if (!cancelled) setLoaded({ recordId, hsk, tatoeba });
    })();
    return () => { cancelled = true; };
  }, [recordId, enabled, lessonEnabled]);
  return enabled && loaded?.recordId === recordId ? loaded : null;
}

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
  const fallback = useFallbackExample(entry.id, kind === 'Characters', examples.length === 0);
  const hskExample = fallback?.hsk;
  const tatoeba = fallback?.tatoeba && isLearningExample(fallback.tatoeba) ? fallback.tatoeba : null;
  const gSourceParents = useGSourceParents(entry, kind, preferences.includeTraditional, catalogVersion);
  const radicalParents = useRadicalParents(entry, kind, preferences.includeTraditional, catalogVersion, familyGlyph);
  const loadedParents = kind === 'Components' ? gSourceParents : radicalParents;
  const parents = loadedParents?.slice(0, 6) ?? [];
  // Reading lookup for the Tatoeba sentence's own pinyin line: exact glyph → recorded
  // reading, Characters first, then Components and Radicals as fallback. Built only
  // when a Tatoeba example is shown; multi-reading entries keep their " / " join for
  // ownSentencePinyin to take the dictionary-primary first reading.
  const tatoebaReadingFor = useMemo(() => {
    if (!tatoeba) return null;
    const readings = new Map<string, string>();
    for (const entryKind of ['Characters', 'Components', 'Radicals'] as const)
      for (const row of libraryEntries(entryKind))
        if (row.hanzi && row.pinyin && !readings.has(row.hanzi)) readings.set(row.hanzi, row.pinyin);
    return (glyph: string) => readings.get(glyph) ?? null;
  }, [tatoeba, catalogVersion]);
  // While the BabelStone sidecars load (up to ~20s on a first component card), show a pulsing
  // placeholder in the section's own shape; once loaded with no sourced parent characters, hide
  // the whole "In a character" section (owner choice).
  if ((kind === 'Components' || kind === 'Radicals') && loadedParents === null) return <SectionPlaceholder heading={<><Puzzle size={13} aria-hidden="true"/>IN A CHARACTER</>} label="In a character" shape="tiles"/>;
  if ((kind === 'Components' || kind === 'Radicals') && !parents.length) return null;
  if (kind === 'Components' || kind === 'Radicals') return <section className="glyph-usage-section" aria-label="In a character">
    <h3 className="eyebrow"><Puzzle size={13} aria-hidden="true"/>IN A CHARACTER</h3>
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
  // "In a phrase" always shows for characters, even with no recorded example, so
  // External search of the exact hanzi is always reachable. Imported file names
  // and review status identifiers are internal metadata, not learner hints.
  const sentenceExamples = examples.map(({ word, sentence }) => <div className="glyph-usage-example" key={word.id}>
    <SentenceExample heading="" sentence={sentence ? word.sentence : word.hanzi} pinyin={sentence ? word.sentencePinyin : word.pinyin} translation={sentence ? word.translation : word.meaning} audioRequest={sentence ? { text: word.sentence, reading: word.sentencePinyin ?? null, audio: word.entry?.examples[0]?.audio ?? null } : { ...characterAudioRequest(word.hanzi, word.pinyin), audio: word.audio ?? null }}/>
  </div>);
  if (hskExample) sentenceExamples.push(<div className="glyph-usage-example" key="lesson">
      <SentenceExample heading="" sentence={hskExample.sentence} pinyin={hskExample.pinyin} translation={hskExample.translation}/>
      <p className="detail-footnote">Source: <Link to="/lessons/$lessonId" params={{ lessonId: hskExample.source.lessonId }}>{hskExample.source.collection} · {hskExample.source.title}</Link>{hskExample.source.status === 'draft' && ' · Draft lesson example'}</p>
    </div>);
  if (tatoeba) sentenceExamples.push(<div className="glyph-usage-example" key={tatoeba.id}>
      {/* Pinyin is our own, built per character from recorded catalogue readings
          (ownSentencePinyin), never the Tatoeba transcription. */}
      <SentenceExample heading="" sentence={tatoeba.sentence} pinyin={tatoebaReadingFor ? ownSentencePinyin(tatoeba.sentence, tatoebaReadingFor) : undefined} translation={tatoeba.translation} sourceDetails={<TatoebaSentenceSource example={tatoeba}/>}/>
    </div>);
  return <SentenceSection hanzi={entry.hanzi}>
    {sentenceExamples.length > 0 ? <MoreExamples key={entry.id} examples={sentenceExamples} initialCount={2}/> : null}
  </SentenceSection>;
}

/** Top 2 highest-ranked idioms containing a Characters record, lazily loaded from public/data/idioms.json. */
export function CharacterIdiomsSection({ entry }: { entry: LibraryEntry }) {
  const [idioms, setIdioms] = useState<Word[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadIdioms()
      .then(({ words }) => { if (!cancelled) setIdioms(words); })
      .catch(() => { /* hide section if idioms fail to load */ });
    return () => { cancelled = true; };
  }, []);
  const matches = useMemo(() => (idioms ? idiomsForCharacter(idioms, entry.hanzi, entry.script, 2) : []), [idioms, entry.hanzi, entry.script]);
  if (!matches.length) return null;
  return <section className="glyph-usage-section sentence-section idiom-examples-section" aria-label="In an idiom">
    <div className="sentence-section-head">
      <h3 className="eyebrow"><ScrollText size={13} aria-hidden="true"/>IN AN IDIOM</h3>
      <Link className="find-examples-link internal-examples-link" to="/vocabulary" search={{ tab: 'idiom', q: entry.hanzi }} title={`Search idioms containing ${entry.hanzi}`}>
        Search in idioms<ArrowRight className="find-examples-icon" aria-hidden="true"/>
      </Link>
    </div>
    <SentenceHints backLabel={entry.hanzi}>
      {matches.map(idiom => {
        const showTrad = entry.script === 'Traditional' && Boolean(idiom.idiomMeta?.traditional?.includes(entry.hanzi));
        const display = showTrad ? (idiom.idiomMeta?.traditional ?? idiom.hanzi) : idiom.hanzi;
        const topicLabel = primarySubtopicLabel(idiom) ?? idiom.collection;
        return <div className="glyph-usage-example" key={idiom.id}>
          <div className="idiom-example-meta">
            <UsageLabel rank={idiom.idiomMeta?.rank ?? null} compact/>
            {topicLabel && <span className="glyph-usage-idiom-topic"><span aria-hidden="true">· </span>{topicLabel}</span>}
          </div>
          <SentenceExample
            heading=""
            sentence={display}
            pinyin={idiom.pinyin}
            translation={idiom.meaning}
            audioRequest={{ text: idiom.hanzi, reading: idiom.pinyin, audio: idiom.audio ?? null }}
          />
        </div>;
      })}
    </SentenceHints>
  </section>;
}

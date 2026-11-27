import { useEffect, useMemo, useRef, useState } from 'react';
import { openDetailsHint } from '@/lib/tile-hints';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Puzzle, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { libraryEntries, type LibraryEntry, type LibraryKind } from '@/lib/character-library';
import { characterWords, glyphUsage, glyphParentCharactersGSource, radicalParentCharacters } from '@/lib/glyph-usage';
import { idiomsForCharacter, loadIdioms } from '@/lib/idioms';
import type { Word } from '@/lib/mandarin';
import { primarySubtopicLabel } from '@/lib/vocabulary-subtopics';
import { useWorkspace } from './workspace';
import { MeaningText } from './meaning-text';
import { SentenceExample } from './sentence-example';
import { MoreExamples, SentenceHints, SentenceSection, ExampleCardMeta, useSentenceSectionLayout } from './sentence-section';
import { wordHskPill } from './word-identity-pills';
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
import { ExpandableCharacterGrid } from './expandable-character-grid';
import { SmallGridMeaning } from './small-grid-meaning';
import { SoundExampleGlyph } from './sound-example-glyph';
import { sectionIcons } from '@/lib/section-icons';
import { wordTileFit } from './word-card';
import { ExampleSection } from './example-tabs';
import { lineCount, MEANING_FONT_FLOOR, sideTextMaxStep, useSideFit } from './use-side-fit';

/**
 * Before wrapping pinyin or translation (or pushing facts below the hanzi box) on an
 * "In a word" card, shrink both fonts together by up to the shared side-fit budget.
 * Reverts to the view's own sizes if shrinking cannot prevent wrapping.
 */
function WordExampleReference({ word, children }: { word: Word; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { preferences } = useWorkspace();
  useSideFit(ref, true, [word.id, word.pinyin, word.meaning, preferences.pinyin, preferences.font, preferences.libraryView], {
    rowSync: true,
    fit: el => {
      const glyphs = el.querySelector<HTMLElement>('.word-example-glyphs');
      const facts = el.querySelector<HTMLElement>('.glyph-usage-facts');
      const pinyin = facts?.querySelector<HTMLElement>('.pinyin') ?? null;
      const meaning = facts?.querySelector<HTMLElement>('.glyph-usage-meaning') ?? null;
      if (!glyphs || !facts) return false;
      const reset = () => {
        pinyin?.style.removeProperty('font-size');
        meaning?.style.removeProperty('font-size');
      };
      delete el.dataset['stacked'];
      reset();
      const state = () => {
        const gBox = glyphs.getBoundingClientRect();
        const fBox = facts.getBoundingClientRect();
        const wrapped = gBox.height > 0 && fBox.top >= gBox.bottom - 1;
        const pinyinLines = pinyin ? lineCount(pinyin) : 1;
        const meaningLines = meaning ? lineCount(meaning) : 1;
        return { wrapped, pinyinLines, meaningLines };
      };
      const initial = state();
      if (!initial.wrapped && initial.pinyinLines <= 1 && initial.meaningLines <= 1) return false;
      const basePinyin = pinyin ? parseFloat(getComputedStyle(pinyin).fontSize) || 0 : 0;
      const baseMeaning = meaning ? parseFloat(getComputedStyle(meaning).fontSize) || 0 : 0;
      const floor = Math.min(MEANING_FONT_FLOOR, 9.5);
      const base = basePinyin || baseMeaning;
      const max = Math.max(sideTextMaxStep(base), Math.min(4, Math.max(0, base - floor)));
      let bestSideStep = 0;
      for (let step = 0.5; step <= max + 0.001; step += 0.5) {
        if (pinyin && basePinyin) pinyin.style.fontSize = `${Math.max(floor, basePinyin - step)}px`;
        if (meaning && baseMeaning) meaning.style.fontSize = `${Math.max(floor, baseMeaning - step)}px`;
        const next = state();
        if (!next.wrapped && next.pinyinLines <= 1 && next.meaningLines <= 1) return false;
        if (!bestSideStep && !next.wrapped && next.pinyinLines <= 1) bestSideStep = step;
      }
      if (bestSideStep > 0) {
        if (pinyin && basePinyin) pinyin.style.fontSize = `${Math.max(floor, basePinyin - bestSideStep)}px`;
        if (meaning && baseMeaning) meaning.style.fontSize = `${Math.max(floor, baseMeaning - bestSideStep)}px`;
        return false;
      }
      reset();
      const wrapped = state().wrapped;
      if (wrapped) el.dataset['stacked'] = '';
      return wrapped;
    },
  });
  return <div ref={ref} className="glyph-usage-reference">{children}</div>;
}

/** Characters-only word bank from the live workspace. Shared small cards keep
 * exact vocabulary links and whole-word audio independent of character hints;
 * Show all reveals every matching record inside the shared bounded scroller. */
export function CharacterWordsSection({ entry }: { entry: LibraryEntry }) {
  const { items, preferences } = useWorkspace();
  const matches = useMemo(() => characterWords(entry.hanzi, items, preferences.includeTraditional), [entry.hanzi, items, preferences.includeTraditional]);
  const WordsIcon = sectionIcons.Words;
  return <ExampleSection id="word" label="In a word" icon={WordsIcon}>
    {!matches.length ? <p className="library-note">No recorded multi-character words yet.</p> : <SentenceHints backLabel={entry.hanzi}>
      <ExpandableCharacterGrid key={entry.id} initialCount={6} cards={matches.map(word => {
        const hsk = wordHskPill(word);
        const hint = openDetailsHint(word.hanzi, 'word');
        const own = { hanzi: word.hanzi, pinyin: word.pinyin, meaning: word.meaning, search: { tab: 'word' as const, word: word.id }, audio: word.audio };
        return <div className="glyph-usage-example glyph-parent-card" key={word.id}>
          <ExampleCardMeta identity={hsk ? <span className="word-hsk-id hsk-level-pill" title={hsk.title}>{hsk.label}</span> : <UsageLabel rank={null} compact/>} link={<Link to="/vocabulary" search={{ tab: 'word', word: word.id }} resetScroll={false} className="detail-arrow-link" title={hint} aria-label={hint}><ArrowUpRight aria-hidden="true"/></Link>}/>
          <WordExampleReference word={word}>
            <span className="pinyin-character-glyphs word-example-glyphs" style={wordTileFit(word.hanzi).style}>{Array.from(word.hanzi).map((glyph, index) => <SoundExampleGlyph key={index} glyph={glyph} word={own} className={word.script === 'Traditional' ? 'traditional-character' : ''} fallback={<Button asChild variant="ghost" className={`decomposition-glyph${word.script === 'Traditional' ? ' traditional-character' : ''}`}><Link to="/vocabulary" search={{ tab: 'word', word: word.id }} resetScroll={false} title={hint}><strong lang="zh-CN">{glyph}</strong></Link></Button>}/>)}</span>
            <span className="glyph-usage-facts">
              {preferences.pinyin && word.pinyin && <span className="glyph-usage-facts-row"><span className="example-pinyin-row"><span className="pinyin">{word.pinyin}</span><ExamplePronunciation request={{ text: word.hanzi, reading: word.pinyin, audio: word.audio ?? null }} label={word.hanzi}/></span></span>}
              <SmallGridMeaning text={word.meaning}/>
            </span>
          </WordExampleReference>
        </div>;
      })}/>
    </SentenceHints>}
  </ExampleSection>;
}

/** Optional sourced examples, fetched only for a Characters detail card.
 * Vocabulary/lessons stay first and Tatoeba may add a separately annotated
 * sentence. Bind state to the exact record so navigation cannot flash old text.
 */
function useFallbackExample(recordId: string, enabled: boolean, lessonEnabled: boolean) {
  const [loaded, setLoaded] = useState<{ recordId: string; hsk: CharacterHskExample | null; tatoeba: CharacterTatoebaExample | null; done: boolean } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      const tatoebaRequest = loadCharacterTatoebaExample(recordId);
      const hsk = lessonEnabled ? await loadCharacterHskExample(recordId) : null;
      if (cancelled) return;
      setLoaded({ recordId, hsk, tatoeba: null, done: false });
      const tatoeba = await tatoebaRequest;
      if (!cancelled) setLoaded({ recordId, hsk, tatoeba, done: true });
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
  const examples = useMemo(() => glyphUsage(entry, kind, items, libraryEntries('Characters'), preferences.includeTraditional, Infinity), [entry, kind, items, preferences.includeTraditional, catalogVersion]);
  const fallback = useFallbackExample(entry.id, kind === 'Characters', examples.length === 0);
  const fallbackLoading = kind === 'Characters' && !fallback?.done;
  const hskExample = fallback?.hsk;
  const tatoeba = fallback?.tatoeba && isLearningExample(fallback.tatoeba) ? fallback.tatoeba : null;
  const gSourceParents = useGSourceParents(entry, kind, preferences.includeTraditional, catalogVersion);
  const radicalParents = useRadicalParents(entry, kind, preferences.includeTraditional, catalogVersion, familyGlyph);
  const loadedParents = kind === 'Components' ? gSourceParents : radicalParents;
  const parents = loadedParents ?? [];
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
  if (kind === 'Components' || kind === 'Radicals') return <ExampleSection id="character" label="In a character" icon={Puzzle} available={loadedParents === null || parents.length > 0}>
    {loadedParents === null ? <SectionPlaceholder heading={null} label="In a character" shape="tiles"/> : <ExpandableCharacterGrid key={`${kind}:${entry.id}:${familyGlyph ?? ''}:${preferences.includeTraditional}`} initialCount={6} cards={parents.map(parent => {
      const rank = usageOrder.loaded ? usageRank(parent, 'Characters', preferences.includeTraditional) : null;
      return <div className="glyph-usage-example glyph-parent-card" key={parent.id}>
        <ExampleCardMeta identity={<><UsageLabel rank={rank} kind="Characters" compact/>{parent.script === 'Traditional' && <span className="word-hsk-id traditional-pill" title="Traditional-form record">Traditional</span>}</>} link={<Link to="/characters" search={{ tab: 'Characters', id: parent.id }} resetScroll={false} className="detail-arrow-link" title={openDetailsHint(parent.hanzi, 'Characters')} aria-label={openDetailsHint(parent.hanzi, 'Characters')}><ArrowUpRight aria-hidden="true"/></Link>}/>
        <div className="glyph-usage-reference">
          {/* Traditional parents keep the purple tile used everywhere else; script comes from exact record metadata, never shape inference. A parent that is itself a sourced Kangxi radical wears the gold 部 stamp. */}
          <Button asChild variant="ghost" className={`decomposition-glyph${parent.script === 'Traditional' ? ' traditional-character' : ''}${radicalIdentity(parent.hanzi).radicals.length ? ' is-radical' : ''}`}><Link to="/characters" search={{ tab: 'Characters', id: parent.id }} resetScroll={false} title={openDetailsHint(parent.hanzi, 'Characters')} aria-label={openDetailsHint(parent.hanzi, 'Characters')}><strong lang="zh-CN">{parent.hanzi}</strong></Link></Button>
          {/* Two lines beside the tile: reading + speaker on top, meaning below. Rank (+ Traditional
              pill) sits in the card header above, matching phrase and idiom small grid cards. */}
          <span className="glyph-usage-facts">
            {preferences.pinyin && parent.pinyin && <span className="glyph-usage-facts-row">
              <span className="example-pinyin-row">{isMultiReading(parent.pinyin) ? <MultiReadingSpeakers spoken={parent.hanzi} reading={parent.pinyin} variant="example"/> : <><span className="pinyin">{parent.pinyin}</span><ExamplePronunciation request={characterAudioRequest(parent.hanzi, parent.pinyin)} label={`character ${parent.hanzi}`}/></>}</span>
            </span>}
            <SmallGridMeaning text={parent.meaning}/>
          </span>
        </div>
      </div>;
    })}/>}
  </ExampleSection>;
  // "In a phrase" always shows for characters, even with no recorded example, so
  // External search of the exact hanzi is always reachable. Imported file names
  // and review status identifiers are internal metadata, not learner hints.
  const sentenceExamples = examples.map(({ word, sentence }) => {
    // Header line inside the card: this record's own HSK level/ID pill and its primary
    // recorded subtopic, each shown only when recorded (wordHskPill / primarySubtopicLabel
    // return nothing rather than a guess). Same shape as the idiom cards' rank · topic line.
    const hsk = wordHskPill(word);
    return <div className="glyph-usage-example" key={word.id}>
      <ExampleCardMeta identity={hsk && <span className="word-hsk-id hsk-level-pill" title={hsk.title}>{hsk.label}</span>} topic={primarySubtopicLabel(word)}/>
      <SentenceExample heading="" sentence={sentence ? word.sentence : word.hanzi} pinyin={sentence ? word.sentencePinyin : word.pinyin} translation={sentence ? word.translation : word.meaning} audioRequest={sentence ? { text: word.sentence, reading: word.sentencePinyin ?? null, audio: word.entry?.examples[0]?.audio ?? null } : { ...characterAudioRequest(word.hanzi, word.pinyin), audio: word.audio ?? null }}/>
    </div>;
  });
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
    {sentenceExamples.length > 0 ? <MoreExamples key={entry.id} examples={sentenceExamples} initialCount={2}/> : fallbackLoading ? <SectionPlaceholder heading={null} label="In a phrase" shape="cards" rows={2}/> : null}
  </SentenceSection>;
}

/** All ranked idioms containing the exact Characters record, loaded lazily. */
export function CharacterIdiomsSection({ entry }: { entry: LibraryEntry }) {
  return <WrittenFormIdiomsSection entry={entry}/>;
}

/** Shared character/word examples: exact whole written-form containment only,
 * never a semantic association or a match against individual characters of a word. */
export function WrittenFormIdiomsSection({ entry }: { entry: { id: string; hanzi: string; script?: string | undefined } }) {
  const [idioms, setIdioms] = useState<Word[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadIdioms()
      .then(({ words }) => { if (!cancelled) setIdioms(words); })
      .catch(() => { if (!cancelled) setIdioms([]); });
    return () => { cancelled = true; };
  }, []);
  const matches = useMemo(() => (idioms ? idiomsForCharacter(idioms, entry.hanzi, entry.script, Infinity) : []), [idioms, entry.hanzi, entry.script]);
  const sectionRef = useSentenceSectionLayout(entry.id, matches);
  return <ExampleSection id="idiom" label="In an idiom" icon={ScrollText} available={idioms === null || matches.length > 0} sectionRef={sectionRef} className="glyph-usage-section sentence-section idiom-examples-section">
    {idioms === null ? <SectionPlaceholder heading={null} label="In an idiom" shape="cards" rows={2}/> : <SentenceHints backLabel={entry.hanzi}>
      <ExpandableCharacterGrid key={entry.id} initialCount={2} layout="list" label="All idiom examples" searchTexts={matches.map(idiom => `${idiom.hanzi} ${idiom.idiomMeta?.traditional ?? ''} ${idiom.pinyin} ${idiom.meaning}`)} cards={matches.map(idiom => {
        const showTrad = entry.script === 'Traditional' && Boolean(idiom.idiomMeta?.traditional?.includes(entry.hanzi));
        const display = showTrad ? (idiom.idiomMeta?.traditional ?? idiom.hanzi) : idiom.hanzi;
        const topicLabel = primarySubtopicLabel(idiom) ?? idiom.collection;
        return <div className="glyph-usage-example" key={idiom.id}>
          <ExampleCardMeta identity={<UsageLabel rank={idiom.idiomMeta?.rank ?? null} scale="idiom" compact/>} topic={topicLabel}/>
          <SentenceExample
            heading=""
            sentence={display}
            pinyin={idiom.pinyin}
            translation={idiom.meaning}
            audioRequest={{ text: idiom.hanzi, reading: idiom.pinyin, audio: idiom.audio ?? null }}
          />
        </div>;
      })}/>
    </SentenceHints>}
  </ExampleSection>;
}

import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { MessageSquareText, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { libraryEntries, type LibraryEntry, type LibraryKind } from '@/lib/character-library';
import { glyphUsage, glyphParentCharacters, glyphParentCharactersGSource } from '@/lib/glyph-usage';
import { useWorkspace } from './workspace';
import { MeaningText } from './meaning-text';
import { SentenceExample } from './sentence-example';
import { ExamplePronunciation } from './example-pronunciation';
import { characterAudioRequest } from '@/lib/catalog-store';

/** Component parents resolve through lazily loaded BabelStone G-source trees; null while loading. */
export function useGSourceParents(entry: LibraryEntry, kind: LibraryKind, includeTraditional: boolean, catalogVersion: number): LibraryEntry[] | null {
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

export function GlyphUsageExamples({ entry, kind, familyGlyph }: { entry: LibraryEntry; kind: LibraryKind; familyGlyph?: string | undefined }) {
  const { items, preferences, catalogVersion } = useWorkspace();
  const examples = useMemo(() => glyphUsage(entry, kind, items, libraryEntries('Characters'), preferences.includeTraditional), [entry, kind, items, preferences.includeTraditional, catalogVersion]);
  const gSourceParents = useGSourceParents(entry, kind, preferences.includeTraditional, catalogVersion);
  const radicalParents = useMemo(() => kind === 'Radicals' ? glyphParentCharacters(entry, kind, libraryEntries('Characters'), preferences.includeTraditional, familyGlyph) : [], [entry, kind, familyGlyph, preferences.includeTraditional, catalogVersion]);
  const parents = (kind === 'Components' ? gSourceParents : radicalParents)?.slice(0, 6) ?? [];
  if (kind === 'Components' || kind === 'Radicals') return <section className="glyph-usage-section" aria-label="In a character">
    <h3 className="eyebrow"><Type size={13} aria-hidden="true"/>IN A CHARACTER</h3>
    {parents.length ? parents.map(parent => <div className="glyph-usage-reference" key={parent.id}>
      {/* Traditional parents keep the purple tile used everywhere else; script comes from exact record metadata, never shape inference. */}
      <Button asChild variant="ghost" className={`decomposition-glyph${parent.script === 'Traditional' ? ' traditional-character' : ''}`}><Link to="/characters" search={{ tab: 'Characters', id: parent.id }} resetScroll={false} aria-label={`Open character ${parent.hanzi}`}><strong lang="zh-CN">{parent.hanzi}</strong></Link></Button>
      {preferences.pinyin && parent.pinyin && <span className="example-pinyin-row"><span className="pinyin">{parent.pinyin}</span><ExamplePronunciation request={characterAudioRequest(parent.hanzi, parent.pinyin)} label={`character ${parent.hanzi}`}/></span>}
      <span className="glyph-usage-meaning"><MeaningText text={parent.meaning}/></span>
    </div>) : kind === 'Components' && gSourceParents === null ? null : <div className="record-gap"><p>{kind === 'Radicals' ? 'No characters with this recorded radical assignment and exact form in their breakdown are available.' : 'No characters with this exact component in their recorded BabelStone G-source breakdown are available.'}</p></div>}
  </section>;
  return <section className="glyph-usage-section" aria-label="In a sentence">
    <h3 className="eyebrow"><MessageSquareText size={13} aria-hidden="true"/>IN A SENTENCE</h3>
    {examples.length ? examples.map(({ word, sentence }) => <div className="glyph-usage-example" key={word.id}>
      <SentenceExample heading="" sentence={sentence ? word.sentence : word.hanzi} pinyin={sentence ? word.sentencePinyin : word.pinyin} translation={sentence ? word.translation : word.meaning} audioRequest={sentence ? { text: word.sentence, reading: word.sentencePinyin ?? null, audio: word.entry?.examples[0]?.audio ?? null } : { ...characterAudioRequest(word.hanzi, word.pinyin), audio: word.audio ?? null }} />
    </div>) : <div className="record-gap"><p>{kind === 'Strokes' ? 'No recorded stroke-to-character usage examples available.' : 'No existing usage examples available in the current vocabulary.'}</p></div>}
  </section>;
}

import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { MessageSquareText, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { libraryEntries, type LibraryEntry, type LibraryKind } from '@/lib/character-library';
import { glyphUsage, glyphParentCharacters } from '@/lib/glyph-usage';
import { vocabularyKind } from '@/lib/mandarin';
import { useWorkspace } from './workspace';
import { SentenceExample } from './sentence-example';
import { ExamplePronunciation } from './example-pronunciation';
import { characterAudioRequest } from '@/lib/catalog-store';

export function GlyphUsageExamples({ entry, kind }: { entry: LibraryEntry; kind: LibraryKind }) {
  const { items, preferences, catalogVersion } = useWorkspace();
  const examples = useMemo(() => glyphUsage(entry, kind, items, libraryEntries('Characters'), preferences.includeTraditional), [entry, kind, items, preferences.includeTraditional, catalogVersion]);
  const parents = useMemo(() => glyphParentCharacters(entry, kind, libraryEntries('Characters'), preferences.includeTraditional).slice(0, 6), [entry, kind, preferences.includeTraditional, catalogVersion]);
  if (kind === 'Components' || kind === 'Radicals') return <section className="glyph-usage-section" aria-label="In a character">
    <h3 className="eyebrow"><Type size={13} aria-hidden="true"/>IN A CHARACTER</h3>
    {parents.length ? parents.map(parent => <div className="glyph-usage-reference" key={parent.id}>
      <Button asChild variant="ghost" className="decomposition-glyph"><Link to="/characters" search={{ tab: 'Characters', id: parent.id }} resetScroll={false} aria-label={`Open character ${parent.hanzi}`}><strong lang="zh-CN">{parent.hanzi}</strong></Link></Button>
      {preferences.pinyin && parent.pinyin && <span className="example-pinyin-row"><span className="pinyin">{parent.pinyin}</span><ExamplePronunciation request={characterAudioRequest(parent.hanzi, parent.pinyin)} label={`character ${parent.hanzi}`}/></span>}
      <span className="glyph-usage-meaning">{parent.meaning}</span>
    </div>) : <div className="record-gap"><p>{kind === 'Radicals' ? 'No characters with this recorded radical assignment are available.' : 'No characters with this exact component in their recorded breakdown are available.'}</p></div>}
  </section>;
  return <section className="glyph-usage-section" aria-label="In a sentence">
    <h3 className="eyebrow"><MessageSquareText size={13} aria-hidden="true"/>IN A SENTENCE</h3>
    {examples.length ? examples.map(({ word, sentence }) => <div className="glyph-usage-example" key={word.id}>
      <SentenceExample heading="" sentence={sentence ? word.sentence : word.hanzi} pinyin={sentence ? word.sentencePinyin : word.pinyin} translation={sentence ? word.translation : word.meaning} audioRequest={sentence ? { text: word.sentence, reading: word.sentencePinyin ?? null, audio: word.entry?.examples[0]?.audio ?? null } : { ...characterAudioRequest(word.hanzi, word.pinyin), audio: word.audio ?? null }} />
      <div className="glyph-usage-reference"><Link to="/vocabulary" search={{ word: word.id, tab: vocabularyKind(word) }} title={`Open ${word.hanzi} in Vocabulary`} lang="zh-CN">{word.hanzi}</Link>{preferences.pinyin && word.pinyin && <span className="example-pinyin-row"><span className="pinyin">{word.pinyin}</span><ExamplePronunciation request={{ ...characterAudioRequest(word.hanzi, word.pinyin), audio: word.audio ?? null }} label={`word ${word.hanzi}`}/></span>}<span className="glyph-usage-meaning">{word.meaning}</span></div>
    </div>) : <div className="record-gap"><p>{kind === 'Strokes' ? 'No recorded stroke-to-character usage examples available.' : 'No existing usage examples available in the current vocabulary.'}</p></div>}
  </section>;
}

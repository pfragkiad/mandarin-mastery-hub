import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { MessageSquareText } from 'lucide-react';
import { libraryEntries, type LibraryEntry, type LibraryKind } from '@/lib/character-library';
import { glyphUsage } from '@/lib/glyph-usage';
import { vocabularyKind } from '@/lib/mandarin';
import { useWorkspace } from './workspace';
import { SentenceExample } from './sentence-example';
import { ExamplePronunciation } from './example-pronunciation';
import { characterAudioRequest } from '@/lib/catalog-store';

export function GlyphUsageExamples({ entry, kind }: { entry: LibraryEntry; kind: LibraryKind }) {
  const { items, preferences, catalogVersion } = useWorkspace();
  const examples = useMemo(() => glyphUsage(entry, kind, items, libraryEntries('Characters'), preferences.includeTraditional), [entry, kind, items, preferences.includeTraditional, catalogVersion]);
  return <section className="glyph-usage-section" aria-label="In a sentence">
    <h3 className="eyebrow"><MessageSquareText size={13} aria-hidden="true"/>IN A SENTENCE</h3>
    {examples.length ? examples.map(({ word, sentence, matchedGlyph }) => <div className="glyph-usage-example" key={word.id}>
      <SentenceExample heading="" sentence={sentence ? word.sentence : word.hanzi} pinyin={sentence ? word.sentencePinyin : word.pinyin} translation={sentence ? word.translation : word.meaning} audioRequest={sentence ? { text: word.sentence, reading: word.sentencePinyin, audio: word.entry?.examples[0]?.audio ?? null } : { ...characterAudioRequest(word.hanzi, word.pinyin), audio: word.audio ?? null }} />
      <div className="glyph-usage-reference"><Link to="/vocabulary" search={{ word: word.id, tab: vocabularyKind(word) }} title={`Open ${word.hanzi} in Vocabulary`} lang="zh-CN">{word.hanzi}</Link>{preferences.pinyin && word.pinyin && <span className="example-pinyin-row"><span className="pinyin">{word.pinyin}</span><ExamplePronunciation request={{ ...characterAudioRequest(word.hanzi, word.pinyin), audio: word.audio ?? null }} label={`word ${word.hanzi}`}/></span>}<span className="glyph-usage-meaning">{word.meaning}</span></div>
      {kind !== 'Characters' && <p className="glyph-usage-relation">{kind === 'Radicals' ? 'Dictionary radical of' : 'In the recorded breakdown of'} <span lang="zh-CN">{matchedGlyph}</span></p>}
    </div>) : <div className="record-gap"><p>{kind === 'Strokes' ? 'No recorded stroke-to-character usage examples available.' : 'No existing usage examples available in the current vocabulary.'}</p></div>}
  </section>;
}

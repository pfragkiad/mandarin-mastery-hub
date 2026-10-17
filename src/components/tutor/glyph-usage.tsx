import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { MessageSquareText } from 'lucide-react';
import { libraryEntries, type LibraryEntry, type LibraryKind } from '@/lib/character-library';
import { glyphUsage } from '@/lib/glyph-usage';
import { vocabularyKind } from '@/lib/mandarin';
import { useWorkspace } from './workspace';
import { SentenceExample } from './sentence-example';

export function GlyphUsageExamples({ entry, kind }: { entry: LibraryEntry; kind: LibraryKind }) {
  const { items, preferences, catalogVersion } = useWorkspace();
  const examples = useMemo(() => glyphUsage(entry, kind, items, libraryEntries('Characters'), preferences.includeTraditional), [entry, kind, items, preferences.includeTraditional, catalogVersion]);
  return <section className="glyph-usage-section" aria-label="In a sentence">
    {examples.length ? examples.map(({ word, sentence, matchedGlyph }) => <div className="glyph-usage-example" key={word.id}>
      <SentenceExample sentence={sentence ? word.sentence : word.hanzi} pinyin={sentence ? word.sentencePinyin : word.pinyin} translation={sentence ? word.translation : word.meaning} />
      <Link to="/vocabulary" search={{ word: word.id, tab: vocabularyKind(word) }} className="glyph-usage-reference" title={`Open ${word.hanzi} in Vocabulary`}><span lang="zh-CN">{word.hanzi}</span>{preferences.pinyin && word.pinyin && <span className="pinyin">{word.pinyin}</span>}<span className="glyph-usage-meaning">{word.meaning}</span></Link>
      {kind !== 'Characters' && <p className="glyph-usage-relation">{kind === 'Radicals' ? 'Dictionary radical of' : 'In the recorded breakdown of'} <span lang="zh-CN">{matchedGlyph}</span></p>}
    </div>) : <div className="glyph-usage-empty"><span className="eyebrow"><MessageSquareText size={13} aria-hidden="true"/>IN A SENTENCE</span><p className="decomposition-note">{kind === 'Strokes' ? 'No recorded stroke-to-character usage examples available.' : 'No existing usage examples available in the current vocabulary.'}</p></div>}
  </section>;
}
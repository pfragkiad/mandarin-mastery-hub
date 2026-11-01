import { SourceInfo } from '@/components/tutor/source-info';
import { MeaningText } from './meaning-text';
import { Link } from '@tanstack/react-router';
import { GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { catalog, characterAudioRequest } from '@/lib/catalog-store';
import { glyphIndex, libraryDestination, TREE_SOURCE } from '@/lib/character-library';
import { vocabularyKind, type Word } from '@/lib/mandarin';
import { phraseParts, wordCharacters, isChineseGlyph } from '@/lib/vocabulary-decomposition';
import { useWorkspace } from './workspace';
import { CharacterDecomposition } from './character-enrichment';
import { ExamplePronunciation } from './example-pronunciation';

/** Shared vocabulary breakdown: matched phrase words keep their own record/readings/audio,
 * while individual glyph boxes link independently to character records. */
export function VocabularyDecomposition({ word }: { word: Word }) {
  const { items, preferences, catalogVersion } = useWorkspace();
  const phrase = vocabularyKind(word) === 'phrase';
  const characters = wordCharacters(word);
    return <div className="decomposition-section vocabulary-decomposition">
    <h3 className="eyebrow"><GitBranch size={13} aria-hidden="true"/>DECOMPOSITION<SourceInfo inline className="detail-footnote decomposition-footnote">{phrase ? <>Source · {word.entry?.sourceName ?? 'Added this session'}<br/>Text matched to vocabulary records · not a verified grammatical analysis</> : <>Breakdowns follow source priority · BabelStone G-source first, then the recorded Hanzi graphical structure when it differs.<br/>IDS describes graphical structure only · not verified etymology or stroke geometry.<br/>Components link to their library cards.</>}</SourceInfo></h3>
    {phrase ? <>
      <ul className="decomposition-tree vocabulary-parts">{phraseParts(word, items).filter(part => part.word || isChineseGlyph(part.text)).map((part, index) => {
        // Without a matching word, a single glyph can still have a recorded character card,
        // reading or breakdown; only a glyph with none of these is truly unrecorded.
        const single = Array.from(part.text).filter(isChineseGlyph).length === 1 ? part.text : '';
        const facts = single ? glyphIndex()[single] : undefined;
        const readings = single ? Object.keys(catalog.readingAudio[single] ?? {}) : [];
        const reading = facts?.pinyin || (readings.length === 1 ? readings[0] : '') || '';
        const tree = single ? catalog.trees[single] : undefined;
        const recorded = Boolean(part.word || facts || reading || tree);
        return <li key={index}><div className="decomposition-part">
        <div className="phrase-part-characters">{Array.from(part.text).filter(isChineseGlyph).map((glyph, glyphIndex) => {
          const destination = libraryDestination(glyph, preferences.includeTraditional);
          return destination ? <Button key={glyphIndex} asChild variant="ghost" className="decomposition-glyph"><Link to="/characters" search={destination} resetScroll={false} aria-label={`Open character ${glyph}`}><strong lang="zh-CN">{glyph}</strong></Link></Button> : <strong key={glyphIndex} lang="zh-CN" className="decomposition-glyph decomposition-glyph-static">{glyph}</strong>;
        })}</div>
        <div className="vocabulary-part-facts">{part.word ? <><span className="example-pinyin-row"><Link className="pinyin" to="/vocabulary" search={{ tab: 'word', word: part.word.id }} resetScroll={false} aria-label={`Study word ${part.text}`}><span lang="zh-CN">{part.text}</span> {part.word.pinyin}</Link><ExamplePronunciation request={{ ...characterAudioRequest(part.word.hanzi, part.word.pinyin), audio: part.word.audio ?? null }} label={`word ${part.text}`}/></span><small><MeaningText text={part.word.meaning}/></small></> : recorded ? <><span className="example-pinyin-row"><span className="pinyin">{reading || '—'}</span>{reading && <ExamplePronunciation request={characterAudioRequest(single, reading)} label={`character ${single}`}/>}</span><small>{facts?.meaning ? <MeaningText text={facts.meaning}/> : 'No word or character card recorded'}</small></> : <small>No matching word or character recorded</small>}</div>
      </div>{!part.word && tree ? <CharacterDecomposition character={single} tree={tree} source={TREE_SOURCE}/> : null}</li>;
      })}</ul>
    </> : <>
      {!catalogVersion && <p className="library-note">Loading character data…</p>}
      <ul className="decomposition-tree vocabulary-parts">{characters.map((part, index) => {
        const destination = libraryDestination(part.text, preferences.includeTraditional);
        const facts = glyphIndex()[part.text];
        const tree = catalog.trees[part.text];
        return <li key={index}><div className="decomposition-part">
          {destination ? <Button asChild variant="ghost" className="decomposition-glyph"><Link to="/characters" search={destination} resetScroll={false} aria-label={`Open character ${part.text}`}><strong lang="zh-CN">{part.text}</strong></Link></Button> : <strong lang="zh-CN" className="decomposition-glyph decomposition-glyph-static">{part.text}</strong>}
          <div className="vocabulary-part-facts"><span className="example-pinyin-row"><span className="pinyin">{part.pinyin || facts?.pinyin || '—'}</span><ExamplePronunciation request={characterAudioRequest(part.text, part.pinyin || facts?.pinyin)} label={`character ${part.text}`}/></span><small>{facts?.meaning || 'Meaning not recorded'}</small></div>
        </div>{tree ? <CharacterDecomposition character={part.text} tree={tree} source={TREE_SOURCE}/> : Boolean(catalogVersion) && <p className="library-note">No recorded character breakdown.</p>}</li>;
      })}</ul>
    </>}
  </div>;
}

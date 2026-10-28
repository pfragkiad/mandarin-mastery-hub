import { SourceInfo } from '@/components/tutor/source-info';
import { Link } from '@tanstack/react-router';
import { GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { catalog } from '@/lib/catalog-store';
import { glyphIndex, libraryDestination, TREE_SOURCE } from '@/lib/character-library';
import { vocabularyKind, type Word } from '@/lib/mandarin';
import { phraseParts, wordCharacters, isChineseGlyph } from '@/lib/vocabulary-decomposition';
import { DecompositionTree } from './decomposition-tree';
import { useWorkspace } from './workspace';
import { CharacterEnrichmentNotes } from './character-enrichment';

export function VocabularyDecomposition({ word }: { word: Word }) {
  const { items, preferences, catalogVersion } = useWorkspace();
  const phrase = vocabularyKind(word) === 'phrase';
  const characters = wordCharacters(word);
  const hasTrees = characters.some(part => catalog.trees[part.text]);
  return <div className="decomposition-section vocabulary-decomposition">
    <h3 className="eyebrow"><GitBranch size={13} aria-hidden="true"/>DECOMPOSITION<SourceInfo inline className="detail-footnote decomposition-footnote">{phrase ? <>Source · {word.entry?.sourceName ?? 'Added this session'}<br/>Text matched to vocabulary records · not a verified grammatical analysis</> : <>Source · Unicode Unihan 17.0.0{hasTrees && <> · {TREE_SOURCE}<br/>Imported graphical structure · not verified etymology</>}</>}</SourceInfo></h3>
    {phrase ? <>
      <ul className="decomposition-tree vocabulary-parts">{phraseParts(word, items).filter(part => part.word || isChineseGlyph(part.text)).map((part, index) => <li key={index}><div className="decomposition-part">
        {part.word ? <Button asChild variant="ghost" className="decomposition-glyph"><Link to="/vocabulary" search={{ tab: 'word', word: part.word.id }} resetScroll={false} aria-label={`Study word ${part.text}`}><strong lang="zh-CN">{part.text}</strong></Link></Button> : <strong lang="zh-CN" className="decomposition-glyph decomposition-glyph-static">{part.text}</strong>}
        <div className="vocabulary-part-facts">{part.word ? <><span className="pinyin">{part.word.pinyin}</span><small>{part.word.meaning}</small></> : <small>No matching word recorded</small>}</div>
      </div></li>)}</ul>
    </> : <>
      {!catalogVersion && <p className="library-note">Loading character data…</p>}
      <ul className="decomposition-tree vocabulary-parts">{characters.map((part, index) => {
        const destination = libraryDestination(part.text, preferences.includeTraditional);
        const facts = glyphIndex()[part.text];
        const tree = catalog.trees[part.text];
        return <li key={index}><div className="decomposition-part">
          {destination ? <Button asChild variant="ghost" className="decomposition-glyph"><Link to="/characters" search={destination} resetScroll={false} aria-label={`Open character ${part.text}`}><strong lang="zh-CN">{part.text}</strong></Link></Button> : <strong lang="zh-CN" className="decomposition-glyph decomposition-glyph-static">{part.text}</strong>}
          <div className="vocabulary-part-facts"><span className="pinyin">{part.pinyin || facts?.pinyin || '—'}</span><small>{facts?.meaning || 'Meaning not recorded'}</small></div>
        </div>{tree ? <><ul><DecompositionTree node={tree}/></ul><CharacterEnrichmentNotes character={part.text} tree={tree}/></> : Boolean(catalogVersion) && <p className="library-note">No recorded character breakdown.</p>}</li>;
      })}</ul>
    </>}
  </div>;
}
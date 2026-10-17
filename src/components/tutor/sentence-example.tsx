import { Link } from '@tanstack/react-router';
import { libraryDestination } from '@/lib/character-library';
import { useWorkspace } from './workspace';

export function SentenceExample({ sentence, pinyin, translation, heading = 'IN A SENTENCE', onNavigate }: { sentence: string; pinyin?: string | undefined; translation?: string; heading?: string; onNavigate?: () => void }) {
  const { preferences } = useWorkspace();
  return <div className="sentence">
    {heading && <span className="eyebrow">{heading}</span>}
    {preferences.pinyin && pinyin && <span className="pinyin sentence-pinyin">{pinyin}</span>}
    <p lang="zh-CN">{Array.from(sentence).map((ch, i) => {
      const dest = /[㐀-鿿豈-﫿]/.test(ch) ? libraryDestination(ch, preferences.includeTraditional) : undefined;
      return dest ? <Link key={i} to="/characters" search={dest} className="sentence-char" title={`Open ${ch} in Glyphs`} onClick={onNavigate}>{ch}</Link> : <span key={i}>{ch}</span>;
    })}</p>
    {translation && <span>{translation}</span>}
  </div>;
}
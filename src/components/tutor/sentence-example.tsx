import { Link } from '@tanstack/react-router';
import { MessageSquareText } from 'lucide-react';
import { libraryDestination } from '@/lib/character-library';
import { useWorkspace } from './workspace';
import type { AudioRequest } from '@/lib/audio';
import { ExamplePronunciation } from './example-pronunciation';

export function SentenceExample({ sentence, pinyin, translation, heading = 'IN A SENTENCE', onNavigate, audioRequest }: { sentence: string; pinyin?: string | undefined; translation?: string; heading?: string; onNavigate?: () => void; audioRequest?: AudioRequest }) {
  const { preferences } = useWorkspace();
  return <div className="sentence">
    {heading && <span className="eyebrow"><MessageSquareText size={13} aria-hidden="true"/>{heading}</span>}
    {preferences.pinyin && pinyin && <span className="pinyin sentence-pinyin"><span>{pinyin}</span>{audioRequest && <ExamplePronunciation request={audioRequest} label={`sentence ${sentence}`}/>}</span>}
    <p lang="zh-CN">{Array.from(sentence).map((ch, i) => {
      const dest = /[㐀-鿿豈-﫿]/.test(ch) ? libraryDestination(ch, preferences.includeTraditional) : undefined;
      return dest ? <Link key={i} to="/characters" search={dest} className="sentence-char" title={`Open ${ch} in Glyphs`} onClick={onNavigate}>{ch}</Link> : <span key={i}>{ch}</span>;
    })}</p>
    {translation && <span>{translation}</span>}
  </div>;
}
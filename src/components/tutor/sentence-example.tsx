import { Link } from '@tanstack/react-router';
import { openDetailsHint } from '@/lib/tile-hints';
import { MeaningText } from './meaning-text';
import { MessageSquareText } from 'lucide-react';
import { libraryDestination } from '@/lib/character-library';
import { useWorkspace } from './workspace';
import type { AudioRequest } from '@/lib/audio';
import { ExamplePronunciation } from './example-pronunciation';

export function SentenceExample({ sentence, pinyin, translation, heading = 'IN A SENTENCE', onNavigate, audioRequest }: { sentence: string; pinyin?: string | undefined; translation?: string; heading?: string; onNavigate?: () => void; audioRequest?: AudioRequest }) {
  const { preferences } = useWorkspace();
  return <div className="sentence">
    {heading && <span className="eyebrow"><MessageSquareText size={13} aria-hidden="true"/>{heading}</span>}
    {preferences.pinyin && pinyin && <span className="pinyin sentence-pinyin"><span>{pinyin}</span><ExamplePronunciation request={audioRequest ?? { text: sentence, reading: pinyin ?? null, audio: null }} label={`sentence ${sentence}`}/></span>}
    <p className="sentence-hanzi" lang="zh-CN">{Array.from(sentence).map((ch, i) => {
      const dest = /[㐀-鿿豈-﫿]/.test(ch) ? libraryDestination(ch, preferences.includeTraditional) : undefined;
      return dest ? <Link key={i} to="/characters" search={dest} className="sentence-char" title={openDetailsHint(ch, dest.tab)} onClick={onNavigate}>{ch}</Link> : <span key={i}>{ch}</span>;
    })}</p>
    {translation && <span className="sentence-meaning"><MeaningText text={translation} sentence/></span>}
  </div>;
}
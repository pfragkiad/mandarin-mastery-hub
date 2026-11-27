import { useEffect, useState, type SyntheticEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { AudioLines, ArrowUpRight } from 'lucide-react';
import { loadTonePairs, type TonePairExample } from '@/lib/tone-pairs';
import type { Word } from '@/lib/mandarin';

/** Word counterpart of SoundChartLink: same icon/style, exact word ID and whole-word
 * recording, never a spelling-only match. The lazy bank is shared by every card. Tile
 * activation stays inside the owning button without opening its Details as well. */
export function TonePairLink({ word, variant }: { word: Word; variant: 'tile' | 'header' }) {
  const [row, setRow] = useState<TonePairExample | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    let live = true;
    if (Array.from(word.hanzi).length !== 2) return;
    loadTonePairs().then(data => {
      const exact = data.examples.find(e => e.inPairMatrix && e.vocabularyEntryId === word.id && e.headword === word.hanzi && e.sourceReading === word.pinyin && e.audio.url === word.audio?.url);
      if (live) setRow(exact ?? null);
    }, () => {});
    return () => { live = false; };
  }, [word]);
  if (!row || row.vocabularyEntryId !== word.id || row.headword !== word.hanzi || row.sourceReading !== word.pinyin || row.audio.url !== word.audio?.url) return null;
  const search = { pair: row.pair, example: row.id };
  const label = `Open ${word.hanzi} in Tone pairs`;
  const icon = <><AudioLines/><ArrowUpRight className="sound-chart-link-arrow" aria-hidden/></>;
  if (variant === 'tile') {
    const open = (event: SyntheticEvent) => { event.stopPropagation(); event.preventDefault(); void navigate({ to: '/pinyin/tone-pairs', search }); };
    return <span role="link" tabIndex={0} className="sound-chart-link is-tile" aria-label={label} title={label} onClick={open} onKeyDown={event => { if (event.key === 'Enter') open(event); }}>{icon}</span>;
  }
  return <Link to="/pinyin/tone-pairs" search={search} className="sound-chart-link" aria-label={label} title={label}>{icon}</Link>;
}
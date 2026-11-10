import { useEffect, useState, type MouseEvent, type SyntheticEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { AudioLines } from 'lucide-react';
import { historyEntry, soundChartArrival, soundTrail } from '@/lib/detail-trail';
import { loadSyllableInventory, soundChartTarget, toneMark, type PinyinSyllable } from '@/lib/pinyin-guide';

// Sound chart link shown beside a glyph's speaker (Glyphs cards and details windows only,
// never decomposition tiles). Purpose: open the exact syllable + tone card of the reading
// next to it, while the speaker keeps playing in place. The two look different on purpose:
// the speaker is a neutral control, this link uses the link colour, the Pinyin menu's
// AudioLines icon and a small gap, so a learner who only wants to listen does not navigate.
// Inputs: `reading` (one exact recorded reading; multi-reading glyphs render one link per
// reading), `from` (the glyph the Sound card's Back returns to) and `variant` ('tile' inside
// a card's own <button>, 'header' in a details window).
// State: the lazily loaded syllable inventory (module cache shared by every card). Until it
// arrives, or when the reading is no single attested syllable + tone, nothing renders.
// Back: following the link replaces soundTrail with one step pointing at this history entry,
// so the Sound card shows "← 了" and its Back (browser history) returns to the card/details;
// it also asks the chart to line the syllable's grid card up with the Selected sound card.

let cached: PinyinSyllable[] | null = null;
function useSyllables() {
  const [syllables, setSyllables] = useState(cached);
  useEffect(() => {
    if (cached) return;
    let live = true;
    loadSyllableInventory().then(list => { cached = list; if (live) setSyllables(list); }, () => undefined);
    return () => { live = false; };
  }, []);
  return syllables;
}

const plainClick = (event: MouseEvent) => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

export function SoundChartLink({ reading, from, variant }: { reading: string; from: string; variant: 'tile' | 'header' }) {
  const syllables = useSyllables();
  const navigate = useNavigate();
  const target = syllables ? soundChartTarget({ syllables }, reading) : null;
  if (!target) return null;
  const label = `Open ${toneMark(target.base, target.tone)} in Sound chart`;
  const search = { s: target.base, t: target.tone };
  const remember = () => { soundTrail.replace({ label: from, href: historyEntry(), lang: 'zh-CN' }); soundChartArrival.request(); };
  if (variant === 'tile') {
    // Inside the card's own <button> a real <a> is invalid markup, so this is a role="link"
    // span that swallows activation (like TileSpeaker) and navigates through the router.
    const open = (event: SyntheticEvent) => { event.stopPropagation(); event.preventDefault(); remember(); void navigate({ to: '/pinyin', search }); };
    return <span role="link" tabIndex={0} className="sound-chart-link is-tile" aria-label={label} title={label}
      onClick={open} onKeyDown={event => { if (event.key === 'Enter') open(event); }}><AudioLines/></span>;
  }
  return <Link to="/pinyin" search={search} className="sound-chart-link" aria-label={label} title={label}
    // Only a plain click sets the Back step; opening in a new tab leaves this tab's trail alone.
    onClick={event => { if (plainClick(event)) remember(); }}><AudioLines/></Link>;
}

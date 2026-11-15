import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRight, Shuffle, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DetailsIcon } from './practice-icons';
import { useWorkspace } from './workspace';
import { usePinyinPlayer, sound } from './pinyin-shared';
import { DiscoveryRowChevron, DiscoveryRowToggle } from './overview-discovery';
import { allSounds, loadPinyinData, randomRecordedSyllable, recordedTones, toneMark, type PinyinData, type PinyinSyllable } from '@/lib/pinyin-guide';

/**
 * Start page "Sounds" discovery card, the sixth beside Characters…Phrases.
 * State: the lazily loaded Pinyin data, the shown syllable and a load failure.
 * It shows a random syllable that has at least one human recording; the speaker
 * plays all its recorded tones in order, each tone chip plays just that tone and
 * the syllable opens it in the Sound chart. Neutral tones (never recorded) are not
 * offered. Phones (≤700px) show it as a collapsible row like the other random cards:
 * `open`/`onToggle` come from DiscoveryRowList; the row line shows the syllable and how
 * many tones are recorded, and the speaker + tone chips are its expandable detail. When the
 * speaker + chips fit whole on the row line beside the syllable they replace the "N recorded
 * tones" text there (and the open detail then drops its duplicate copy); `lineTones` is decided
 * by measurement (see useLineTonesFit), never by a guessed width.
 */
export function SoundDiscoveryTile({ open = false, onToggle = () => {} }: { open?: boolean; onToggle?: () => void }) {
  const { preferences } = useWorkspace();
  const [data, setData] = useState<PinyinData | null>(null);
  const [failed, setFailed] = useState(false);
  const [syllable, setSyllable] = useState<PinyinSyllable | null>(null);
  const player = usePinyinPlayer(data, preferences.slow);

  // Data loads after mount (it is a separate download), so the server render shows the loading note.
  useEffect(() => {
    let live = true;
    loadPinyinData().then(loaded => { if (live) { setData(loaded); setSyllable(randomRecordedSyllable(loaded)); } }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);

  const count = data ? allSounds(data).length : null;
  const tones = data && syllable ? recordedTones(data, syllable) : [];
  const shuffle = () => { if (!data) return; player.stop(); setSyllable(randomRecordedSyllable(data, syllable?.base)); };
  const playAll = () => { if (syllable) void player.sequence(tones.map(t => sound(syllable.base, t))); };
  const sectionRef = useRef<HTMLElement>(null);
  const lineTones = useLineTonesFit(sectionRef, `${syllable?.base ?? ''}|${tones.join('')}`);
  const countText = tones.length === 1 ? '1 recorded tone' : `${tones.length} recorded tones`;
  const toneButtons = (className: string) => syllable ? tones.map(t => {
    const id = sound(syllable.base, t).id;
    return <button key={t} type="button" className={`${className}${player.playing === id ? ' is-playing' : ''}`} aria-label={`Play ${toneMark(syllable.base, t)}, tone ${t}`} aria-pressed={player.playing === id} onClick={() => void player.play(sound(syllable.base, t))}>{toneMark(syllable.base, t)}</button>;
  }) : null;

  return (
    <section ref={sectionRef} className={`discovery-tile discovery-sound${open ? ' is-open' : ''}${lineTones ? ' has-line-tones' : ''}`} aria-label={`Sounds: ${count ?? '…'} recordings`}>
      <div className="discovery-tile-top">
        <Link to="/pinyin" className="discovery-tile-heading" aria-label="Open the Pinyin sound chart">
          <span className="stat-icon" aria-hidden="true"><Volume2/></span>
          <span className="discovery-tile-count">
            <strong>Sounds<ChevronRight aria-hidden="true"/></strong>
            <span>{count === null ? '—' : count.toLocaleString('en-US')}</span>
          </span>
        </Link>
        <DiscoveryRowToggle open={open} onToggle={onToggle} controls="discovery-body-sound" icon={<Volume2/>} label="Sounds" count={count}
          pick={syllable ? <span className="discovery-row-syllable">{syllable.base}</span> : failed ? 'Sounds could not load' : 'Loading sounds…'}
          line={syllable && !lineTones ? <span className="discovery-row-meaning">{countText}</span> : undefined}
          lineAction={syllable ? <span className={`discovery-row-tones${lineTones ? '' : ' is-measuring'}`} role="group" aria-label={`Tones of ${syllable.base}`} aria-hidden={lineTones ? undefined : true}>
            <Button variant="ghost" size="icon" aria-label={`Play every recorded tone of ${syllable.base}`} title="Play all tones · Recording" tabIndex={lineTones ? undefined : -1} onClick={player.sequencing ? player.stop : playAll}><Volume2/></Button>
            {toneButtons('discovery-sound-tone')}
          </span> : undefined}/>
        <Button variant="ghost" size="icon" title="Show another random sound" aria-label="Show another random sound" onClick={shuffle} disabled={!syllable}>
          <Shuffle />
        </Button>
        <DiscoveryRowChevron/>
      </div>
      <div className="discovery-tile-body" id="discovery-body-sound">
      {syllable ? (
        <div className="discovery-tile-record" aria-live="polite">
          <div className="discovery-record-pinyin">
            <span className="discovery-sound-count">{countText}</span>
            <Button variant="ghost" size="icon" aria-label={`Play every recorded tone of ${syllable.base}`} title="Play all tones · Recording" onClick={player.sequencing ? player.stop : playAll}>
              <Volume2 />
            </Button>
          </div>
          <Link to="/pinyin" search={{ s: syllable.base }} className="overview-record-link" aria-label={`Open ${syllable.base} in the sound chart`}>
            <strong className="discovery-sound-syllable">{syllable.base}</strong>
          </Link>
          <div className="discovery-sound-tones" role="group" aria-label={`Tones of ${syllable.base}`}>
            {toneButtons('discovery-sound-tone')}
          </div>
        </div>
      ) : (
        <p className="library-note">{failed ? 'Sounds could not load. Reload the page to try again.' : 'Loading sounds…'}</p>
      )}
      {/* Same labelled Details button as the other random cards (shared .daily-hero-actions); opens this syllable's Sound chart card. */}
      {syllable && <div className="daily-hero-actions discovery-tile-actions">
        <Button asChild variant="outline" size="sm"><Link to="/pinyin" search={{ s: syllable.base }}><DetailsIcon aria-hidden="true"/>Details</Link></Button>
      </div>}
      {player.error && <p className="library-note" role="status">{player.error}</p>}
      </div>
    </section>
  );
}

/**
 * Phone Sounds row: do the speaker + tone chips fit whole on the row line beside the syllable?
 * The chips are always rendered in the line (out of flow and invisible while they do not fit,
 * class is-measuring), so their width is read the same either way and the answer never flips
 * back and forth. Re-checks on resize, font loads and a new syllable (`key`). Wide screens hide
 * the row entirely (zero widths), which reads as "does not fit" and changes nothing there.
 */
function useLineTonesFit(sectionRef: React.RefObject<HTMLElement | null>, key: string) {
  const [fits, setFits] = useState(false);
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const pick = section?.querySelector<HTMLElement>('.discovery-row-pick');
    if (!section || !pick) return;
    const measure = () => {
      const text = pick.querySelector<HTMLElement>('.discovery-row-pick-text');
      const chips = pick.querySelector<HTMLElement>('.discovery-row-tones');
      if (!text || !chips || pick.clientWidth === 0) { setFits(false); return; }
      const gap = parseFloat(getComputedStyle(pick).columnGap) || 0;
      setFits(chips.offsetWidth > 0 && text.offsetWidth + gap + chips.offsetWidth <= pick.clientWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(pick);
    document.fonts?.addEventListener('loadingdone', measure);
    return () => { observer.disconnect(); document.fonts?.removeEventListener('loadingdone', measure); };
  }, [sectionRef, key]);
  return fits;
}

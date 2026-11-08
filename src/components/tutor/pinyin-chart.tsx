// Sound chart: every attested syllable, grouped by initial, with a player for
// the selected syllable. Inputs: loaded data, remembered progress, the shared
// player, the applied URL filters and the URL-selected syllable. Local state:
// only the tone currently shown in the player (selection itself lives in the URL).
import { useEffect, useMemo, useState } from 'react';
import { ListMusic, Square, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { FINAL_GROUPS, INITIAL_GROUPS, SPOKEN_TONES, TONE_HINTS, TONE_NAMES, findSyllable, hasRecording, matchesFinal, matchesInitial, matchesSyllable, soundAlikes, soundId, sortSyllables, toneMark, type PinyinData, type PinyinSyllable, type Tone } from '@/lib/pinyin-guide';
import { answered, needsReview, type PinyinProgress } from '@/lib/pinyin-progress';
import { DraftFilterForm } from './filter-form';
import { ToneContour, sound, type PinyinPlayer } from './pinyin-shared';
import { Search } from 'lucide-react';

export type ChartFilters = { q: string; initial: string; final: string };

export function InitialSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <select className="filter-select" aria-label="Filter by initial" value={value} onChange={e => onChange(e.target.value)}>
    <option value="">All initials</option>
    {INITIAL_GROUPS.map((group, index) => <optgroup key={group.label} label={group.label}>
      <option value={`group:${index}`}>{group.label}{group.initials[0] ? ` · ${group.initials.join(' ')}` : ''}</option>
      {group.initials[0] !== null && group.initials.map(initial => <option key={initial} value={initial ?? 'none'}>{initial}</option>)}
    </optgroup>)}
  </select>;
}
export function FinalSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <select className="filter-select" aria-label="Filter by final" value={value} onChange={e => onChange(e.target.value)}>
    <option value="">All finals</option>
    {FINAL_GROUPS.map((group, index) => <optgroup key={group.label} label={`Finals with ${group.label}`}>
      <option value={`group:${index}`}>Finals with {group.label}</option>
      {group.finals.map(final => <option key={final} value={final}>{final}</option>)}
    </optgroup>)}
  </select>;
}

/** The tones a tile shows as dots: recorded tones filled, unrecorded attested tones hollow. */
function TileTones({ data, syllable }: { data: PinyinData; syllable: PinyinSyllable }) {
  return <span className="pinyin-tile-tones" aria-hidden="true">{SPOKEN_TONES.map(t => <span key={t} className={hasRecording(data, syllable.base, t) ? 'on' : syllable.tones.includes(t) ? 'off' : 'none'} />)}</span>;
}

export function PinyinChart({ data, progress, player, filters, selected, slow, onSlow, onSelect, onFilters }: {
  data: PinyinData; progress: PinyinProgress; player: PinyinPlayer; filters: ChartFilters; selected?: string | undefined; slow: boolean;
  onSlow: (slow: boolean) => void; onSelect: (base: string | undefined) => void; onFilters: (filters: ChartFilters) => void;
}) {
  const sorted = useMemo(() => sortSyllables(data.syllables), [data]);
  const visible = useMemo(() => sorted.filter(s => matchesSyllable(s, filters.q) && matchesInitial(s, filters.initial) && matchesFinal(s, filters.final)), [sorted, filters]);
  const groups = useMemo(() => INITIAL_GROUPS.map(group => ({ ...group, items: visible.filter(s => group.initials.includes(s.initial)) })).filter(g => g.items.length), [visible]);
  const active = Boolean(filters.q || filters.initial || filters.final);
  const syllable = selected ? findSyllable(data, selected) : undefined;
  // A search with a tone ("ren2") opens that tone; otherwise the first recorded tone.
  const [tone, setTone] = useState<Tone>(1);
  useEffect(() => {
    if (!syllable) return;
    const recorded = syllable.tones.filter(t => hasRecording(data, syllable.base, t));
    setTone(current => (recorded.includes(current) ? current : recorded[0] ?? syllable.tones[0] ?? 1));
  }, [syllable, data]);

  // Number keys 1–4 play that tone of the selected syllable (not while typing).
  useEffect(() => {
    if (!syllable) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))) return;
      const t = Number(event.key) as Tone;
      if (t >= 1 && t <= 4 && hasRecording(data, syllable.base, t)) { event.preventDefault(); setTone(t); void player.play(sound(syllable.base, t)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [syllable, data, player]);

  return <div className="pinyin-chart-layout">
    <div className="pinyin-chart-main">
      <DraftFilterForm applied={filters} active={active} count={visible.length} onApply={onFilters} onClear={() => { const empty = { q: '', initial: '', final: '' }; onFilters(empty); return empty; }}
        chips={[...(filters.initial ? [{ label: filters.initial === 'none' ? 'No initial' : filters.initial.startsWith('group:') ? INITIAL_GROUPS[Number(filters.initial.slice(6))]?.label ?? '' : filters.initial, clear: { initial: '' } }] : []), ...(filters.final ? [{ label: filters.final.startsWith('group:') ? `Finals with ${FINAL_GROUPS[Number(filters.final.slice(6))]?.label}` : filters.final, clear: { final: '' } }] : [])]}
        filterFields={({ draft, patch }) => <><InitialSelect value={draft.initial} onChange={initial => patch({ initial })} /><FinalSelect value={draft.final} onChange={final => patch({ final })} /></>}>
        {({ draft, patch }) => <div className="search-field"><Search /><input type="search" aria-label="Search syllables" placeholder="Find a syllable: rén, ren2, lv4…" value={draft.q} onChange={e => patch({ q: e.target.value })} /></div>}
      </DraftFilterForm>
      {groups.length === 0 ? <div className="record-gap pinyin-absent"><p>No syllable matches this search.</p></div> : groups.map(group => <section key={group.label} className="pinyin-group" aria-label={group.label}>
        <h2 className="pinyin-group-title">{group.label}{group.initials[0] !== null && <span>{group.initials.join(' ')}</span>}</h2>
        <div className="pinyin-tiles">{group.items.map(s => {
          const sounds = s.tones.filter(t => t !== 5).map(t => progress[soundId(s.base, t)]);
          const review = sounds.some(needsReview), done = sounds.some(answered);
          const recorded = s.tones.filter(t => hasRecording(data, s.base, t)).length;
          return <button key={s.base} type="button" data-base={s.base} className={`pinyin-tile${s.base === selected ? ' is-selected' : ''}`} aria-pressed={s.base === selected}
            aria-label={`${s.base}, ${recorded} tone${recorded === 1 ? '' : 's'} recorded${review ? ', needs review' : done ? ', practised' : ''}`}
            onClick={() => { onSelect(s.base === selected ? undefined : s.base); const first = s.tones.find(t => hasRecording(data, s.base, t)); if (s.base !== selected && first) { setTone(first); void player.play(sound(s.base, first)); } }}>
            <span className="pinyin-tile-base" lang="zh-Latn-pinyin">{s.base}</span>
            <TileTones data={data} syllable={s} />
            {(review || done) && <span className={`pinyin-tile-state ${review ? 'review' : 'done'}`} aria-hidden="true" />}
          </button>;
        })}</div>
      </section>)}
    </div>
    <PinyinPlayerPanel data={data} progress={progress} player={player} syllable={syllable} tone={tone} slow={slow} onSlow={onSlow} onTone={t => { setTone(t); if (syllable) void player.play(sound(syllable.base, t)); }} onSelect={onSelect} />
  </div>;
}

/** Selected-syllable player: tone buttons (neutral listed but never playable), play-all, slow, parts and sound-alikes. */
function PinyinPlayerPanel({ data, progress, player, syllable, tone, slow, onSlow, onTone, onSelect }: {
  data: PinyinData; progress: PinyinProgress; player: PinyinPlayer; syllable?: PinyinSyllable | undefined; tone: Tone; slow: boolean;
  onSlow: (slow: boolean) => void; onTone: (tone: Tone) => void; onSelect: (base: string) => void;
}) {
  if (!syllable) return <aside className="pinyin-player is-empty" aria-label="Selected syllable"><div className="eyebrow">SELECTED SOUND</div><p className="pinyin-player-empty">Pick a syllable to hear its tones.</p><p className="pinyin-player-tip">Then press 1–4 to replay a tone.</p></aside>;
  const recorded = syllable.tones.filter(t => hasRecording(data, syllable.base, t));
  const alikes = soundAlikes(data, syllable.base, recorded.includes(tone) ? tone : recorded[0] ?? 1);
  const stats = progress[soundId(syllable.base, tone)];
  const sequencePlaying = player.playing !== null;
  return <aside className="pinyin-player" aria-label="Selected syllable">
    <div className="eyebrow">SELECTED SOUND</div>
    <h2 className="pinyin-player-title pinyin" lang="zh-Latn-pinyin">{toneMark(syllable.base, tone)}</h2>
    <p className="pinyin-player-tone">{TONE_NAMES[tone]} · {TONE_HINTS[tone]}</p>
    <div className="pinyin-tone-buttons" role="group" aria-label="Tones">{syllable.tones.map(t => {
      const playable = hasRecording(data, syllable.base, t);
      return <button key={t} type="button" className={`pinyin-tone-button${t === tone ? ' is-current' : ''}${player.playing === soundId(syllable.base, t) ? ' is-playing' : ''}`} disabled={!playable}
        aria-label={`${TONE_NAMES[t]}: ${toneMark(syllable.base, t)}${playable ? '' : ' · no recording'}`} title={playable ? `${TONE_NAMES[t]} (${t})` : 'No recording for the neutral tone'} onClick={() => onTone(t)}>
        {/* Neutral tone: name the tone, not the bare syllable, so "No recording" never reads as the whole syllable missing. */}
        <ToneContour tone={t} />{t === 5 ? <span>Neutral</span> : <span lang="zh-Latn-pinyin">{toneMark(syllable.base, t)}</span>}<small>{playable ? t : 'No recording'}</small>
      </button>;
    })}</div>
    <div className="pinyin-player-actions">
      {sequencePlaying ? <Button variant="outline" size="sm" onClick={player.stop}><Square />Stop</Button>
        : <Button variant="outline" size="sm" disabled={recorded.length < 2} onClick={() => void player.sequence(recorded.map(t => sound(syllable.base, t)))}><ListMusic />Play all tones</Button>}
      <Button variant="ghost" size="sm" disabled={!recorded.includes(tone)} onClick={() => void player.play(sound(syllable.base, tone))}><Volume2 />Again</Button>
      <label className="pinyin-slow"><Switch checked={slow} onCheckedChange={onSlow} aria-label="Slower pronunciation" />Slower</label>
    </div>
    {player.error && <p className="pinyin-audio-error" role="alert">{player.error}</p>}
    <dl className="pinyin-parts">
      <div><dt>Initial</dt><dd>{syllable.initial ?? '—'}</dd></div>
      <div><dt>Final</dt><dd>{syllable.final}</dd></div>
      <div><dt>You</dt><dd>{stats && stats.right + stats.wrong > 0 ? `${stats.right} right · ${stats.wrong} wrong` : 'Not practised yet'}</dd></div>
    </dl>
    {syllable.note && <p className="pinyin-note">{syllable.note}</p>}
    {alikes.length > 0 && <div className="pinyin-alikes"><div className="eyebrow">SOUNDS ALIKE — COMPARE</div><div>{alikes.map(base => <button key={base} type="button" className="pinyin-alike" onClick={() => { onSelect(base); if (hasRecording(data, base, tone)) void player.play(sound(base, tone)); }} lang="zh-Latn-pinyin">{toneMark(base, recorded.includes(tone) ? tone : recorded[0] ?? 1)}</button>)}</div></div>}
  </aside>;
}

// "In a character" section of the Sound chart's Selected sound card: the characters
// whose recorded reading is exactly this syllable in the chosen tone, most used first.
// Inputs: the syllable base, the chosen tone (null = none chosen yet, so nothing is
// listed), the label the details window's Back button shows, and onLeave (called just
// before a character opens so the chart keeps its own Back trail). State: whether the
// full list is expanded; it collapses again for every new syllable or tone.
// The catalogue loads lazily in the workspace; catalogVersion re-runs the lookup once
// it arrives. Matching is exact (src/lib/syllable-characters.ts) — never inferred.
import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { libraryEntries } from '@/lib/character-library';
import { detailTrail } from '@/lib/detail-trail';
import { toneMark, type Tone } from '@/lib/pinyin-guide';
import { characterDestinations, syllableCharacters } from '@/lib/syllable-characters';
import { useWorkspace } from './workspace';

/** Characters shown before "Show all". */
export const SYLLABLE_CHARACTERS_SHOWN = 12;

export function SyllableCharacters({ base, tone, backLabel, onLeave }: { base: string; tone: Tone | null; backLabel: string; onLeave: () => void }) {
  const { preferences, catalogVersion } = useWorkspace();
  const includeTraditional = preferences.includeTraditional;
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { setExpanded(false); }, [base, tone]);
  // catalogVersion is 0 until the lazily fetched catalogue is installed.
  const entries = useMemo(() => (catalogVersion ? libraryEntries('Characters') : []), [catalogVersion]);
  const destinations = useMemo(() => characterDestinations(entries, includeTraditional), [entries, includeTraditional]);
  const matches = useMemo(() => (tone === null || !entries.length ? [] : syllableCharacters(entries, base, tone, includeTraditional)), [entries, base, tone, includeTraditional]);
  const shown = expanded ? matches : matches.slice(0, SYLLABLE_CHARACTERS_SHOWN);

  return <section className="pinyin-characters" aria-label="In a character">
    <div className="eyebrow">IN A CHARACTER{matches.length ? ` · ${matches.length}` : ''}</div>
    {tone === null ? <p className="pinyin-characters-note">Click a tone to see its characters.</p>
      : !catalogVersion ? <p className="pinyin-characters-note">Loading characters…</p>
      : !matches.length ? <p className="pinyin-characters-note">No character in the dictionary reads <span lang="zh-Latn-pinyin">{toneMark(base, tone)}</span>.</p>
      : <>
        <ul className="pinyin-character-list">{shown.map(entry => <li key={entry.id}>
          <Link to="/characters" search={destinations.get(entry.id) ?? { tab: 'Characters', id: entry.id }} lang="zh-CN"
            className={`pinyin-character${entry.script === 'Traditional' ? ' traditional-character' : ''}`}
            title={entry.meaning} aria-label={`${entry.hanzi}${entry.meaning ? `, ${entry.meaning}` : ''} · open its details`}
            // The details window's Back returns to this exact sound (syllable + tone in the URL).
            onClick={() => { onLeave(); detailTrail.replace({ label: backLabel, href: window.location.href }); }}>{entry.hanzi}</Link>
        </li>)}</ul>
        {matches.length > SYLLABLE_CHARACTERS_SHOWN && <Button variant="link" size="sm" className="pinyin-characters-more" onClick={() => setExpanded(value => !value)}>{expanded ? 'Show fewer' : `Show all ${matches.length}`}</Button>}
      </>}
  </section>;
}

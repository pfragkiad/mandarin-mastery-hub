import { SLOW_SPEED } from '@/lib/practice-speed';
import { STRICTNESS_LEVELS, leniency } from '@/lib/handwriting-strictness';
import { Info, Moon, Sun, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useWorkspace } from './workspace';
import { speak } from '@/lib/mandarin';
import { defaultPreferences, type Preferences } from '@/lib/learning-preferences';
import { HandwritingTryPad } from './handwriting-try-pad';
import { CharacterStyleToggle } from './character-style-toggle';

// Preferences: Reading & display, Handwriting & strokes (with a mini 大 pad to
// test strictness), Listening (with Try audio) and Your workspace.
export function PreferencesPage() {
 const { preferences, setPreferences, theme, setTheme } = useWorkspace();
 return <div className="page-enter settings-layout">
  <div className="page-heading"><div><div className="eyebrow">MAKE SPACE FOR YOUR WAY OF LEARNING</div><h1>A little more you.</h1><p>Small adjustments for a more comfortable learning rhythm.</p></div></div>
  <div className="settings-notice"><Info size={16} className="shrink-0"/>Your preferences are saved in this browser and stay set when you come back.</div>
  <section className="settings-section"><h2>Reading & display</h2>
   {/* The same 永 picker the topbar used to carry; the preview sits right under it so a tap shows the face at once. */}
   <div className="settings-row"><div><label id="font-setting-label">Character style</label><p>Handwritten, clean sans or print: the font for hanzi everywhere except stroke practice.</p></div><CharacterStyleToggle id="font-setting"/></div>
   <div className="font-preview" lang="zh-CN">学无止境，一步一步。</div>
   {/* Theme and display size mirror the topbar controls, so phones (whose slim header shows only Search) can change them too. Both reuse the shared segmented-button look. */}
   <div className="settings-row"><div><label id="theme-setting-label">Theme</label><p>Light or dark colours for the whole app.</p></div><span className="writer-speed-options" role="group" aria-labelledby="theme-setting-label">{(['light', 'dark'] as const).map(t => <Button key={t} variant="ghost" size="sm" type="button" className={theme === t ? 'active' : ''} aria-pressed={theme === t} onClick={() => setTheme(t)}>{t === 'light' ? <Sun/> : <Moon/>}{t === 'light' ? 'Light' : 'Dark'}</Button>)}</span></div>
   <div className="settings-row"><div><label id="display-size-setting-label">Display size</label><p>Compact fits more cards; Comfortable makes cards, text and controls larger.</p></div><span className="writer-speed-options" role="group" aria-labelledby="display-size-setting-label">{(['grid', 'list'] as const).map(v => { const on = (preferences.libraryView === 'list' ? 'list' : 'grid') === v; return <Button key={v} variant="ghost" size="sm" type="button" className={on ? 'active' : ''} aria-pressed={on} onClick={() => setPreferences({...preferences,libraryView:v})}>{v === 'grid' ? 'Compact' : 'Comfortable'}</Button>; })}</span></div>
   {/* Stacked on phones (settings-row-stacked): the longest option ("Hide pronunciation and translation") would squeeze the label into one-word lines, so the select drops to its own full-width line. */}
   <div className="settings-row settings-row-stacked"><div><label htmlFor="card-reveal-setting">Default card visibility</label><p>What cards hide at first, for self-testing.</p></div><select id="card-reveal-setting" className="filter-select" value={preferences.cardReveal} onChange={e => setPreferences({...preferences,cardReveal:e.target.value as Preferences['cardReveal']})}><option value="all">Show all</option><option value="meaning">Hide translation</option><option value="hanzi">Hide hanzi</option><option value="pinyin">Hide pronunciation</option><option value="pinyin-meaning">Hide pronunciation and translation</option></select></div>
   <div className="settings-row"><div><label htmlFor="traditional-setting">Include <span className="traditional-character">traditional characters</span></label><p>Show traditional forms, marked in violet.</p></div><Switch id="traditional-setting" className="traditional-switch" checked={preferences.includeTraditional} onCheckedChange={includeTraditional => setPreferences({...preferences,includeTraditional})}/></div>
   <div className="settings-row"><div><label htmlFor="sound-chart-links-setting">Sound chart links on cards</label><p>Show the sound-wave link beside each glyph card's sound button, on the Glyphs pages and the Start page. Details windows always keep it.</p></div><Switch id="sound-chart-links-setting" checked={preferences.soundChartLinks !== false} onCheckedChange={soundChartLinks => setPreferences({...preferences,soundChartLinks})}/></div>
   {/* Phones collapse the Start random cards to one line per row; this picks what that line
       shows next to the hanzi — the translation, or the pinyin with a small listen button. */}
   <div className="settings-row"><div><label id="discovery-row-line-label">Start random rows</label><p>On phones, the closed row shows the translation or the pinyin with a listen button.</p></div><span className="writer-speed-options" role="group" aria-labelledby="discovery-row-line-label">{(['meaning', 'pinyin'] as const).map(v => { const on = (preferences.discoveryRowLine ?? 'meaning') === v; return <Button key={v} variant="ghost" size="sm" type="button" className={on ? 'active' : ''} aria-pressed={on} onClick={() => setPreferences({...preferences,discoveryRowLine:v})}>{v === 'meaning' ? 'Translation' : 'Pinyin + audio'}</Button>; })}</span></div>
  </section>
  <section className="settings-section"><h2>Handwriting & strokes</h2>
   <div className="settings-row"><div><label htmlFor="slow-strokes-setting">Slower stroke animation</label><p>Play draws strokes at half the normal speed.</p></div><Switch id="slow-strokes-setting" checked={preferences.animationSpeed === SLOW_SPEED} onCheckedChange={slow => setPreferences({...preferences,animationSpeed: slow ? SLOW_SPEED : 0.5})}/></div>
   {(['trace', 'recall'] as const).map(kind => { const key = kind === 'trace' ? 'traceLeniency' : 'recallLeniency'; return <div className="settings-row" key={kind}><div><label htmlFor={`${kind}-strictness`}>{kind === 'trace' ? 'Trace' : 'Recall'} handwriting strictness</label><p>How closely {kind === 'trace' ? 'Trace' : 'Recall'} strokes must follow the model.</p></div><select id={`${kind}-strictness`} className="filter-select" value={leniency(preferences[key])} onChange={e => setPreferences({...preferences,[key]:Number(e.target.value)})}>{STRICTNESS_LEVELS.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}</select></div>; })}
   <div className="settings-row"><div><label htmlFor="confetti-setting">Show confetti</label><p>Celebrate a character drawn with 100% accuracy on every stroke.</p></div><Switch id="confetti-setting" checked={preferences.confetti !== false} onCheckedChange={confetti => setPreferences({...preferences,confetti})}/></div>
   <div className="settings-row settings-row-try"><div><label>Try handwriting</label><p>Write 大 to feel the strictness you picked.</p></div><HandwritingTryPad/></div>
  </section>
  <section className="settings-section"><h2>Listening</h2>
   <div className="settings-row"><div><label htmlFor="slow-setting">Slower pronunciation</label><p>More time to hear each tone.</p></div><Switch id="slow-setting" checked={preferences.slow} onCheckedChange={slow => setPreferences({...preferences,slow})}/></div>
   <div className="settings-row"><div><label>Mandarin audio</label><p>Uses your device’s Chinese voices.</p></div><Button variant="outline" size="sm" onClick={() => speak('你好，欢迎学习中文。',preferences.slow)}><Volume2/>Try audio</Button></div>
  </section>
  <section className="settings-section"><h2>Your workspace</h2>
   <div className="settings-row"><div><label>Start fresh</label><p>Restore the default preferences.</p></div><Button variant="outline" size="sm" onClick={() => setPreferences(defaultPreferences)}>Reset preferences</Button></div>
  </section>
 </div>;
}

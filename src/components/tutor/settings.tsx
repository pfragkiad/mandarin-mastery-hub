import { SLOW_SPEED } from '@/lib/practice-speed';
import { STRICTNESS_LEVELS, leniency } from '@/lib/handwriting-strictness';
import { Info, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useWorkspace } from './workspace';
import { speak } from '@/lib/mandarin';
import { defaultPreferences, type Preferences } from '@/lib/learning-preferences';
import { HandwritingTryPad } from './handwriting-try-pad';

// Settings: Reading & display, Handwriting & strokes (with a mini 大 pad to
// test strictness), Listening (with Try audio) and Your workspace.
export function SettingsPage() {
 const { preferences, setPreferences } = useWorkspace();
 return <div className="page-enter settings-layout">
  <div className="page-heading"><div><div className="eyebrow">MAKE SPACE FOR YOUR WAY OF LEARNING</div><h1>A little more you.</h1><p>Small adjustments for a more comfortable learning rhythm.</p></div></div>
  <div className="settings-notice"><Info size={16} className="shrink-0"/>Your preferences are saved in this browser and stay set when you come back.</div>
  <section className="settings-section"><h2>Reading & display</h2>
   <div className="settings-row"><div><label htmlFor="font-setting">Character style</label><p>Font for hanzi everywhere except stroke practice.</p></div><select id="font-setting" className="filter-select" value={preferences.font} onChange={e => setPreferences({...preferences,font:e.target.value})}><option value="Handwritten">Handwritten (kai)</option><option value="Sans">Clean sans</option><option value="Print">Print (song)</option></select></div>
   <div className="settings-row"><div><label htmlFor="card-reveal-setting">Default card visibility</label><p>What cards hide at first, for self-testing.</p></div><select id="card-reveal-setting" className="filter-select" value={preferences.cardReveal} onChange={e => setPreferences({...preferences,cardReveal:e.target.value as Preferences['cardReveal']})}><option value="all">Show all</option><option value="meaning">Hide translation</option><option value="hanzi">Hide hanzi</option><option value="pinyin">Hide pronunciation</option><option value="pinyin-meaning">Hide pronunciation and translation</option></select></div>
   <div className="settings-row"><div><label htmlFor="traditional-setting">Include <span className="traditional-character">traditional characters</span></label><p>Show traditional forms, marked in violet.</p></div><Switch id="traditional-setting" className="traditional-switch" checked={preferences.includeTraditional} onCheckedChange={includeTraditional => setPreferences({...preferences,includeTraditional})}/></div>
   <div className="settings-row"><div><label htmlFor="sound-chart-links-setting">Sound chart links on cards</label><p>Show the sound-wave link beside each glyph card's sound button, on the Glyphs pages and the Start page. Details windows always keep it.</p></div><Switch id="sound-chart-links-setting" checked={preferences.soundChartLinks !== false} onCheckedChange={soundChartLinks => setPreferences({...preferences,soundChartLinks})}/></div>
   <div className="font-preview" lang="zh-CN">学无止境，一步一步。</div>
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

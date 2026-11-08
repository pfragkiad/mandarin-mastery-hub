// Pinyin pronunciation guide: browser-safe helpers over the supplied syllable
// inventory (CC-CEDICT snapshot) and recordings (hugolpz/audio-cmn).
//
// Data rules:
// - A syllable/tone exists only when the inventory attests it; a sound is
//   playable only when a recording exists for that exact syllable + tone.
// - The neutral tone (5) is listed when attested but never playable: the source
//   withdrew those recordings, and no other tone or voice substitutes for them.
// - Initial/final groups below are standard teaching groupings used only to
//   arrange the chart and pick sound-alike options; they never create syllables.

export type Tone = 1 | 2 | 3 | 4 | 5;
export const SPOKEN_TONES = [1, 2, 3, 4] as const;
export type PinyinSyllable = { base: string; initial: string | null; final: string; tones: Tone[]; note: string | null };
export type PinyinRecording = { url: string; ms: number };
export type PinyinSource = { name: string; url: string; license: string; [key: string]: unknown };
export type PinyinData = {
  syllables: PinyinSyllable[];
  recordings: Record<string, PinyinRecording>;
  inventorySource: PinyinSource;
  audioSource: PinyinSource & { credits?: string; accent?: string; reviewed?: boolean; commit?: string };
};
/** One playable sound: a syllable spoken in one tone. */
export type PinyinSound = { id: string; base: string; tone: Tone };

export const soundId = (base: string, tone: Tone) => `${base}${tone}`;

/** Initials grouped by where the sound is made, in teaching order. `null` = no initial. */
export const INITIAL_GROUPS: { label: string; initials: (string | null)[] }[] = [
  { label: 'Lips', initials: ['b', 'p', 'm', 'f'] },
  { label: 'Tongue tip', initials: ['d', 't', 'n', 'l'] },
  { label: 'Back of tongue', initials: ['g', 'k', 'h'] },
  { label: 'Tongue flat', initials: ['j', 'q', 'x'] },
  { label: 'Tongue curled', initials: ['zh', 'ch', 'sh', 'r'] },
  { label: 'Teeth', initials: ['z', 'c', 's'] },
  { label: 'No initial', initials: [null] },
];
export const INITIAL_ORDER = INITIAL_GROUPS.flatMap(g => g.initials);
export const initialLabel = (initial: string | null) => initial ?? 'no initial';

/** Finals grouped by their opening vowel (written in their underlying form, e.g. iou, uei). */
export const FINAL_GROUPS: { label: string; finals: string[] }[] = [
  { label: 'a o e', finals: ['a', 'o', 'e', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong', 'er'] },
  { label: 'i', finals: ['i', 'ia', 'ie', 'iao', 'iou', 'ian', 'in', 'iang', 'ing', 'iong'] },
  { label: 'u', finals: ['u', 'ua', 'uo', 'uai', 'uei', 'uan', 'uen', 'uang', 'ueng'] },
  { label: 'ü', finals: ['ü', 'üe', 'üan', 'ün'] },
];
export const FINAL_ORDER = FINAL_GROUPS.flatMap(g => g.finals);

// Commonly confused pairs/sets. A syllable's sound-alikes swap exactly one part
// (initial or final) within one of these sets, and only real syllables count.
const CONFUSABLE_INITIALS: string[][] = [['z', 'zh', 'j'], ['c', 'ch', 'q'], ['s', 'sh', 'x'], ['b', 'p'], ['d', 't'], ['g', 'k'], ['n', 'l'], ['l', 'r'], ['f', 'h'], ['zh', 'ch'], ['z', 'c']];
const CONFUSABLE_FINALS: string[][] = [['an', 'ang'], ['en', 'eng'], ['in', 'ing'], ['ian', 'iang'], ['uan', 'uang'], ['u', 'ü'], ['uan', 'üan'], ['uen', 'ün'], ['ie', 'üe'], ['ou', 'uo'], ['ai', 'ei'], ['ong', 'iong'], ['eng', 'ong'], ['in', 'ün'], ['e', 'o'], ['iou', 'iao'], ['uei', 'ei']];

const ACCENTS = ['\u0304', '\u0301', '\u030c', '\u0300'];

/** Tone-marked spelling: toneMark('lü', 3) → 'lǚ'. Neutral tone keeps the bare spelling. */
export function toneMark(base: string, tone: Tone): string {
  if (tone === 5) return base.normalize('NFC');
  let index = base.indexOf('a');
  if (index < 0) index = base.indexOf('e');
  if (index < 0 && base.includes('ou')) index = base.indexOf('o');
  if (index < 0) {
    for (let i = base.length - 1; i >= 0; i--) if ('iouü'.includes(base[i])) { index = i; break; }
  }
  if (index < 0) return base;
  return (base.slice(0, index + 1) + ACCENTS[tone - 1] + base.slice(index + 1)).normalize('NFC');
}

/**
 * Read learner input in any common notation: tone marks (rén), numbers (ren2),
 * `v` or `u:` for ü (lv4, lu:4). Returns null for anything that is not one syllable.
 * After j/q/x/y the written u already means ü, so "jü" and "ju" are the same.
 */
export function parsePinyin(input: string): { base: string; tone?: Tone } | null {
  let raw = input.trim().toLowerCase().normalize('NFC').replace(/u:|v/g, 'ü');
  const numeric = raw.match(/[1-5]$/);
  let tone = numeric ? (Number(numeric[0]) as Tone) : undefined;
  if (numeric) raw = raw.slice(0, -1);
  let base = '';
  let marked: Tone | undefined;
  for (const char of raw.normalize('NFD')) {
    const index = ACCENTS.indexOf(char);
    if (index >= 0) {
      if (marked) return null;
      marked = (index + 1) as Tone;
    } else base += char;
  }
  base = base.normalize('NFC');
  if (tone && marked && tone !== marked) return null;
  tone ??= marked;
  base = base.replace(/^([jqxy])ü/, '$1u');
  if (!/^[a-zü]+$/.test(base)) return null;
  return { base, tone };
}

/** Chart search: a bare spelling matches by prefix; with a tone it must be that exact attested sound. */
export function matchesSyllable(syllable: PinyinSyllable, input: string): boolean {
  if (!input.trim()) return true;
  const query = parsePinyin(input);
  if (!query) return false;
  return query.tone ? syllable.base === query.base && syllable.tones.includes(query.tone) : syllable.base.startsWith(query.base);
}

/** Only an exact recording makes a sound playable; tone 5 never is. */
export function hasRecording(data: Pick<PinyinData, 'recordings'>, base: string, tone: Tone): boolean {
  return tone !== 5 && Boolean(data.recordings[soundId(base, tone)]);
}

/** Every playable sound, in chart order (initial, final, tone). */
export function allSounds(data: PinyinData): PinyinSound[] {
  return sortSyllables(data.syllables).flatMap(s => s.tones.filter(t => hasRecording(data, s.base, t)).map(tone => ({ id: soundId(s.base, tone), base: s.base, tone })));
}

export function sortSyllables(list: PinyinSyllable[]): PinyinSyllable[] {
  const rank = (s: PinyinSyllable) => [INITIAL_ORDER.indexOf(s.initial), FINAL_ORDER.indexOf(s.final)];
  return [...list].sort((a, b) => { const [ai, af] = rank(a); const [bi, bf] = rank(b); return ai - bi || af - bf || a.base.localeCompare(b.base); });
}

/**
 * Real syllables that differ from `base` in exactly one confusable part and have a
 * recording in the same tone — the options for the sound-alike quiz.
 */
const partIndex = new WeakMap<PinyinSyllable[], { byBase: Map<string, PinyinSyllable>; byParts: Map<string, string> }>();
function indexOf(list: PinyinSyllable[]) {
  let index = partIndex.get(list);
  if (!index) {
    index = { byBase: new Map(list.map(s => [s.base, s])), byParts: new Map(list.map(s => [`${s.initial ?? ''}|${s.final}`, s.base])) };
    partIndex.set(list, index);
  }
  return index;
}
export const findSyllable = (data: Pick<PinyinData, 'syllables'>, base: string) => indexOf(data.syllables).byBase.get(base);

/** Chart/quiz filters: '' = all, 'group:N' = an INITIAL_GROUPS / FINAL_GROUPS entry, 'none' = no initial, else one exact initial. */
export function matchesInitial(s: PinyinSyllable, value: string | undefined): boolean {
  if (!value) return true;
  const group = value.match(/^group:(\d+)$/);
  if (group) return INITIAL_GROUPS[Number(group[1])]?.initials.includes(s.initial) ?? false;
  return value === 'none' ? s.initial === null : s.initial === value;
}
export function matchesFinal(s: PinyinSyllable, value: string | undefined): boolean {
  if (!value) return true;
  const group = value.match(/^group:(\d+)$/);
  if (group) return FINAL_GROUPS[Number(group[1])]?.finals.includes(s.final) ?? false;
  return s.final === value;
}
export function initialFilterLabel(value: string | undefined) {
  if (!value) return 'All initials';
  const group = value.match(/^group:(\d+)$/);
  if (group) return INITIAL_GROUPS[Number(group[1])]?.label ?? value;
  return value === 'none' ? 'No initial' : `Initial ${value}`;
}
export function finalFilterLabel(value: string | undefined) {
  if (!value) return 'All finals';
  const group = value.match(/^group:(\d+)$/);
  return group ? `Finals with ${FINAL_GROUPS[Number(group[1])]?.label ?? value}` : `Final ${value}`;
}

export function soundAlikes(data: PinyinData, base: string, tone: Tone): string[] {
  const { byBase, byParts } = indexOf(data.syllables);
  const target = byBase.get(base);
  if (!target) return [];
  const found = new Set<string>();
  for (const set of CONFUSABLE_INITIALS) if (target.initial && set.includes(target.initial)) for (const other of set) {
    const candidate = byParts.get(`${other}|${target.final}`);
    if (candidate) found.add(candidate);
  }
  for (const set of CONFUSABLE_FINALS) if (set.includes(target.final)) for (const other of set) {
    const candidate = byParts.get(`${target.initial ?? ''}|${other}`);
    if (candidate) found.add(candidate);
  }
  found.delete(base);
  return [...found].filter(b => hasRecording(data, b, tone)).sort();
}

export type TypedVerdict = 'correct' | 'wrong-tone' | 'missing-tone' | 'wrong' | 'invalid';
/** Grade a typed answer. Missing tone and non-pinyin input are prompts, not scored mistakes. */
export function checkTyped(input: string, base: string, tone: Tone): { verdict: TypedVerdict; parsed: { base: string; tone?: Tone } | null } {
  const parsed = parsePinyin(input);
  if (!parsed) return { verdict: 'invalid', parsed };
  if (parsed.base !== base) return { verdict: parsed.tone ? 'wrong' : 'missing-tone', parsed };
  if (!parsed.tone) return { verdict: 'missing-tone', parsed };
  return { verdict: parsed.tone === tone ? 'correct' : 'wrong-tone', parsed };
}
export const isScored = (verdict: TypedVerdict) => verdict === 'correct' || verdict === 'wrong-tone' || verdict === 'wrong';

export const TONE_NAMES: Record<Tone, string> = { 1: '1st tone', 2: '2nd tone', 3: '3rd tone', 4: '4th tone', 5: 'Neutral tone' };
export const TONE_HINTS: Record<Tone, string> = { 1: 'High and level', 2: 'Rising', 3: 'Low, dipping', 4: 'Falling sharply', 5: 'Light and short' };

/** Lazily load both sidecars so ~1,300 recording entries never enter page bundles. */
let loading: Promise<PinyinData> | null = null;
export function loadPinyinData(): Promise<PinyinData> {
  loading ??= Promise.all([import('@/data/pinyin/inventory.json'), import('@/data/pinyin/audio.json')]).then(([inventory, audio]) => ({
    syllables: (inventory.default.syllables as PinyinSyllable[]),
    recordings: audio.default.recordings as Record<string, PinyinRecording>,
    inventorySource: inventory.default.source,
    audioSource: audio.default.source,
  })).catch(error => { loading = null; throw error; });
  return loading;
}

// Pronunciation playback following the data plan's priority order:
// 1. recording attached to the entry/example (manual or complete word/sentence match, as returned by the API)
// 2. character-reading recording for the exact glyph + reading (never a different tone)
// 3. browser TTS with a validated Mandarin voice (last resort, always labelled)
export type AudioAttachment = { url: string; source: string; license: string; recordingKind?: string | null };
export type CharacterReadingAudio = AudioAttachment & { glyph: string; reading: string };
export type AudioRequest = { text: string; audio?: AudioAttachment | null; reading?: string | null; characterAudio?: CharacterReadingAudio[] };
export type AudioCandidate = { kind: 'recording'; tier: 'attached' | 'character-reading'; attachment: AudioAttachment; label: string } | { kind: 'tts'; label: 'Browser TTS' };
export type PlayResult = { ok: true; candidate: AudioCandidate } | { ok: false; candidate: AudioCandidate | null; reason: 'recording-failed' | 'no-mandarin-voice' | 'unsupported'; canUseTts: boolean };

export const RATE_MIN = 0.5;
export const RATE_MAX = 1.2;
export const SLOW_RATE = 0.65;
export const NORMAL_RATE = 1;
export const clampRate = (rate: number) => Math.min(RATE_MAX, Math.max(RATE_MIN, Number.isFinite(rate) ? rate : NORMAL_RATE));

const recordingLabel = (a: AudioAttachment) => `${a.recordingKind ? 'Recording' : 'Attached recording'} · ${a.source} · ${a.license}`;

export function audioCandidates(req: AudioRequest): AudioCandidate[] {
  const list: AudioCandidate[] = [];
  if (req.audio?.url) list.push({ kind: 'recording', tier: 'attached', attachment: req.audio, label: recordingLabel(req.audio) });
  const glyphs = Array.from(req.text);
  if (glyphs.length === 1 && req.reading) {
    // A word recording cannot establish a constituent character's pronunciation;
    // only the exact single-glyph reading is eligible for this tier.
    const match = req.characterAudio?.find(c => c.glyph === glyphs[0] && c.reading === req.reading);
    if (match) list.push({ kind: 'recording', tier: 'character-reading', attachment: match, label: recordingLabel(match) });
  }
  list.push({ kind: 'tts', label: 'Browser TTS' });
  return list;
}

/** Recordings only (no TTS fallback) — used to style buttons honestly when nothing is recorded. */
export function recordingCandidates(req: AudioRequest): Extract<AudioCandidate, { kind: 'recording' }>[] {
  return audioCandidates(req).filter((c): c is Extract<AudioCandidate, { kind: 'recording' }> => c.kind === 'recording');
}

/** A missing reading must not make a component look pronounceable through TTS. */
export function pronunciationAvailable(hasRecording: boolean, reading: string | null | undefined, hasMandarinVoice: boolean): boolean {
  return hasRecording || (Boolean(reading?.trim()) && hasMandarinVoice);
}

// Mandarin locales only: Cantonese (zh-HK, yue) and unknown zh variants are rejected; zh-CN preferred.
const MANDARIN = /^(zh-(cn|tw|sg|hans|hant|hans-cn|hant-tw)|cmn)(-|_|$)/i;
export function isMandarinVoice(v: Pick<SpeechSynthesisVoice, 'lang'>) {
  return MANDARIN.test(v.lang.replace('_', '-')) && !/yue|hk|mo/i.test(v.lang);
}
export function pickMandarinVoice<T extends Pick<SpeechSynthesisVoice, 'lang'>>(voices: T[]): T | undefined {
  const ok = voices.filter(isMandarinVoice);
  return ok.find(v => /^zh-cn$/i.test(v.lang.replace('_', '-'))) ?? ok[0];
}

let voices: SpeechSynthesisVoice[] = [];
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const refresh = () => { voices = window.speechSynthesis.getVoices(); };
  refresh();
  window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
}

/** Whether this browser has a validated Mandarin voice (the recording-less last fallback). */
export function ttsAvailable(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  if (!voices.length) voices = window.speechSynthesis.getVoices();
  return Boolean(pickMandarinVoice(voices));
}

// onEnd fires once when the utterance finishes, errors or is cancelled, so callers
// (stroke Play) can wait for the spoken name. A timeout guards browsers whose
// speech engine never reports the end; if speech can't start, onEnd is not called.
export function speakTts(text: string, rate = NORMAL_RATE, onEnd?: () => void): PlayResult {
  const candidate: AudioCandidate = { kind: 'tts', label: 'Browser TTS' };
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return { ok: false, candidate, reason: 'unsupported', canUseTts: false };
  if (!voices.length) voices = window.speechSynthesis.getVoices();
  const voice = pickMandarinVoice(voices);
  if (!voice) return { ok: false, candidate, reason: 'no-mandarin-voice', canUseTts: false };
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice.lang; u.voice = voice; u.rate = clampRate(rate);
  if (onEnd) {
    let done = false;
    const finish = () => { if (done) return; done = true; window.clearTimeout(guard); onEnd(); };
    const guard = window.setTimeout(finish, 4000 + text.length * 600);
    u.onend = finish; u.onerror = finish;
  }
  window.speechSynthesis.speak(u);
  return { ok: true, candidate };
}

let current: HTMLAudioElement | null = null;
// Recording playback is shared across pages so starting another speaker stops
// the previous recording instead of layering multiple pronunciations.
async function playRecording(c: Extract<AudioCandidate, { kind: 'recording' }>, rate: number): Promise<PlayResult> {
  try {
    current?.pause();
    const el = new Audio(c.attachment.url);
    el.playbackRate = clampRate(rate);
    current = el;
    await el.play();
    return { ok: true, candidate: c };
  } catch {
    // Never auto-switch: the learner chooses TTS with a fresh action.
    return { ok: false, candidate: c, reason: 'recording-failed', canUseTts: true };
  }
}

/**
 * Play one exact recording URL through the shared element (stopping any other
 * speaker). `onEnded` fires only when this clip finishes naturally, so callers
 * can chain clips (e.g. all four tones). Never falls back to TTS.
 */
export async function playRecordingUrl(url: string, slow = false, onEnded?: () => void): Promise<boolean> {
  try {
    current?.pause();
    const el = new Audio(url);
    el.playbackRate = slow ? SLOW_RATE : NORMAL_RATE;
    current = el;
    if (onEnded) el.addEventListener('ended', () => { if (current === el) onEnded(); }, { once: true });
    await el.play();
    return true;
  } catch {
    return false;
  }
}

/** Stop whichever recording is playing. */
export function stopRecording() {
  current?.pause();
  current = null;
}

export async function playPronunciation(req: AudioRequest, slow = false, preferTts = false): Promise<PlayResult> {
  const rate = slow ? SLOW_RATE : NORMAL_RATE;
  const first = preferTts ? { kind: 'tts', label: 'Browser TTS' } as const : audioCandidates(req)[0];
  if (first && first.kind === 'recording') return playRecording(first, rate);
  return speakTts(req.text, rate);
}

export function audioMessage(r: PlayResult) {
  if (r.ok) return null;
  if (r.reason === 'recording-failed') return 'The recording could not play.';
  if (r.reason === 'no-mandarin-voice') return 'No Mandarin voice is available on this device.';
  return 'Audio isn’t available in this browser.';
}

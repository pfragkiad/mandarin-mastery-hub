// Pinyin practice progress, remembered in this browser (localStorage).
// One entry per sound id ("ma3"): how often it was heard, answered right/wrong,
// and the latest result. "Needs review" means the latest answer was wrong, so
// one correct answer clears it. Quizzes favour review sounds, then unseen ones.
import type { PinyinSound } from './pinyin-guide';

export const PINYIN_PROGRESS_KEY = 'mandarin-pinyin-progress-v2';
export type SoundProgress = { heard: number; right: number; wrong: number; last?: 'right' | 'wrong'; at: string };
export type PinyinProgress = Record<string, SoundProgress>;
export type PracticeFocus = 'all' | 'review' | 'new';

const SOUND_ID = /^[a-zü]+[1-4]$/;
const count = (v: unknown) => (Number.isSafeInteger(v) && (v as number) >= 0 ? (v as number) : null);

/** Parse stored progress, dropping any malformed entry instead of failing. */
export function parseProgress(raw: string | null): PinyinProgress {
  try {
    const data = JSON.parse(raw ?? 'null');
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    const out: PinyinProgress = {};
    for (const [id, value] of Object.entries(data as Record<string, Partial<SoundProgress>>)) {
      if (!SOUND_ID.test(id) || !value || typeof value !== 'object') continue;
      const heard = count(value.heard), right = count(value.right), wrong = count(value.wrong);
      if (heard === null || right === null || wrong === null || typeof value.at !== 'string') continue;
      out[id] = { heard, right, wrong, at: value.at, ...(value.last === 'right' || value.last === 'wrong' ? { last: value.last } : {}) };
    }
    return out;
  } catch {
    return {};
  }
}

export function recordSound(progress: PinyinProgress, id: string, action: 'heard' | 'right' | 'wrong', now = new Date().toISOString()): PinyinProgress {
  const prior = progress[id] ?? { heard: 0, right: 0, wrong: 0, at: now };
  return {
    ...progress,
    [id]: {
      ...prior,
      heard: prior.heard + Number(action === 'heard'),
      right: prior.right + Number(action === 'right'),
      wrong: prior.wrong + Number(action === 'wrong'),
      at: now,
      ...(action === 'heard' ? {} : { last: action }),
    },
  };
}

export const needsReview = (p: SoundProgress | undefined) => p?.last === 'wrong';
export const answered = (p: SoundProgress | undefined) => Boolean(p && p.right + p.wrong > 0);

export function filterByFocus<T extends PinyinSound>(sounds: T[], progress: PinyinProgress, focus: PracticeFocus): T[] {
  if (focus === 'review') return sounds.filter(s => needsReview(progress[s.id]));
  if (focus === 'new') return sounds.filter(s => !answered(progress[s.id]));
  return sounds;
}

/**
 * Pick the next quiz sound: review sounds weigh 4, unanswered 2, others 1, and
 * the previous sound is skipped when anything else is available.
 */
export function pickNextSound<T extends PinyinSound>(pool: T[], progress: PinyinProgress, previousId?: string, random = Math.random): T | null {
  const candidates = pool.length > 1 ? pool.filter(s => s.id !== previousId) : pool;
  if (!candidates.length) return null;
  const weight = (s: T) => (needsReview(progress[s.id]) ? 4 : answered(progress[s.id]) ? 1 : 2);
  const total = candidates.reduce((sum, s) => sum + weight(s), 0);
  let roll = random() * total;
  for (const s of candidates) { roll -= weight(s); if (roll < 0) return s; }
  return candidates[candidates.length - 1] ?? null;
}

export function progressSummary(progress: PinyinProgress, total: number) {
  const entries = Object.values(progress);
  return { practised: entries.filter(answered).length, review: entries.filter(needsReview).length, total };
}

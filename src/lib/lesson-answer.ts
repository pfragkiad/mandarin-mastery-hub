/**
 * Splits a recorded practice-question answer into display lines, without changing its text.
 * Each line (answers separate turns with "\n") becomes:
 * - a sentence when it reads "汉字 (pinyin) — English" (English optional), optionally led by a
 *   one-letter speaker ("A: …"), so dialogue answers render like the lesson's conversations;
 * - plain text otherwise, kept verbatim so unknown wording is never reinterpreted.
 */
export type AnswerLine =
  | { kind: 'sentence'; speaker: string | null; hanzi: string; pinyin: string; english: string }
  | { kind: 'text'; text: string };

const HAN = /\p{Script=Han}/u;
const SENTENCE = /^(.+?)\s*[(（]([^()（）]+)[)）]\s*(?:[—–-]+\s*(.+))?$/u;
const SPEAKER = /^([A-Z])\s*[:：]\s*(.+)$/u;

export function parseAnswerLines(answer: string): AnswerLine[] {
  return answer.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map((raw): AnswerLine => {
    const sp = SPEAKER.exec(raw);
    const body = sp ? sp[2]! : raw;
    const m = SENTENCE.exec(body);
    // Pinyin must hold no hanzi and the head must hold some, so "Use 请问 (qǐngwèn) to…" style
    // English sentences stay plain text.
    if (m && HAN.test(m[1]!) && !HAN.test(m[2]!) && !/[A-Za-z]{2,}/.test(m[1]!.replace(/\p{Script=Han}/gu, ''))) {
      return { kind: 'sentence', speaker: sp ? sp[1]! : null, hanzi: m[1]!.trim(), pinyin: m[2]!.trim(), english: (m[3] ?? '').trim() };
    }
    return { kind: 'text', text: raw };
  });
}

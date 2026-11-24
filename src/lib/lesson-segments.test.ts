import { describe, expect, it } from 'vitest';
import { segmentLessonExpression } from './lesson-segments';

const words: Record<string, string> = { 对不起: 'w-duibuqi', 请问: 'w-qingwen', 明天: 'w-mingtian', 见: 'w-jian', 你好: 'w-nihao' };
const lookup = (h: string) => words[h] ?? null;

describe('segmentLessonExpression', () => {
  it('splits 对不起请问 into the two words', () => {
    expect(segmentLessonExpression('对不起请问', lookup)).toEqual([
      { kind: 'word', text: '对不起', id: 'w-duibuqi' },
      { kind: 'word', text: '请问', id: 'w-qingwen' },
    ]);
  });
  it('prefers a one-character word over the character', () => {
    expect(segmentLessonExpression('明天见', lookup).map(s => s.kind)).toEqual(['word', 'word']);
  });
  it('falls back to characters only when no word matches', () => {
    expect(segmentLessonExpression('你好吗', lookup)).toEqual([
      { kind: 'word', text: '你好', id: 'w-nihao' },
      { kind: 'char', text: '吗' },
    ]);
  });
  it('keeps punctuation as plain text', () => {
    expect(segmentLessonExpression('你好！', lookup)[1]).toEqual({ kind: 'text', text: '！' });
  });
});

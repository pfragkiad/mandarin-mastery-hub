import { describe, expect, it } from 'vitest';
import { displayDescription, displaySubtitle, displayTags } from './lesson-header-copy';

describe('lesson header copy', () => {
  it('hides the course-wide "Topic-based beginner conversation lesson" subtitle', () => {
    expect(displaySubtitle('Topic-based beginner conversation lesson')).toBe('');
    expect(displaySubtitle('Clock Times and Times of Day')).toBe('Clock Times and Times of Day');
  });

  it('removes the transcript source sentence and keeps the rest of the description', () => {
    expect(displayDescription('Practice start a polite conversation. Transcript-referenced conversational Mandarin study organized by communicative goal rather than audio track.'))
      .toBe('Practice start a polite conversation.');
    expect(displayDescription('Includes 一 (yī) tone sandhi.')).toBe('Includes 一 (yī) tone sandhi.');
  });

  it('drops course, level and format tags and shows at most three content tags', () => {
    expect(displayTags(['conversational-mandarin', 'beginner', 'topic-lesson', 'greetings', 'apologies', 'courtesy']))
      .toEqual(['greetings', 'apologies', 'courtesy']);
    expect(displayTags(['hsk-level-2', 'topic-study', 'stations', 'tickets', 'transport', 'maps'])).toEqual(['stations', 'tickets', 'transport']);
  });
});

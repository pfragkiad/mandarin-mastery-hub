import { describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { LessonPage } from './lesson-page';
import { loadLesson } from '@/lib/lessons';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className, to }: { children?: React.ReactNode; className?: string; to?: string }) => <a className={className} data-to={to}>{children}</a>,
}));
vi.mock('./workspace', () => ({
  useWorkspace: () => ({ items: [], saved: [], preferences: { includeTraditional: false, pinyin: true, slow: false, lessonHints: undefined }, setPreferences: () => {}, catalogVersion: 0, theme: 'light' }),
}));
vi.mock('./use-pronunciation-availability', () => ({ usePronunciationAvailability: () => true }));

describe('scratch', () => {
  it('dumps the legacy choice button markup', async () => {
    const lesson = structuredClone((await loadLesson('char-6B21'))!);
    lesson.sections.practice = { enabled: true, questions: [
      { id: 'legacy-choice', kind: 'selection', prompt: 'Choose next time.', choices: [{ hanzi: '下次', pinyin: 'xià cì' }], answer: 'Recorded legacy answer.', explanation: '' },
    ] };
    const { container } = render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    const btn = container.querySelector('.lesson-choice');
    console.log('CHOICE HTML:', btn?.outerHTML);
    expect(btn).toBeTruthy();
    cleanup();
  });
});

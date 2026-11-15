import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LessonPage } from './lesson-page';
import { lessonSummaries, loadLesson } from '@/lib/lessons';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className, to }: { children?: React.ReactNode; className?: string; to?: string }) => <a className={className} data-to={to}>{children}</a>,
}));
vi.mock('./workspace', () => ({
  useWorkspace: () => ({ items: [], saved: [], preferences: { includeTraditional: false, pinyin: true, slow: false }, catalogVersion: 0, theme: 'light' }),
}));
vi.mock('./use-pronunciation-availability', () => ({ usePronunciationAvailability: () => true }));
afterEach(cleanup);

describe('LessonPage', () => {
  it.each(lessonSummaries.map(s => s.id))('renders lesson %s from its JSON', async id => {
    const lesson = (await loadLesson(id))!;
    render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    expect(screen.getByRole('heading', { level: 1, name: lesson.summary.title })).toBeTruthy();
  });

  it('a practice choice reveals the recorded answer without grading it', async () => {
    const lesson = (await loadLesson('char-6B21'))!;
    const { container } = render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    const question = container.querySelectorAll('.lesson-question')[1]!;
    fireEvent.click(question.querySelectorAll('.lesson-choice')[1]!);
    expect(question.querySelector('.lesson-answer')?.textContent).toContain('下次');
    expect(question.querySelector('.is-correct, .is-wrong')).toBeNull();
  });

  it('the priority filter shows only that priority\'s words', async () => {
    const lesson = (await loadLesson('char-6B21'))!;
    const a = lesson.sections.vocabulary!.items.filter(v => v.priority === 'A').length;
    const { container } = render(<LessonPage lesson={lesson} priority="A" onPriority={() => {}}/>);
    expect(container.querySelectorAll('.lesson-vocab')).toHaveLength(a);
  });
});

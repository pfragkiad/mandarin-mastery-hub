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
    const { container } = render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    expect(screen.getByRole('heading', { level: 1, name: lesson.summary.title })).toBeTruthy();
    expect(lesson.summary.schemaVersion).toBe('mandarin-character-lesson/2.6.0');
    expect(container.querySelectorAll('.lesson-example')).toHaveLength(lesson.sections.examples!.items.length);
    expect(container.querySelector('#lesson-sources, .lesson-provenance')).toBeNull();
  });

  it('renders the recorded corpus comparison without source IDs in v2.5', async () => {
    const lesson = (await loadLesson('char-4EE5'))!;
    const { container } = render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    expect(container.querySelector('.lesson-preference')?.textContent).toContain('166 abstract · 23 concrete');
    expect(container.querySelector('.lesson-preference')?.textContent).toContain('146 abstract · 173 concrete');
  });

  it('still displays provenance when an older lesson records it', async () => {
    const lesson = structuredClone((await loadLesson('char-6B21'))!);
    lesson.summary.schemaVersion = 'mandarin-character-lesson/2.4.0';
    lesson.sections.examples!.items[0]!.provenance = 'report_extracted';
    lesson.sections.extensions!.items[0]!.verification_status = 'needs_review';
    const { container } = render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    expect(container.querySelector('.lesson-example .lesson-register')?.textContent).toBe('report extracted');
    expect(container.querySelector('#lesson-more')?.textContent).toContain('needs review');
  });

  it('a practice choice reveals the recorded answer without grading it', async () => {
    const lesson = (await loadLesson('char-6B21'))!;
    const { container } = render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    const question = container.querySelectorAll('.lesson-question')[1]!;
    fireEvent.click(question.querySelectorAll('.lesson-choice')[1]!);
    expect(question.querySelector('.lesson-answer')?.textContent).toContain('下次');
    expect(question.querySelector('.is-correct, .is-wrong')).toBeNull();
  });

  it('reveals recorded text choices and legacy answer text', async () => {
    const lesson = structuredClone((await loadLesson('char-6B21'))!);
    lesson.sections.practice = { enabled: true, questions: [
      { id: 'text-choice', kind: 'selection', prompt: 'What does it count?', choices: [{ id: 'a', text: 'Occurrences' }, { id: 'b', text: 'Objects' }], correct_choice_ids: ['a'], explanation: 'An action count.' },
      { id: 'legacy-choice', kind: 'selection', prompt: 'Choose next time.', choices: [{ hanzi: '下次', pinyin: 'xià cì' }], answer: 'Recorded legacy answer.', explanation: '' },
    ] };
    const { container } = render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Objects' }));
    expect(container.querySelector('.lesson-answer')?.textContent).toContain('Occurrences');
    fireEvent.click(screen.getByRole('button', { name: '下次 xià cì' }));
    expect(container.querySelectorAll('.lesson-answer')[1]?.textContent).toContain('Recorded legacy answer.');
  });

  it('the priority filter shows only that priority\'s words', async () => {
    const lesson = (await loadLesson('char-6B21'))!;
    const a = lesson.sections.vocabulary!.items.filter(v => v.priority === 'A').length;
    const { container } = render(<LessonPage lesson={lesson} priority="A" onPriority={() => {}}/>);
    expect(container.querySelectorAll('.lesson-vocab')).toHaveLength(a);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LessonPage } from './lesson-page';
import { lessonSummaries, loadLesson } from '@/lib/lessons';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className, to }: { children?: React.ReactNode; className?: string; to?: string }) => <a className={className} data-to={to}>{children}</a>,
}));
const prefs = vi.hoisted(() => ({ lessonHints: undefined as boolean | undefined }));
vi.mock('./workspace', () => ({
  useWorkspace: () => ({ items: [], saved: [], preferences: { includeTraditional: false, pinyin: true, slow: false, lessonHints: prefs.lessonHints }, setPreferences: () => {}, catalogVersion: 0, theme: 'light' }),
}));
vi.mock('./use-pronunciation-availability', () => ({ usePronunciationAvailability: () => true }));
afterEach(() => { cleanup(); prefs.lessonHints = undefined; });

describe('LessonPage', () => {
  it.each(lessonSummaries.map(s => s.id))('renders lesson %s from its JSON', async id => {
    const lesson = (await loadLesson(id))!;
    const { container } = render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    expect(screen.getByRole('heading', { level: 1, name: lesson.summary.title })).toBeTruthy();
    expect(lesson.summary.schemaVersion).toBe('mandarin-character-lesson/2.8.0');
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

  it('a wrong pick is marked wrong and the recorded answer is marked', async () => {
    const lesson = (await loadLesson('char-6B21'))!;
    const { container } = render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    const question = container.querySelectorAll('.lesson-question')[1]!;
    const choices = question.querySelectorAll('.lesson-choice');
    fireEvent.click(choices[1]!); // 上次 — recorded correct ID is "a" (下次)
    expect(choices[1]!.classList.contains('is-wrong')).toBe(true);
    expect(choices[0]!.classList.contains('is-answer')).toBe(true);
    expect(question.querySelector('.lesson-verdict')?.textContent).toContain('Not quite');
    fireEvent.click(choices[0]!); // locked after answering
    expect(choices[0]!.classList.contains('is-correct')).toBe(false);
  });

  it('a right pick is marked correct and Try again resets', async () => {
    const lesson = (await loadLesson('char-6B21'))!;
    const { container } = render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    const question = container.querySelectorAll('.lesson-question')[1]!;
    fireEvent.click(question.querySelectorAll('.lesson-choice')[0]!);
    expect(question.querySelector('.lesson-choice.is-correct')).not.toBeNull();
    expect(question.querySelector('.lesson-verdict')?.textContent).toBe('Correct!');
    fireEvent.click(screen.getAllByRole('button', { name: 'Try again' })[0]!);
    expect(question.querySelector('.is-correct, .is-wrong, .lesson-verdict')).toBeNull();
  });

  it('multi-selection grades only on Check and needs every correct choice', async () => {
    const lesson = structuredClone((await loadLesson('char-6B21'))!);
    lesson.sections.practice = { enabled: true, questions: [
      { id: 'multi', kind: 'multi_selection', prompt: 'Which mean a time?', choices: [{ id: 'a', text: 'Next' }, { id: 'b', text: 'Apple' }, { id: 'c', text: 'Last' }], correct_choice_ids: ['a', 'c'], explanation: '' },
    ] };
    const { container } = render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(container.querySelector('.lesson-verdict')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(container.querySelector('.lesson-verdict')?.textContent).toContain('Not quite');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Last' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(container.querySelector('.lesson-verdict')?.textContent).toBe('Correct!');
  }, 15000);

  it('legacy questions without answer IDs are never graded', async () => {
    const lesson = structuredClone((await loadLesson('char-6B21'))!);
    lesson.sections.practice = { enabled: true, questions: [
      { id: 'legacy', kind: 'selection', prompt: 'Choose.', choices: [{ hanzi: '下次', pinyin: 'xià cì' }, { hanzi: '上次', pinyin: 'shàng cì' }], answer: '下次', explanation: '' },
    ] };
    const { container } = render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    fireEvent.click(container.querySelectorAll('.lesson-choice')[1]!);
    expect(container.querySelector('.lesson-answer')?.textContent).toContain('下次');
    expect(container.querySelector('.is-correct, .is-wrong, .lesson-verdict')).toBeNull();
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
    // Class locator: once the syllable inventory is warm, hover pairing wraps each
    // choice glyph in its own span, which changes the button's computed name.
    fireEvent.click(container.querySelectorAll('.lesson-choice')[2]!);
    expect(container.querySelectorAll('.lesson-answer')[1]?.textContent).toContain('Recorded legacy answer.');
  });

  it('the priority filter shows only that priority\'s words', async () => {
    const lesson = (await loadLesson('char-6B21'))!;
    const a = lesson.sections.vocabulary!.items.filter(v => v.priority === 'A').length;
    const { container } = render(<LessonPage lesson={lesson} priority="A" onPriority={() => {}}/>);
    expect(container.querySelectorAll('.lesson-vocab')).toHaveLength(a);
  });

  it('character hints: every hanzi is a hint target by default, plain text with no links when switched off', async () => {
    const lesson = (await loadLesson('char-6B21'))!;
    const on = render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    const headword = on.container.querySelector('.lesson-headword-glyph')!;
    expect(headword.querySelectorAll('[data-lesson-hint]')).toHaveLength(Array.from(lesson.headword!.hanzi).length);
    expect(on.container.querySelector('.lesson-example [data-lesson-hint]')).not.toBeNull();
    cleanup();
    prefs.lessonHints = false;
    const off = render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    expect(off.container.querySelector('[data-lesson-hint]')).toBeNull();
    expect(off.container.querySelector('.lesson-main a.lesson-hanzi, .lesson-example a.sentence-char')).toBeNull();
    expect(off.container.querySelector('.lesson-headword-glyph')?.textContent).toBe(lesson.headword!.hanzi);
  });

  it('character hints appear in a practice question only after it is answered', async () => {
    const lesson = (await loadLesson('char-6B21'))!;
    const { container } = render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    const question = container.querySelectorAll('.lesson-question')[1]!;
    expect(question.querySelector('[data-lesson-hint]')).toBeNull();
    fireEvent.click(question.querySelectorAll('.lesson-choice')[1]!);
    expect(question.querySelector('[data-lesson-hint]')).not.toBeNull();
  });
});

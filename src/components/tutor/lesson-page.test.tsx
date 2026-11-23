import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LessonPage } from './lesson-page';
import { patternSpeechText } from './lesson-text';
import { lessonSummaries, loadLesson } from '@/lib/lessons';

const router = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => router.navigate,
  Link: ({ children, className, to }: { children?: React.ReactNode; className?: string; to?: string }) => <a className={className} data-to={to}>{children}</a>,
}));
const prefs = vi.hoisted(() => ({ lessonHints: undefined as boolean | undefined, items: [] as unknown[] }));
vi.mock('./workspace', () => ({
  useWorkspace: () => ({ items: prefs.items, saved: [], preferences: { includeTraditional: false, pinyin: true, slow: false, lessonHints: prefs.lessonHints }, setPreferences: () => {}, catalogVersion: 0, theme: 'light' }),
}));
vi.mock('./use-pronunciation-availability', () => ({ usePronunciationAvailability: () => true }));
afterEach(() => { cleanup(); prefs.lessonHints = undefined; prefs.items = []; });

describe('LessonPage', () => {
  it.each(lessonSummaries.map(s => s.id))('renders lesson %s from its JSON', async id => {
    const lesson = (await loadLesson(id))!;
    const { container } = render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    expect(container.querySelector('h1')?.textContent).toContain(lesson.summary.title);
    expect(['mandarin-character-lesson/3.2.0', 'mandarin-topic-lesson/3.3.0', 'mandarin-general-lesson/3.2.0', 'mandarin-general-lesson/3.3.0']).toContain(lesson.summary.schemaVersion);
    if (lesson.topic?.plan) {
      // v3.1: teaching path first, every word once in the word bank, no source examples repeated.
      expect(container.querySelectorAll('.lesson-details .lesson-bank-word')).toHaveLength(lesson.topic.items.length);
      expect(container.querySelectorAll('.lesson-turn')).toHaveLength(lesson.topic.plan.dialogue.turns.length);
      expect(container.querySelector('.lesson-topic-word')).toBeNull();
    } else if (lesson.sections.blocks) {
      const blocks = lesson.sections.blocks;
      const turns = blocks.reduce((n, b) => n + (b.kind === 'dialogue' ? b.turns.length : 0), 0);
      const expressions = blocks.reduce((n, b) => n + (b.kind === 'review_set' ? b.items.length : 0), 0);
      expect(container.querySelectorAll('.lesson-turn')).toHaveLength(turns);
      expect(container.querySelectorAll('.lesson-vocab')).toHaveLength(expressions);
      expect(container.querySelectorAll('.lesson-question')).toHaveLength(lesson.sections.practice!.questions.length);
      expect(container.querySelector('.lesson-hero .eyebrow')?.textContent).toContain('CONVERSATION LESSON');
    } else expect(container.querySelectorAll('#lesson-examples .lesson-example')).toHaveLength(lesson.sections.examples!.items.length);
    expect(container.querySelector('#lesson-sources, .lesson-provenance')).toBeNull();
  });

  it('Key expressions show a recorded usage note below the phrase, never speak it, and omit it when absent', async () => {
    const lesson = (await loadLesson('convm-with-someone'))!;
    const items = lesson.sections.blocks!.flatMap(b => b.kind === 'review_set' ? b.items : []);
    const { container } = render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    const cards = Array.from(container.querySelectorAll('.lesson-vocab'));
    expect(cards).toHaveLength(items.length);
    items.forEach((item, i) => {
      const note = cards[i]!.querySelector('.lesson-usage-note');
      if (!item.usage_note) { expect(note).toBeNull(); return; }
      expect(note?.querySelector('.lesson-usage-label')?.textContent).toBe(item.usage_label);
      // Pronunciation stays on the original phrase: no speaker names the note's alternative forms.
      expect(note?.querySelector('button')).toBeNull();
      const speakers = Array.from(cards[i]!.querySelectorAll('button[aria-label]')).map(b => b.getAttribute('aria-label'));
      expect(speakers.length).toBeGreaterThan(0);
      expect(speakers.every(label => label === `Listen to ${item.hanzi}`)).toBe(true);
    });
    expect(items.filter(i => i.usage_note)).toHaveLength(2);
  });

  it('a pattern whose example repeats the formula and function shows each once', async () => {
    const lesson = (await loadLesson('convm-greetings-politeness'))!;
    const blocks = lesson.sections.blocks!.map(b => b.kind === 'grammar_pattern' ? { ...b, pattern_hanzi: b.example.hanzi, pattern_pinyin: b.example.pinyin, example: { ...b.example, teaching_note: b.function_en } } : b);
    const { container } = render(<LessonPage lesson={{ ...lesson, sections: { ...lesson.sections, blocks } }} priority={undefined} onPriority={() => {}}/>);
    const cards = container.querySelectorAll('.lesson-pattern');
    expect(cards.length).toBeGreaterThan(0);
    cards.forEach(card => {
      expect(card.querySelector('.lesson-pattern-line')).toBeNull();
      expect(card.querySelector('.lesson-teaching')).toBeNull();
    });
  });

  it('every pattern template line has a speaker beside its pinyin', async () => {
    const lesson = (await loadLesson('convm-greetings-politeness'))!;
    const { container } = render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    const lines = container.querySelectorAll('.lesson-pattern .lesson-pattern-line');
    expect(lines.length).toBeGreaterThan(0);
    lines.forEach(line => {
      const hanzi = line.querySelector('.lesson-hanzi')!.textContent!;
      expect(line.querySelector('.lesson-term-reading .pinyin')).not.toBeNull();
      const labels = Array.from(line.querySelectorAll('button'), b => b.getAttribute('aria-label'));
      expect(labels).toContain(`Listen to ${hanzi}`);
    });
  });

  it('a pattern template speaks its "+" joiners as pauses, keeping slot labels', () => {
    expect(patternSpeechText('陈述句 + 吗？')).toBe('陈述句，吗？');
    expect(patternSpeechText('数字 + 加 + 数字 + 是多少？')).toBe('数字，加，数字，是多少？');
  });

  it('a topic lesson word links to the Vocabulary record with its HSK number and headword', async () => {
    const lesson = (await loadLesson('topic-abilities-interests'))!;
    const item = lesson.topic!.items[0]!; // 会 huì, HSK 3.0 entry 82
    const ref = item.syllabus_refs[0]!;
    const entry = (index: number, simplified: string) => ({ simplified, entryKind: 'word', hskVersion: '3.0', hskLevel: 1, hsk_index: index });
    prefs.items = [
      { id: 'other-number', hanzi: item.hanzi, pinyin: item.pinyin, audio: null, hskId: ref.entry_id + 1, entry: entry(ref.entry_id + 1, item.hanzi) },
      { id: 'exact', hanzi: item.hanzi, pinyin: item.pinyin, audio: null, hskId: ref.entry_id, entry: entry(ref.entry_id, item.hanzi) },
    ];
    const { container } = render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    const card = container.querySelector('.lesson-details .lesson-bank-word')!;
    expect(card.querySelector('a.lesson-word-link')?.getAttribute('data-to')).toBe('/vocabulary');
    expect(card.textContent).toContain(`HSK L1/#${ref.entry_id}`);
  });

  it('a topic lesson word with no exact record stays plain text', async () => {
    const lesson = (await loadLesson('topic-abilities-interests'))!;
    const item = lesson.topic!.items[0]!;
    prefs.items = [{ id: 'same-form-other-number', hanzi: item.hanzi, pinyin: item.pinyin, audio: null, entry: { simplified: item.hanzi, entryKind: 'word', hskVersion: '3.0', hskLevel: 1, hsk_index: 9999 } }];
    const { container } = render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    expect(container.querySelector('.lesson-bank-word a.lesson-word-link')).toBeNull();
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

  it('Complete lesson marks it done and returns to its course on the Lessons page', async () => {
    const lesson = (await loadLesson('topic-personal-pronouns'))!;
    router.navigate.mockClear();
    render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Complete lesson' }));
    expect(router.navigate).toHaveBeenCalledWith({ to: '/lessons' });
    expect(localStorage.getItem('lesson_progress_v1')).toContain('"completed":true');
  });

  it('lesson titles carry no Draft pill', async () => {
    const lesson = (await loadLesson('topic-personal-pronouns'))!;
    render(<LessonPage lesson={lesson} priority={undefined} onPriority={() => {}}/>);
    expect(screen.queryByText('Draft')).toBeNull();
  });
});

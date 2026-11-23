import { describe, expect, it } from 'vitest';
import { cardLessons, lessonDeckGroups, lessonDeckIds, lessonDeckKind } from './flashcard-lessons';
import { words } from './mandarin';
import { lessonCharacterRefs } from './lessons';

const wordRecords = words.filter(w => w.entry?.entryKind === 'word');
const byHsk = (n: number) => wordRecords.find(w => w.entry?.hskVersion === '3.0' && w.entry?.hsk_index === n)!;

describe('Flashcard lesson decks', () => {
  it('offers lesson decks only for Characters and Words', () => {
    expect(lessonDeckKind('Ref:Character')).toBe('Characters');
    expect(lessonDeckKind('Words')).toBe('Words');
    expect(lessonDeckKind('Ref:Component')).toBeUndefined();
    expect(lessonDeckKind('Ref:Radical')).toBeUndefined();
    expect(lessonDeckKind('Phrases')).toBeUndefined();
  });
  it('builds a Words deck from the course placement syllabus IDs (HSK numbers), not spellings', () => {
    const ids = lessonDeckIds('topic-personal-pronouns', 'Words', words);
    // The Personal pronouns placement records 12 introduced HSK entries.
    expect(ids.size).toBe(12);
    expect(ids.has(byHsk(221).id)).toBe(true); // 我 #221
    for (const id of ids) expect(words.find(w => w.id === id)?.entry?.entryKind).toBe('word');
  });
  it('gives Conversation lessons no Words deck but a Characters deck from their recorded refs', () => {
    expect(lessonDeckIds('convm-greetings-politeness', 'Words', words).size).toBe(0);
    const chars = lessonDeckIds('convm-greetings-politeness', 'Characters', words);
    expect(chars.size).toBe(Object.keys(lessonCharacterRefs['convm-greetings-politeness'] ?? {}).length);
    for (const id of chars) expect(id.startsWith('Characters:')).toBe(true);
  });
  it('lists lessons grouped by course, HSK course first, then independent lessons', () => {
    const groups = lessonDeckGroups();
    expect(groups.map(g => g.lessons.length)).toEqual([46, 15, 2]);
    expect(groups[2]?.label).toBe('Independent lessons');
    expect(groups[0]?.lessons[0]?.title).toMatch(/^1\. /);
  });
  it('links a word card only to the lessons that record its HSK number', () => {
    const me = byHsk(221);
    expect(cardLessons({ id: me.id, hanzi: me.hanzi, entry: me.entry }).map(l => l.id)).toContain('topic-personal-pronouns');
    expect(cardLessons({ id: 'Characters:次', hanzi: '次', libraryKind: 'Characters' }).map(l => l.id)).toEqual(['char-6B21']);
    expect(cardLessons({ id: 'Components:次', hanzi: '次', libraryKind: 'Components' })).toEqual([]);
  });
});

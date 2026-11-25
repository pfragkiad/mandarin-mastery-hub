import { Link } from '@tanstack/react-router';
import { BookText } from 'lucide-react';
import { characterLessons } from '@/lib/lessons';
import { lessonsForWord } from '@/lib/lesson-curricula';
import type { Word } from '@/lib/mandarin';

/**
 * Lesson links on record cards: CharacterLessonsSection/Indicator for Characters records
 * (lessons about that character) and WordLessonsSection/Indicator for Vocabulary words
 * (course lessons that teach that exact HSK word).
 *
 * Lessons about one exact Characters record, shown on its details card (characters-page.tsx).
 * Inputs: the record's ID and exact hanzi. Matching uses the lesson's recorded
 * catalog_character_id, else its exact headword (lessons.ts lessonsForCharacterRecord), so a look-alike or script partner never borrows a lesson.
 * Renders nothing when no lesson is about this character.
 */
export function CharacterLessonsSection({ recordId, hanzi }: { recordId: string; hanzi: string }) {
  const lessons = characterLessons(recordId, hanzi);
  if (!lessons.length) return null;
  return <section className="glyph-usage-section lesson-links-section" aria-label="Lessons">
    <h3 className="eyebrow"><BookText size={13} aria-hidden="true"/>LESSONS</h3>
    <ul className="lesson-links">{lessons.map(l => <li key={l.id}><Link to="/lessons/$lessonId" params={{ lessonId: l.id }} className="lesson-link">
      <BookText size={15} aria-hidden="true"/><span><strong>{l.title}</strong>{l.subtitle && <small>{l.subtitle}</small>}</span>
    </Link></li>)}</ul>
  </section>;
}

/** Card indicator (top row, beside "In a phrase available"): a book when a lesson covers this exact character. */
export function CharacterLessonIndicator({ recordId, hanzi }: { recordId: string; hanzi: string }) {
  const count = characterLessons(recordId, hanzi).length;
  if (!count) return null;
  const label = count === 1 ? 'Lesson available' : `${count} lessons available`;
  return <span title={label}><BookText className="catalog-source-icon" aria-label={label}/></span>;
}

/** The exact Vocabulary record a word card shows (its entry carries the HSK identity). */
const wordLessons = (word: Word) => word.entry ? lessonsForWord(word.entry) : [];
/** How many course lessons teach this exact word (lets a card render its indicator row only when needed). */
export const wordLessonCount = (word: Word) => wordLessons(word).length;

/**
 * Lessons that teach one exact Vocabulary word, shown on its details card (word-card.tsx).
 * Input: the word record. Only course placements that record this word's official HSK entry
 * number count (lesson-curricula.ts wordLessonPlacements), never a spelling match, so
 * 点 #33 and a same-spelled entry with another number each get only their own lessons.
 * Each link also names where the lesson sits in its course. Renders nothing without lessons.
 */
export function WordLessonsSection({ word }: { word: Word }) {
  const lessons = wordLessons(word);
  if (!lessons.length) return null;
  return <section className="glyph-usage-section lesson-links-section" aria-label="Lessons">
    <h3 className="eyebrow"><BookText size={13} aria-hidden="true"/>LESSONS</h3>
    <ul className="lesson-links">{lessons.map(p => <li key={p.placement.id}><Link to="/lessons/$lessonId" params={{ lessonId: p.placement.lesson.id }} className="lesson-link">
      <BookText size={15} aria-hidden="true"/><span><strong>{p.placement.lesson.title}</strong>{p.placement.lesson.subtitle && <small>{p.placement.lesson.subtitle}</small>}<small>{p.section.title} · Lesson {p.index} of {p.total}{p.introduced ? '' : ' · review'}</small></span>
    </Link></li>)}</ul>
  </section>;
}

/** Word card indicator (top row): a book when a course lesson teaches this exact HSK word. */
export function WordLessonIndicator({ word }: { word: Word }) {
  const count = wordLessons(word).length;
  if (!count) return null;
  const label = count === 1 ? 'Lesson available' : `${count} lessons available`;
  return <span title={label}><BookText className="catalog-source-icon" aria-label={label}/></span>;
}

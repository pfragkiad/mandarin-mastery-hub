import { Link } from '@tanstack/react-router';
import { BookText } from 'lucide-react';
import { characterLessons } from '@/lib/lessons';

/**
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

/** Card indicator (top row, beside "In a sentence available"): a book when a lesson covers this exact character. */
export function CharacterLessonIndicator({ recordId, hanzi }: { recordId: string; hanzi: string }) {
  const count = characterLessons(recordId, hanzi).length;
  if (!count) return null;
  const label = count === 1 ? 'Lesson available' : `${count} lessons available`;
  return <span title={label}><BookText className="catalog-source-icon" aria-label={label}/></span>;
}

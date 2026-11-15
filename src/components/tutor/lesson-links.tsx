import { Link } from '@tanstack/react-router';
import { BookText } from 'lucide-react';
import { characterLessons } from '@/lib/lessons';

/**
 * Lessons about one exact Characters record, shown on its details card (characters-page.tsx).
 * Input: the record's exact hanzi. Matching is by the lesson's recorded headword only
 * (lessons.ts characterLessons), so a look-alike or script partner never borrows a lesson.
 * Renders nothing when no lesson is about this character.
 */
export function CharacterLessonsSection({ hanzi }: { hanzi: string }) {
  const lessons = characterLessons(hanzi);
  if (!lessons.length) return null;
  return <section className="glyph-usage-section lesson-links-section" aria-label="Lessons">
    <h3 className="eyebrow"><BookText size={13} aria-hidden="true"/>LESSONS</h3>
    <ul className="lesson-links">{lessons.map(l => <li key={l.id}><Link to="/lessons/$lessonId" params={{ lessonId: l.id }} className="lesson-link">
      <BookText size={15} aria-hidden="true"/><span><strong>{l.title}</strong>{l.subtitle && <small>{l.subtitle}</small>}</span>
    </Link></li>)}</ul>
  </section>;
}

/** Card indicator (top row, beside "In a sentence available"): a book when a lesson covers this exact character. */
export function CharacterLessonIndicator({ hanzi }: { hanzi: string }) {
  const count = characterLessons(hanzi).length;
  if (!count) return null;
  const label = count === 1 ? 'Lesson available' : `${count} lessons available`;
  return <span title={label}><BookText className="catalog-source-icon" aria-label={label}/></span>;
}

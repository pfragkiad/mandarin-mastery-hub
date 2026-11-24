/**
 * Learner-facing lesson header copy (lesson page hero and lesson index cards).
 *
 * Purpose: lesson files sometimes carry text that describes the course or how the lesson was
 * made rather than what it teaches — a subtitle shared by a whole course, a source note in the
 * description, or tags naming the level/format. The owner asked for these to be hidden.
 * These pure helpers only *hide* exact, listed text; they never rewrite or invent copy, and the
 * recorded fields stay intact (lesson search still matches every recorded tag and sentence).
 *
 * Inputs: the recorded subtitle / description / tags strings. Outputs: what to show.
 * When the lesson creator stops emitting these (see src/data/study_lessons/README.md,
 * "Header copy"), the lists below simply match nothing.
 */

/** Exact subtitles that say nothing about the lesson's own content (owner request). */
const HIDDEN_SUBTITLES = new Set([
  'Topic-based beginner conversation lesson',
]);

/** Exact description sentences that describe sources/production, not the lesson (owner request). */
const HIDDEN_SENTENCES = new Set([
  'Transcript-referenced conversational Mandarin study organized by communicative goal rather than audio track.',
]);

/** Tags that restate the course, level or lesson format — already shown by the course line. */
const FORMAT_TAGS = new Set(['topic-lesson', 'topic-study', 'conversational-mandarin', 'beginner', 'intermediate', 'advanced', 'character-usage']);
const isFormatTag = (tag: string) => FORMAT_TAGS.has(tag) || /^hsk-level-\d+$/.test(tag);

/** The subtitle to show, or '' when it is a listed course-wide boilerplate line. */
export function displaySubtitle(subtitle: string): string {
  return HIDDEN_SUBTITLES.has(subtitle.trim()) ? '' : subtitle;
}

/** The description without listed source-note sentences (sentence split on . ! ? + space). */
export function displayDescription(description: string): string {
  const sentences = description.trim().split(/(?<=[.!?])\s+/);
  const kept = sentences.filter(s => !HIDDEN_SENTENCES.has(s.trim()));
  return kept.length === sentences.length ? description : kept.join(' ').trim();
}

/** Content tags only, in recorded order, at most `limit` (format/level tags dropped). */
export function displayTags(tags: readonly string[], limit = 3): string[] {
  return [...new Set(tags)].filter(t => !isFormatTag(t)).slice(0, limit);
}

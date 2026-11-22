/**
 * Lesson progress checkpoints (browser-safe, no React).
 *
 * Core v3.3 lessons record their own progress contract: `progress.sections[]`, each with
 * stable checkpoints `{ id, kind, label, optional, target_id? }`. Completion is
 * completed required checkpoints / all required checkpoints; optional ones are bonus work
 * and never block completion. Progress is saved by checkpoint ID only (lesson-progress.ts),
 * never by array position, so reordering a lesson never moves a learner's ticks.
 *
 * planCheckpoints() decides, for one rendered lesson page, where each checkpoint lives:
 *  - auto: its target_id is an interactive item on the page (a question, a "Show answer"
 *    reveal or a speaking task); answering/opening that item completes it.
 *  - card: its target_id is a pattern card on the page; a "Mark as done" tick sits on that card.
 *  - section: any other checkpoint; a tick sits at the end of the page section its progress
 *    section maps to (by section_key, or for general lessons by the target block).
 *  - finish: the mapped page section is not rendered (disabled or empty), so its tick sits in
 *    the end-of-lesson box and the lesson can still be completed.
 * Lessons without a valid contract (older files) keep the page's own legacy task keys.
 * A checkpoint label that quotes its own target ID ("Grammar patterns — grammar-1") is an
 * internal name, so its tick reads just "Mark as done" (checkpointLabel).
 */

export type LessonCheckpoint = { id: string; kind: string; label: string; optional: boolean; targetId: string | null; sectionKey: string; sectionTitle: string };
export type LessonProgressSection = { id: string; key: string; title: string; checkpoints: LessonCheckpoint[] };

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string, unknown>;

/** The recorded contract, validated; null when absent or malformed (missing IDs, duplicate
 *  checkpoint IDs, no required checkpoint), so a broken file falls back instead of half-working. */
export function toLessonProgress(raw: unknown): LessonProgressSection[] | null {
  const p = obj(raw);
  if (p['tracking_mode'] !== 'checkpoints' || !Array.isArray(p['sections'])) return null;
  const seen = new Set<string>();
  const sections: LessonProgressSection[] = [];
  for (const s of p['sections'] as unknown[]) {
    const so = obj(s);
    const id = str(so['id']), key = str(so['section_key']), title = str(so['title']);
    if (!id || !key || !Array.isArray(so['checkpoints'])) return null;
    const checkpoints: LessonCheckpoint[] = [];
    for (const c of so['checkpoints'] as unknown[]) {
      const co = obj(c);
      const cid = str(co['id']);
      if (!cid || seen.has(cid) || typeof co['optional'] !== 'boolean') return null;
      seen.add(cid);
      checkpoints.push({ id: cid, kind: str(co['kind']), label: str(co['label']), optional: co['optional'], targetId: str(co['target_id']) || null, sectionKey: key, sectionTitle: title });
    }
    sections.push({ id, key, title, checkpoints });
  }
  return sections.some(s => s.checkpoints.some(c => !c.optional)) ? sections : null;
}

/** Learner-facing tick text: the recorded label, unless it quotes its own target ID. */
export function checkpointLabel(c: Pick<LessonCheckpoint, 'label' | 'targetId'>): string {
  return !c.label || (c.targetId && c.label.includes(c.targetId)) ? 'Mark as done' : c.label;
}

export type CheckpointPlan = {
  /** Required checkpoint IDs (the progress total), in recorded order. */
  required: string[];
  optional: string[];
  /** Interactive target ID → its checkpoint (completed when the item is answered/opened). */
  auto: Map<string, LessonCheckpoint>;
  /** Pattern-card target ID → its manual checkpoint. */
  card: Map<string, LessonCheckpoint>;
  /** Page section ID → manual checkpoints ticked at that section's end ('finish' = end box). */
  section: Map<string, LessonCheckpoint[]>;
  /** Checkpoint ID → page section ID it counts under in the section menu. */
  pageOf: Map<string, string>;
};

export type PageTargets = {
  /** Rendered page section IDs. */
  sections: readonly string[];
  /** Interactive item ID → page section it renders in. */
  interactive: ReadonlyMap<string, string>;
  /** Pattern card ID → page section it renders in. */
  cards: ReadonlyMap<string, string>;
  /** Other block target ID → page section (general-lesson blocks). */
  blocks: ReadonlyMap<string, string>;
  /** section_key → page section, per lesson family. */
  sectionKeys: Readonly<Record<string, string>>;
};

export function planCheckpoints(progress: LessonProgressSection[], page: PageTargets): CheckpointPlan {
  const rendered = new Set(page.sections);
  const plan: CheckpointPlan = { required: [], optional: [], auto: new Map(), card: new Map(), section: new Map(), pageOf: new Map() };
  const at = (where: string, c: LessonCheckpoint) => { const list = plan.section.get(where) ?? []; list.push(c); plan.section.set(where, list); };
  for (const s of progress) for (const c of s.checkpoints) {
    (c.optional ? plan.optional : plan.required).push(c.id);
    const t = c.targetId;
    const interactive = t ? page.interactive.get(t) : undefined;
    if (t && interactive && rendered.has(interactive)) { plan.auto.set(t, c); plan.pageOf.set(c.id, interactive); continue; }
    const card = t ? page.cards.get(t) : undefined;
    if (t && card && rendered.has(card)) { plan.card.set(t, c); plan.pageOf.set(c.id, card); continue; }
    const where = (t && page.blocks.get(t)) || page.sectionKeys[s.key];
    if (where && rendered.has(where)) { at(where, c); plan.pageOf.set(c.id, where); }
    else { at('finish', c); plan.pageOf.set(c.id, 'finish'); }
  }
  return plan;
}

/** Saved keys from before the contract (build-1, reading-1, speaking-<id>, question IDs) →
 *  checkpoint IDs, through the same recorded targets; unknown keys are dropped. */
export function migrateLegacyKeys(keys: readonly string[], legacyTarget: ReadonlyMap<string, string>, plan: CheckpointPlan): { answered: string[]; bonus: string[] } {
  const required = new Set(plan.required), optional = new Set(plan.optional);
  const answered = new Set<string>(), bonus = new Set<string>();
  for (const key of keys) {
    const target = legacyTarget.get(key);
    const id = required.has(key) || optional.has(key) ? key : target ? plan.auto.get(target)?.id : undefined;
    if (id && required.has(id)) answered.add(id);
    else if (id && optional.has(id)) bonus.add(id);
  }
  return { answered: [...answered], bonus: [...bonus] };
}

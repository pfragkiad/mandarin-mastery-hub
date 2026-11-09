/**
 * Contextual Kangxi resolution for components inside a character's recorded breakdown.
 *
 * Purpose: some codepoints are written for two Kangxi families (right-side 阝 = 邑 #163,
 * left-side 阝 = 阜 #170; 月 under 肉; 日 under 曰; 夂 under 夊), and a few identities are
 * dual by source (斗 #68/#191, ⺫ #109/#122). Standalone, a glyph keeps its exact Unicode
 * identity. Inside a character ("owner"), the owner's declared Unihan radical decides when
 * it is one of the candidates; only reviewed shared forms with an exported, contradiction-
 * free position rule (阝) fall back to position. Otherwise nothing is narrowed or guessed.
 *
 * Inputs: the node glyph, its IDS position and the owner character whose declared radical
 * applies (the nearest enclosing real component, see childOwner). Source trees are never
 * mutated — only the badge, presentation and link target change.
 */
import { catalog } from './catalog-store';
import { radicalIdentity, type RadicalLink } from './radical-identities';
import type { DecompositionNode } from './character-library';

export type ContextualRadical = {
  radicals: RadicalLink[];
  /** The family form this shared glyph stands for, only when it differs from the glyph itself. */
  form?: { family: number; glyph: string };
  basis?: 'declared' | 'position';
};

const OPERATOR = /^[\u2FF0-\u2FFF\u31EF]$/u;
const declaredCache = { version: -1, map: new Map<string, number>(), canonical: new Map<number, string>() };

function declaredIndex() {
  if (declaredCache.version === catalog.version) return declaredCache;
  const numbers = new Map<string, number>();
  const canonical = new Map<number, string>();
  for (const [glyph = '', , , note = ''] of catalog.radicals) {
    const number = Number(note.match(/\bRadical #(\d+)\b/)?.[1]);
    if (Number.isInteger(number)) { numbers.set(glyph, number); canonical.set(number, glyph); }
  }
  const map = new Map<string, number>();
  // Characters carry Unihan's radical as "· X radical"; components use componentRadicals.
  for (const [glyph = '', , , note = ''] of catalog.characters) {
    const number = numbers.get(note.match(/·\s*(.+?) radical$/)?.[1] ?? '');
    if (number && !map.has(glyph)) map.set(glyph, number);
  }
  for (const [glyph, radical] of Object.entries(catalog.componentRadicals ?? {})) {
    const number = numbers.get(radical);
    if (number && !map.has(glyph)) map.set(glyph, number);
  }
  Object.assign(declaredCache, { version: catalog.version, map, canonical });
  return declaredCache;
}

/** The owner's declared (Unihan kRSUnicode) Kangxi number, or undefined when unrecorded. */
export function declaredRadical(owner?: string): number | undefined {
  return owner ? declaredIndex().map.get(owner) : undefined;
}

/** Children of an IDS operator belong to the same owner; children of a real component
 *  belong to that component, so its own declared radical applies inside it. */
export function childOwner(node: DecompositionNode, owner?: string): string | undefined {
  return OPERATOR.test(node.glyph) || node.position === 'root' ? owner : node.glyph;
}

export function contextualRadical(glyph: string, position: string, owner?: string): ContextualRadical {
  const identity = radicalIdentity(glyph);
  const shared = catalog.radicalIdentities.sharedForms?.[glyph];
  const candidates = shared ? shared.families.map(family => family.number) : identity.radicals.map(radical => radical.number);
  if (candidates.length < 2) return { radicals: identity.radicals };
  const declared = declaredRadical(owner);
  const byDeclared = declared !== undefined && candidates.includes(declared) ? declared : undefined;
  const byPosition = byDeclared === undefined && owner ? shared?.positions?.[position] : undefined;
  const pick = byDeclared ?? byPosition;
  if (pick === undefined) return { radicals: identity.radicals };
  const heading = shared?.families.find(family => family.number === pick)?.glyph ?? identity.radicals.find(radical => radical.number === pick)?.glyph ?? declaredIndex().canonical.get(pick) ?? '';
  const form = shared?.families.find(family => family.number === pick)?.form;
  return {
    radicals: [{ id: `kangxi-${pick}`, number: pick, glyph: heading }],
    ...(form && form !== glyph ? { form: { family: pick, glyph: form } } : {}),
    basis: byDeclared !== undefined ? 'declared' : 'position',
  };
}

/** Whether the owner's recorded breakdown uses this family's exact form, either written
 *  directly or as a shared glyph that resolves to that family in this owner's context. */
export function breakdownUsesForm(root: DecompositionNode, owner: string, family: number, form: string): boolean {
  const visit = (node: DecompositionNode, current: string | undefined): boolean => {
    if (node.glyph === form) {
      const resolved = contextualRadical(node.glyph, node.position, current);
      if (!resolved.form || resolved.form.family === family) return true;
    } else {
      const resolved = contextualRadical(node.glyph, node.position, current);
      if (resolved.form?.family === family && resolved.form.glyph === form) return true;
    }
    const next = childOwner(node, current);
    return Boolean(node.children?.some(child => visit(child, next)));
  };
  return visit(root, owner);
}

/** Verified stroke names for radicals cnchar-order has no standalone entry for
 * (宀, 冖, 冫, single-stroke 丨丶丿亅, traditional 見車馬…). Names are verified against
 * the 通用规范汉字表 standard stroke naming and confirmed by the project author — never
 * guessed. Shared by the radical-strokes import script and the live practice pages so
 * the stroke cards below a character match the radical's decomposition exactly. */
export const RADICAL_STROKE_SUPPLEMENTS: Record<string, string[]> = {
  '宀': ['点', '点', '横钩'],
};

export const RADICAL_STROKE_SUPPLEMENT_SOURCE = '通用规范汉字表 standard stroke naming';

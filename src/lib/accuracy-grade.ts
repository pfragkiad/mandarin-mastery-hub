// Grade bands for Practice accuracy percentages, used to colour the "NN%" in the
// status line under the drawing square: 90%+ green, 80%+ orange, 60%+ brown, below 60% red.
export type AccuracyGrade = 'high' | 'good' | 'fair' | 'low';

export function accuracyGrade(percent: number): AccuracyGrade {
  if (percent >= 90) return 'high';
  if (percent >= 80) return 'good';
  if (percent >= 60) return 'fair';
  return 'low';
}

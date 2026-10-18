export type MedianPoint = readonly [number, number];

/** Hanzi Writer's 300px square, 22px padding and recorded [-124, 900] y bounds. */
export function strokeDirectionPoints(median: readonly MedianPoint[]): MedianPoint[] {
  if (median.length < 2 || median.some(point => point.length !== 2 || !point.every(Number.isFinite))) return [];
  const points = median.map(([x, y]) => [22 + x * 0.25, 247 - y * 0.25] as const);
  return points.filter((point, index) => index === 0 || point[0] !== points[index - 1]?.[0] || point[1] !== points[index - 1]?.[1]);
}
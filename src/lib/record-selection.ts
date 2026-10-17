/** Explicit selections remain browsable even when unrelated filters exclude them. */
export function includeSelectedRecord<T extends { id: string }>(all: T[], filtered: T[], selectedId: string) {
  if (!selectedId || filtered.some(entry => entry.id === selectedId)) return filtered;
  const selected = all.find(entry => entry.id === selectedId);
  if (!selected) return filtered;
  const visible = new Set(filtered.map(entry => entry.id));
  return all.filter(entry => visible.has(entry.id) || entry.id === selectedId);
}
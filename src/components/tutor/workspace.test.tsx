import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { words, type Word } from '@/lib/mandarin';
import { WorkspaceProvider, useWorkspace } from './workspace';

vi.mock('@/lib/catalog-store', () => ({ loadCatalog: () => Promise.resolve(), catalog: { version: 1 } }));
afterEach(cleanup);

it('drops the disputed 了 recording when imported data changes without losing session words', async () => {
  const index = words.findIndex(word => word.id === '4acf54bb-a35e-41cf-8844-51c11d4af89f');
  const original = words[index];
  if (!original) throw new Error('Missing neutral-tone 了');
  const stale: Word = { ...original, audio: { url: '/disputed-le.mp3', source: 'Disputed recording', license: 'Test' } };
  let workspace: ReturnType<typeof useWorkspace> | undefined;
  function Probe() { workspace = useWorkspace(); return null; }
  words[index] = stale;
  try {
    const view = render(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    expect(workspace?.items.find(word => word.id === original.id)?.audio?.url).toBe('/disputed-le.mp3');
    const sessionWord = { ...original, id: 'session-word', hanzi: '测试' };
    await act(async () => { workspace?.addWord(sessionWord); });
    words[index] = original;
    view.rerender(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    expect(workspace?.items.find(word => word.id === original.id)?.pinyin).toBe('le');
    expect(workspace?.items.find(word => word.id === original.id)?.audio).toBeNull();
    expect(workspace?.items.find(word => word.id === sessionWord.id)).toEqual(sessionWord);
  } finally { words[index] = original; }
});
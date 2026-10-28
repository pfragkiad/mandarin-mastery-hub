import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrokesPage } from './writing-practice';
import { hydrateCatalog, type CatalogFile } from '@/lib/catalog-store';
import type { RadicalStrokeFile } from '@/lib/radical-strokes';
import * as catalogStore from '@/lib/catalog-store';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: React.ReactNode }) => <a>{children}</a>,
  useNavigate: () => () => {},
}));
// The writing card only needs a writer instance to exist; no stroke animation runs here.
const writer = vi.hoisted(() => ({
  create: vi.fn(),
  cancelQuiz: vi.fn(), quiz: vi.fn(), showCharacter: vi.fn(), hideCharacter: vi.fn(),
  showOutline: vi.fn(), hideOutline: vi.fn(), pauseAnimation: vi.fn(), setSpeed: vi.fn(),
}));
vi.mock('hanzi-writer', () => ({ default: { create: writer.create } }));
vi.mock('./workspace', () => ({
  useWorkspace: () => ({
    items: [], saved: [], toggleSaved: () => {},
    preferences: { includeTraditional: false, pinyin: true, slow: false },
    catalogVersion: 1, theme: 'light',
  }),
}));
vi.mock('./use-pronunciation-availability', () => ({ usePronunciationAvailability: (recording: boolean, reading: string | null) => recording || Boolean(reading) }));
vi.mock('@/lib/character-enrichment', async importOriginal => ({
  ...(await importOriginal<object>()),
  loadStrokeGeometry: async () => ({ data: { strokes: ['path one', 'path two'], medians: [[[0, 0], [400, 0]], [[0, 0], [0, 400]]] } }),
}));
// The SOURCE CHECK note is checksum-bound to a lazily loaded sidecar, so the page-level hook
// stands in for one already-validated record; the note itself renders for real.
const enrichment = vi.hoisted(() => ({
  bindings: { strokeCount: 2 },
  comparison: { status: 'exact-G-agreement', alternatives: [] },
  teachingCheck: null,
  mapping: { groups: [], unknownStrokeIndices: [] },
}));
vi.mock('./character-enrichment', async importOriginal => ({
  ...(await importOriginal<object>()),
  useCharacterEnrichment: () => enrichment,
}));

const catalogData: CatalogFile = {
  version: 1, source: 'test',
  characters: [['学', 'xué', 'learn', '8 strokes · 子 radical']],
  radicals: [], components: [], strokes: [],
  trees: { 学: { glyph: '学', position: 'top', children: [{ glyph: '子', position: 'bottom' }] } },
  readingAudio: {}, audio: {},
};

hydrateCatalog(catalogData);

// A one-form radical family so the page's radical-family section has something to render.
const familyFile: RadicalStrokeFile = {
  schemaVersion: 1, source: 'test family', records: {},
  families: [{
    id: 17, canonical: '冂', kangxiHeading: '冂', familyPinyin: 'jiōng',
    forms: [{ key: 'main', character: '冂', aliases: [], formKind: 'kangxi-heading', strokeCount: 2, record: { status: 'recorded', strokes: [] } }],
  }],
};

const practiceHeading = () => screen.getByRole('heading', { name: 'Get to know 学' });

const visibleHeadingGlyphs = () => Array.from(practiceHeading().querySelectorAll('span'))
  .filter(node => !node.classList.contains('sr-only'))
  .map(node => node.textContent);

describe('character practice sections by mode', () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  writer.create.mockReturnValue(writer);
  afterEach(cleanup);

  it('shows the breakdown and the source check while watching', () => {
    render(<StrokesPage initialCharacter="学" mode="watch"/>);
    expect(screen.getByText('Decomposition')).toBeInTheDocument();
    expect(screen.getByText('SOURCE CHECK')).toBeInTheDocument();
    expect(practiceHeading()).not.toHaveClass('sr-only');
    expect(visibleHeadingGlyphs()).toEqual(['学']);
    expect(document.querySelector('.practice-facts')).not.toHaveClass('practice-facts-hidden');
  });

  it('keeps the reading panel above the writing card and the breakdown below it', () => {
    render(<StrokesPage initialCharacter="学" mode="watch"/>);
    const blocks = Array.from(document.querySelectorAll('.practice-layout > *')).map(node => node.className);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toContain('practice-intro');
    expect(blocks[1]).toContain('writing-tool');
    expect(blocks[2]).toContain('practice-detail');
    expect(document.querySelector('.practice-detail')?.textContent).toContain('Decomposition');
    expect(document.querySelector('.practice-detail')?.textContent).toContain('SOURCE CHECK');
  });

  it('hides the breakdown and the source check in recall, keeping the reading and meaning', () => {
    render(<StrokesPage initialCharacter="学" mode="recall"/>);
    expect(screen.queryByText('Decomposition')).toBeNull();
    expect(screen.queryByText('SOURCE CHECK')).toBeNull();
    expect(practiceHeading()).toHaveClass('sr-only');
    expect(document.querySelector('.practice-facts')).toHaveClass('practice-facts-hidden');
    expect(screen.getByText('xué')).toBeInTheDocument();
    expect(screen.getByText('learn')).toBeInTheDocument();
  });

  it('shows the radical family while watching a radical form', () => {
    hydrateCatalog(catalogData, undefined, familyFile);
    render(<StrokesPage initialCharacter="冂" mode="watch"/>);
    expect(screen.getByRole('group', { name: 'Forms of Kangxi radical 17' })).toBeInTheDocument();
  });

  it('hides the radical family and the whole detail card in recall', () => {
    hydrateCatalog(catalogData, undefined, familyFile);
    render(<StrokesPage initialCharacter="冂" mode="recall"/>);
    expect(screen.queryByRole('group', { name: 'Forms of Kangxi radical 17' })).toBeNull();
    expect(document.querySelector('.practice-detail')?.children).toHaveLength(0);
  });

  it('uses family 5 reading yǐ and the 乙 audio target when practising its unrecorded 乚 variant', () => {
    hydrateCatalog({ ...catalogData, radicals: [['乙', 'yǐ', 'second; 2nd heavenly stem', '1 stroke · Radical #5']] }, undefined, {
      ...familyFile,
      families: [{ id: 5, canonical: '乙', kangxiHeading: '乙', familyPinyin: 'yǐ', forms: [
        { key: '5-0', character: '乙', aliases: [], formKind: 'kangxi-heading', strokeCount: 1, record: { status: 'recorded', strokes: [] } },
        { key: '5-1', character: '乚', aliases: [], formKind: 'variant', strokeCount: 1, record: { status: 'recorded', strokes: [] } },
      ] }],
    });
    const play = vi.spyOn(catalogStore, 'playCharacter').mockResolvedValue(null);
    render(<StrokesPage initialCharacter="乚" family={5} variant="5-1" mode="watch"/>);
    expect(document.querySelector('.practice-intro .pinyin')?.textContent).toBe('yǐ');
    fireEvent.click(screen.getByRole('button', { name: 'Listen to 乚', exact: true }));
    expect(play).toHaveBeenCalledWith('乙', false, 'yǐ');
    play.mockRestore();
  });
});

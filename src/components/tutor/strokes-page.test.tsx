import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrokesPage } from './writing-practice';
import { hydrateCatalog, type CatalogFile } from '@/lib/catalog-store';
import type { RadicalStrokeFile } from '@/lib/radical-strokes';
import * as catalogStore from '@/lib/catalog-store';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: React.ReactNode }) => <a>{children}</a>,
  useNavigate: () => () => {},
  useRouter: () => ({ history: { back: () => {} } }),
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
// The enrichment record is checksum-bound to a lazily loaded sidecar, so the page-level hook
// stands in for one already-validated record; the decomposition renders for real.
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
  characters: [['学', 'xué', 'learn', '8 strokes · 子 radical'], ['乙', 'yǐ', 'second; 2nd heavenly stem', '1 stroke · 乙 radical']],
  radicals: [['乙', 'yǐ', 'second; 2nd heavenly stem', '1 stroke · Radical #5']],
  components: [], strokes: [],
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
  }, {
    id: 5, canonical: '乙', kangxiHeading: '乙', familyPinyin: 'yǐ',
    forms: [{ key: 'main', character: '乙', aliases: [], formKind: 'kangxi-heading', strokeCount: 1, record: { status: 'recorded', strokes: [] } }],
  }],
};

const practiceHeading = () => screen.getByRole('heading', { name: 'Write 学' });
const titleGlyph = () => practiceHeading().querySelector('.practice-title-glyph');

const visibleHeadingGlyphs = () => Array.from(practiceHeading().querySelectorAll('span'))
  .filter(node => !node.classList.contains('sr-only'))
  .map(node => node.textContent);

describe('character practice sections by mode', () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  writer.create.mockReturnValue(writer);
  afterEach(cleanup);

  it('shows the breakdown while watching', () => {
    render(<StrokesPage initialCharacter="学" mode="watch"/>);
    expect(screen.getByText('DECOMPOSITION')).toBeInTheDocument();
    expect(screen.getByText('Hanzi graphical structure')).toBeInTheDocument();
    expect(titleGlyph()).not.toHaveClass('sr-only');
    expect(visibleHeadingGlyphs()).toEqual(['学']);
    // The character practice reading panel has no strokes/radical/script facts row.
    expect(document.querySelector('.practice-facts')).toBeNull();
  });

  it('puts the title card above the writing card and the breakdown beside it', () => {
    render(<StrokesPage initialCharacter="学" mode="watch"/>);
    const page = document.querySelector('.practice-page-content')!;
    expect(page.firstElementChild).toHaveClass('practice-header');
    const blocks = Array.from(document.querySelectorAll('.practice-layout > *')).map(node => node.className);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain('writing-tool');
    expect(blocks[1]).toContain('practice-detail');
    expect(document.querySelector('.practice-detail')?.textContent).toContain('DECOMPOSITION');
  });

  it('shows no form tiles for a simplified-only character', () => {
    render(<StrokesPage initialCharacter="学" mode="watch"/>);
    expect(document.querySelector('.practice-header-forms')).toBeNull();
  });

  it('hides the breakdown in recall, keeping the reading and meaning', () => {
    render(<StrokesPage initialCharacter="学" mode="recall"/>);
    expect(screen.queryByText('DECOMPOSITION')).toBeNull();
    expect(screen.queryByText('Hanzi graphical structure')).toBeNull();
    // Recall keeps "Write" but the glyph is only read aloud by screen readers.
    expect(titleGlyph()).toHaveClass('sr-only');
    expect(document.querySelector('.practice-facts')).toBeNull();
    expect(screen.getByText('xué')).toBeInTheDocument();
    expect(screen.getByText('learn')).toBeInTheDocument();
  });

  it('creates the writer with character and outline hidden on direct Recall entry', async () => {
    writer.create.mockClear();
    render(<StrokesPage initialCharacter="学" mode="recall"/>);
    await waitFor(() => expect(writer.create).toHaveBeenCalled());
    expect(writer.create.mock.calls[0]?.[2]).toMatchObject({ showCharacter: false, showOutline: false });
  });

  it('shows the radical family and no stroke decomposition while watching a radical form', () => {
    hydrateCatalog(catalogData, undefined, familyFile);
    render(<StrokesPage initialCharacter="冂" mode="watch"/>);
    expect(screen.getByRole('group', { name: 'Forms of Kangxi radical 17' })).toBeInTheDocument();
    const detail = document.querySelector('.practice-detail')?.textContent ?? '';
    // The family tiles sit in the reading panel without a 'Radical family' label.
    expect(detail).not.toContain('RADICAL FAMILY');
    // The writing card already lists every stroke, so the redundant stroke sequence is gone.
    expect(detail).not.toContain('STROKE DECOMPOSITION');
  });

  it('labels radical practice with the Radical pill instead of Character', () => {
    hydrateCatalog(catalogData, undefined, familyFile);
    render(<StrokesPage initialCharacter="乙" mode="watch"/>);
    expect(document.querySelector('.practice-pills .word-hsk-id:not(.traditional-pill)')?.textContent).toBe('Radical #5');
  });

  it('offers a Back action that returns to the card selection', () => {
    hydrateCatalog(catalogData, undefined, familyFile);
    render(<StrokesPage initialCharacter="学" mode="watch"/>);
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('shows the heading with the hanzi only, without the Kangxi suffix', () => {
    hydrateCatalog(catalogData, undefined, familyFile);
    render(<StrokesPage initialCharacter="乙" mode="watch"/>);
    expect(screen.getByRole('heading', { name: 'Write 乙' })).toBeInTheDocument();
  });

  it('keeps the radical form tiles in recall with their hanzi blanked, and no detail card', () => {
    hydrateCatalog(catalogData, undefined, familyFile);
    render(<StrokesPage initialCharacter="冂" mode="recall"/>);
    const group = screen.getByRole('group', { name: 'Forms of Kangxi radical 17' });
    expect(group.querySelectorAll('strong.form-switch-blank').length).toBeGreaterThan(0);
    expect(group.textContent).not.toContain('冂');
    expect(document.querySelector('.practice-detail')?.children).toHaveLength(0);
  });

  it("word practice shows a character strip with each character's own reading, blanked in recall", () => {
    const { unmount } = render(<StrokesPage initialCharacter="学乙" mode="trace"/>);
    const strip = screen.getByRole('group', { name: 'Characters in this word' });
    expect(strip.closest('.writing-tool')).not.toBeNull();
    expect(Array.from(strip.querySelectorAll('.word-strip-pinyin')).map(node => node.textContent)).toEqual(['xué', 'yǐ']);
    // The focused 学 tile waits for its writer with an empty picture (no glyph flash); 乙 shows its hanzi.
    expect(strip.textContent).toContain('乙');
    // Every tile carries the same top-left count: the stroke you are on.
    expect(Array.from(strip.querySelectorAll('.tile-count-corner')).map(node => node.textContent)).toEqual(['1 / 8', '1 / 1']);
    // Words have no traditional records yet, so no form tiles.
    expect(document.querySelector('.practice-header-forms')).toBeNull();
    unmount();
    render(<StrokesPage initialCharacter="学乙" mode="recall"/>);
    const recallStrip = screen.getByRole('group', { name: 'Characters in this word' });
    expect(recallStrip.textContent).not.toContain('学');
    expect(recallStrip.textContent).not.toContain('乙');
    // Each blank tile carries its own recorded stroke count in its corner.
    expect(Array.from(recallStrip.querySelectorAll('.tile-count-corner')).map(node => node.textContent)).toEqual(['1 / 8', '1 / 1']);
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
    expect(document.querySelector('.practice-header .pinyin')?.textContent).toBe('yǐ');
    fireEvent.click(screen.getByRole('button', { name: /^Listen to 乚$/ }));
    expect(play).toHaveBeenCalledWith('乙', false, 'yǐ');
    play.mockRestore();
  });
});

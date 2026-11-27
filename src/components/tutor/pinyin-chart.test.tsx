// The Sound card's "Sounds alike — compare" pills: every case carries its own speaker that
// plays that exact syllable+tone recording in place, and the spelling still opens the other
// sound. Inputs: a small hand-built syllable set (ba + its real sound-alike pa) so the test
// never depends on the shipped inventory. Tricky part: the speaker is play-only (a second
// click must not stop the running clip) and appears only while a tone is chosen, because the
// bare syllable shown with no tone matches no single recording.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { playRecordingUrl, stopRecording } from '@/lib/audio';
import { findSyllable, type PinyinData, type Tone } from '@/lib/pinyin-guide';
import { usePinyinPlayer } from './pinyin-shared';
import { PinyinPlayerPanel } from './pinyin-chart';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));
vi.mock('./workspace', () => ({
  useWorkspace: () => ({
    items: [], saved: [], toggleSaved: () => {},
    preferences: { includeTraditional: false, pinyin: true, slow: false },
    catalogVersion: 0, theme: 'light',
  }),
}));
vi.mock('@/lib/audio', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/audio')>()),
  playRecordingUrl: vi.fn(async () => true),
  stopRecording: vi.fn(),
}));

// `pa` is ba's only sound-alike here (b/p are confusable initials, same final), so the
// pills are predictable; every clip is a distinct URL the assertions can name.
const data: PinyinData = {
  syllables: [
    { base: 'ba', initial: 'b', final: 'a', tones: [1, 2, 3, 4], note: null },
    { base: 'pa', initial: 'p', final: 'a', tones: [1, 2, 3, 4], note: null },
  ],
  recordings: {
    ba1: { url: 'https://cdn/ba1.mp3', ms: 400 },
    ba2: { url: 'https://cdn/ba2.mp3', ms: 400 },
    pa1: { url: 'https://cdn/pa1.mp3', ms: 400 },
    pa2: { url: 'https://cdn/pa2.mp3', ms: 400 },
  },
  inventorySource: { name: 'test inventory', url: 'https://example.invalid', license: 'test' },
  audioSource: { name: 'test audio', url: 'https://example.invalid', license: 'test' },
};

function Harness({ tone, onSelect }: { tone: Tone | null; onSelect: (base: string, label: string, current: Tone | null) => void }) {
  const player = usePinyinPlayer(data, false);
  return <PinyinPlayerPanel data={data} player={player} syllable={findSyllable(data, 'ba')!} tone={tone}
    slow={false} onSlow={() => {}} onTone={() => {}} onPlayAll={() => {}} onSelect={onSelect} onLeave={() => {}} />;
}

afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); });

describe('Sound card sound-alike pills', () => {
  it('gives every case a speaker that plays its own recording without navigating', () => {
    const onSelect = vi.fn();
    render(<Harness tone={1} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Listen to pā' }));
    expect(playRecordingUrl).toHaveBeenCalledTimes(1);
    expect(playRecordingUrl).toHaveBeenCalledWith('https://cdn/pa1.mp3', false, expect.any(Function));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('keeps the spelling itself as the link that opens that sound', () => {
    const onSelect = vi.fn();
    render(<Harness tone={1} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'pā' }));
    expect(onSelect).toHaveBeenCalledWith('pa', 'bā', 1);
    expect(playRecordingUrl).not.toHaveBeenCalled();
  });

  it('never stops the clip that is already playing', () => {
    render(<Harness tone={1} onSelect={vi.fn()} />);
    const speaker = screen.getByRole('button', { name: 'Listen to pā' });
    fireEvent.click(speaker);
    fireEvent.click(speaker);
    expect(playRecordingUrl).toHaveBeenCalledTimes(1);
    expect(stopRecording).not.toHaveBeenCalled();
  });

  it('offers no speaker while no tone is chosen, because the bare syllable matches no clip', () => {
    render(<Harness tone={null} onSelect={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /^Listen to/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'pa' })).toBeTruthy();
  });
});

// ============= Test file =============
// The recorded editorial note on an example sentence must never be a fourth text line in
// the card: it stays verbatim but collapses behind the shared (i) trigger in the card's
// header row, exactly like the sentence-source marker and the spelling-note evidence.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { SentenceExample } from './sentence-example';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));
vi.mock('./workspace', () => ({
  useWorkspace: () => ({
    items: [], saved: [], toggleSaved: () => {},
    preferences: { includeTraditional: true, pinyin: true, slow: false },
    catalogVersion: 0, theme: 'light',
  }),
}));

afterEach(cleanup);

// Taken verbatim from the HSK 6 handoff's conversational example note.
const NOTE = 'Individually written sense-specific sentence, not a generic POS template; pinyin is mechanically assisted and requires review.';

function renderSentence(props: { sentence: string; pinyin?: string; translation?: string; note?: string | null }) {
  return render(<SentenceExample heading="Conversational" onNavigate={() => {}} {...props}/>).container;
}

describe('Recorded sentence notes collapse behind the card (i)', () => {
  it('keeps the note out of the card body and offers it behind one (i) in the header row', () => {
    const container = renderSentence({
      sentence: '别逼他马上回答。', pinyin: 'Bié bī tā mǎ shàng huí dá.',
      translation: "Don't force him to answer immediately.", note: NOTE,
    });
    expect(container.querySelector('.sentence-note')).toBeNull();
    expect(container.textContent).not.toContain(NOTE);
    const triggers = container.querySelectorAll('.source-info-trigger');
    expect(triggers).toHaveLength(1);
    expect(triggers[0]!.closest('.sentence-card-header')).not.toBeNull();
    expect(triggers[0]).toHaveAttribute('aria-label', 'About this sentence');
  });

  it('reveals the recorded note word-for-word when the (i) is opened', () => {
    const container = renderSentence({
      sentence: '别逼他马上回答。', pinyin: 'Bié bī tā mǎ shàng huí dá.',
      translation: "Don't force him to answer immediately.", note: NOTE,
    });
    fireEvent.click(container.querySelector('.source-info-trigger') as HTMLElement);
    expect(screen.getByText(NOTE)).toBeVisible();
  });

  it('adds no (i) when the record has no note', () => {
    const container = renderSentence({
      sentence: '我们在岸上等你。', pinyin: 'Wǒmen zài àn shàng děng nǐ.',
      translation: "We'll wait for you on the shore.",
    });
    expect(container.querySelector('.source-info-trigger')).toBeNull();
    expect(container.querySelector('.sentence-note')).toBeNull();
  });
});

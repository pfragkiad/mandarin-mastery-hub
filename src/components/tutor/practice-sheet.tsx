import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { buildPracticePages, type PracticeBlock, type PracticeToken } from '@/lib/practice-layout';

type StrokeModel = { strokes: string[] } | null;

// Stroke outlines come from the same Hanzi Writer data the on-screen writer uses.
function useStrokeModels(tokens: PracticeToken[]) {
  const key = [...new Set(tokens.map(t => t.text))].join('');
  const [state, setState] = useState<{ key: string; assets: Record<string, StrokeModel>; loading: boolean }>({ key: '', assets: {}, loading: true });
  useEffect(() => {
    let active = true;
    const assets: Record<string, StrokeModel> = {};
    const glyphs = Array.from(key);
    setState({ key, assets: {}, loading: true });
    void Promise.all(glyphs.map(async glyph => {
      try {
        const res = await fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/${encodeURIComponent(glyph)}.json`);
        if (!res.ok) throw new Error('no data');
        const data = (await res.json()) as { strokes?: unknown };
        assets[glyph] = Array.isArray(data.strokes) && data.strokes.every(s => typeof s === 'string') ? { strokes: data.strokes as string[] } : null;
      } catch { assets[glyph] = null; }
    })).then(() => { if (active) setState({ key, assets, loading: false }); });
    return () => { active = false; };
  }, [key]);
  return { assets: state.key === key ? state.assets : {}, loading: state.key !== key || state.loading };
}

function WritingCell({ token, kind, diagonal, assets }: { token?: PracticeToken | undefined; kind: 'model' | 'trace' | 'blank'; diagonal: boolean; assets: Record<string, StrokeModel> }) {
  const model = token ? assets[token.text] : null;
  const glyph = kind === 'blank' ? '' : (token?.text ?? '');
  return (
    <svg className={`writing-cell ${kind}`} viewBox="0 0 100 100" role="img" aria-label={kind === 'blank' ? 'Blank writing box' : `${kind === 'trace' ? 'Trace' : 'Model'} ${glyph}`}>
      <rect x=".6" y=".6" width="98.8" height="98.8" fill="none" stroke="currentColor" strokeWidth="1.2" className="cell-frame" />
      <path d="M50 1 V99 M1 50 H99" fill="none" stroke="currentColor" strokeWidth=".8" strokeDasharray="3 3" className="cell-cross" />
      {diagonal && <path d="M1 1 L99 99 M99 1 L1 99" fill="none" stroke="currentColor" strokeWidth=".65" strokeDasharray="3 3" className="cell-diagonal" />}
      {glyph && (model ? (
        <g className="writing-glyph" transform="translate(5,84.1015625) scale(.087890625,-.087890625)">
          {model.strokes.map((path, i) => <path d={path} key={i} />)}
        </g>
      ) : (
        <text className="writing-glyph writing-font-fallback" x="50" y="52" dy=".33em" textAnchor="middle" fontSize="78" lang="zh-CN">{glyph}</text>
      ))}
    </svg>
  );
}

function PracticeRows({ block, diagonal, pinyin, assets }: { block: PracticeBlock; diagonal: boolean; pinyin: boolean; assets: Record<string, StrokeModel> }) {
  if (block.kind === 'character')
    return (
      <div className="character-practice-block">
        <div className="practice-row-label">
          <span lang="zh-CN" className="practice-row-glyph">{block.token.text}</span>
          {pinyin && block.token.pinyin && <span className="pinyin">{block.token.pinyin}</span>}
        </div>
        <div>
          {Array.from({ length: block.rows }, (_, r) => {
            // Graduated difficulty: model first, then tracing, then copying, last rows from memory.
            const traceCells = r === 0 ? 2 : r < Math.ceil(block.rows / 2) ? 2 : 0;
            return (
              <div className="writing-row" key={r}>
                {Array.from({ length: 8 }, (_, i) => (
                  <WritingCell key={i} token={block.token} kind={r === 0 && i === 0 ? 'model' : i < (r === 0 ? 3 : traceCells) ? 'trace' : 'blank'} diagonal={diagonal} assets={assets} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  return (
    <div className="whole-text-block">
      <h3>Write the whole text{block.segments > 1 ? ` — part ${block.segment} of ${block.segments}` : ''}</h3>
      <p className="whole-text-reference">
        {block.tokens.map((t, i) => <span key={i} className="whole-text-token"><span lang="zh-CN">{t.text}</span>{pinyin && t.pinyin && <span className="pinyin">{t.pinyin}</span>}</span>)}
      </p>
      <p className="practice-instruction">Trace once, then copy into the blank rows. Try the last row from memory.</p>
      {Array.from({ length: 3 }, (_, r) => (
        <div className="writing-row whole-text-row" key={r}>
          {Array.from({ length: 8 }, (_, i) => (
            <WritingCell key={i} token={block.tokens[i]} kind={r === 0 && block.tokens[i] ? 'trace' : 'blank'} diagonal={diagonal} assets={assets} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Printable A4 handwriting sheet for a character, word or phrase. Rendered as an overlay; printing hides the app. */
export function PracticeSheet({ text, pinyin, meaning, onClose }: { text: string; pinyin?: string | undefined; meaning?: string | undefined; onClose: () => void }) {
  const readings = pinyin?.trim().split(/\s+/) ?? [];
  const tokens = useMemo<PracticeToken[]>(() => {
    const glyphs = Array.from(text).filter(ch => /[㐀-鿿豈-﫿]/.test(ch));
    return glyphs.map((ch, i) => ({ text: ch, pinyin: readings.length === glyphs.length ? readings[i] : undefined }));
  }, [text, pinyin]); // eslint-disable-line react-hooks/exhaustive-deps
  const [rows, setRows] = useState<1 | 2>(1);
  const [diagonal, setDiagonal] = useState(true);
  const [showPinyin, setShowPinyin] = useState(true);
  const [showMeaning, setShowMeaning] = useState(true);
  const [printing, setPrinting] = useState(false);
  const models = useStrokeModels(tokens);
  const pages = useMemo(() => buildPracticePages(tokens, rows), [tokens, rows]);
  const singleCharacter = new Set(tokens.map(t => t.text)).size === 1;
  useEffect(() => {
    document.body.classList.add('practice-printing');
    const previous = document.title;
    document.title = 'Mandarin handwriting practice';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('practice-printing');
      document.title = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  const print = async () => {
    setPrinting(true);
    try {
      await document.fonts.ready;
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      window.print();
    } finally { setPrinting(false); }
  };
  const fallback = Object.values(models.assets).some(asset => asset === null);
  return createPortal(
    <div className="practice-sheet-root" role="dialog" aria-modal="true" aria-label="Printable handwriting practice sheet">
      <div className="practice-preview-controls no-print">
        <div className="practice-controls-top">
          <div>
            <span className="practice-preview-eyebrow"><FileText size={14} />WRITING PRACTICE</span>
            <h1>Handwriting practice sheet</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close practice sheet" title="Close practice sheet"><X /></Button>
        </div>
        <div className="practice-options">
          {!singleCharacter && (
            <label>
              Rows per character
              <select value={rows} onChange={e => setRows(Number(e.target.value) as 1 | 2)}>
                <option value="1">1 row</option>
                <option value="2">2 rows</option>
              </select>
            </label>
          )}
          <label>
            Writing guides
            <select value={diagonal ? 'diagonal' : 'cross'} onChange={e => setDiagonal(e.target.value === 'diagonal')}>
              <option value="diagonal">米字格 · cross + diagonals</option>
              <option value="cross">田字格 · cross</option>
            </select>
          </label>
          <div className="toggle">
            <Switch id="sheet-pinyin" checked={showPinyin} onCheckedChange={setShowPinyin} />
            <label htmlFor="sheet-pinyin">Include pinyin</label>
          </div>
          <div className="toggle">
            <Switch id="sheet-meaning" checked={showMeaning} onCheckedChange={setShowMeaning} />
            <label htmlFor="sheet-meaning">Include meaning</label>
          </div>
          <Button className="practice-preview-print" onClick={() => void print()} disabled={models.loading || printing}>
            <Printer />{models.loading ? 'Preparing models…' : printing ? 'Opening print dialog…' : 'Print practice sheet'}
          </Button>
        </div>
        <div className="practice-preview-meta"><span><FileText size={14} />{pages.length} A4 {pages.length === 1 ? 'page' : 'pages'}</span><p>Print at 100% · No headers or footers · PDF available</p></div>
        {fallback && <p className="muted text-sm">Some stroke outlines are unavailable; those models use your reading font instead.</p>}
      </div>
      <div className="practice-pages" aria-label="Practice sheet preview" aria-busy={models.loading}>
        {pages.map((page, i) => (
          <article className="practice-page" key={i}>
            <header className="practice-paper-header">
              <div className="practice-paper-heading">
                <h2>Mandarin handwriting practice</h2>
                <span>Page {i + 1} / {pages.length}</span>
              </div>
              <div className="practice-name-date">
                <span>Name: ____________________</span>
                <span>Date: ______________</span>
              </div>
              <div className="practice-reference">
                <span lang="zh-CN">{text}</span>
                {showPinyin && pinyin && <span className="pinyin">{pinyin}</span>}
              </div>
              {showMeaning && meaning && <p className="practice-translation">{meaning}</p>}
              <p className="practice-instruction">{singleCharacter ? 'Read the model. Trace the light characters, copy them, then write the last rows from memory.' : 'Read the model. Trace the light characters. Write in the empty squares.'}</p>
            </header>
            <div className="practice-blocks">
              {page.blocks.map((block, j) => <PracticeRows key={j} block={block} diagonal={diagonal} pinyin={showPinyin} assets={models.assets} />)}
            </div>
            <footer className="practice-paper-footer">
              <p>Stroke outlines: Hanzi Writer Data / Make Me a Hanzi — Arphic Public License.</p>
            </footer>
          </article>
        ))}
      </div>
    </div>,
    document.body,
  );
}

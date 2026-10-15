import { Link } from '@tanstack/react-router';
import { PenLine } from 'lucide-react';
import { referenceCatalog, type ReferenceKind } from './references';

const groupHanzi = (kind: ReferenceKind) => referenceCatalog.find(group => group.kind === kind)?.entries ?? [];

const basicStrokes: Array<[string, string, string]> = [
  ['丶', 'diǎn', 'Dot'],
  ['一', 'héng', 'Horizontal'],
  ['丨', 'shù', 'Vertical'],
  ['丿', 'piě', 'Left-falling'],
  ['㇏', 'nà', 'Right-falling'],
  ['㇀', 'tí', 'Rising'],
];

function CharacterGroup({ kind, compact }: { kind: ReferenceKind; compact?: boolean }) {
  const entries = groupHanzi(kind);
  if (!entries.length) return null;
  return (
    <div className="picker-group">
      <span className="picker-label">{kind === 'Character' ? 'Characters' : `${kind}s`} · {entries.length}</span>
      <div className={`character-picker${compact ? ' compact' : ''}`} role="group" aria-label={kind}>
        {entries.map(([hanzi, pinyin, meaning]) => (
          <Link
            key={hanzi}
            to="/strokes"
            search={{ character: hanzi }}
            lang="zh-CN"
            className="character-tile"
            aria-label={`Practice ${hanzi}`}
            title={meaning ? `${pinyin} · ${meaning}` : pinyin}
          >
            {hanzi}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CharactersPage() {
  return (
    <div className="page-enter">
      <div className="page-heading">
        <div>
          <div className="eyebrow">汉字 · THE CHARACTERS</div>
          <h1>Get to know the characters.</h1>
          <p>Every character, radical and component in one place. Pick one to practise writing it.</p>
        </div>
        <span className="heading-hanzi">汉字<span>hàn zì</span></span>
      </div>

      <section className="characters-library">
        <CharacterGroup kind="Character" />
        <CharacterGroup kind="Radical" compact />
        <CharacterGroup kind="Component" compact />
      </section>

      <section className="stroke-reference">
        <div className="section-heading">
          <div>
            <div className="eyebrow">THE BUILDING BLOCKS</div>
            <h2>Meet the basic strokes</h2>
          </div>
          <span className="text-xs text-muted-foreground">{basicStrokes.length} basic forms</span>
        </div>
        <div className="stroke-grid">
          {basicStrokes.map(([shape, pinyin, name]) => (
            <article key={name} className="stroke-tile">
              <strong lang="zh-CN">{shape}</strong>
              <span>{pinyin}</span>
              <small>{name}</small>
            </article>
          ))}
        </div>
        <p className="library-note"><PenLine size={12} /> Tap any character above to open it in the writing practice.</p>
      </section>
    </div>
  );
}

/** Exact lesson passages used only when a character has no vocabulary example.
 * The generated sidecar loads on demand; it never supplies lexical readings or
 * meanings, and source paragraphs/pinyin/translations are kept together.
 */
export type CharacterHskExample = {
  character: string; sentence: string; pinyin: string; translation: string;
  source: { file: string; sha256: string; jsonPointer: string; lessonId: string; title: string; collection: string; hskLevel: number | null; status: string };
};
type ExampleFile = { version: number; examples: Record<string, CharacterHskExample> };
let pending: Promise<ExampleFile | null> | undefined;

export async function loadCharacterHskExample(recordId: string): Promise<CharacterHskExample | null> {
  if (!recordId.startsWith('Characters:')) return null;
  if (!pending) pending = fetch('/data/character-hsk-examples.json').then(async response => {
    if (!response.ok) throw new Error('HSK examples unavailable');
    const data = await response.json() as ExampleFile;
    if (data.version !== 1 || !data.examples || typeof data.examples !== 'object') throw new Error('Unsupported HSK examples');
    return data;
  }).catch(() => { pending = undefined; return null; });
  const data = await pending;
  const example = data?.examples[recordId];
  // An exact record and occurrence are both required; script variants are never substituted.
  if (!example || typeof example.character !== 'string' || Array.from(example.character).length !== 1
    || recordId !== `Characters:${example.character}` || typeof example.sentence !== 'string' || !example.sentence.includes(example.character)
    || typeof example.pinyin !== 'string' || !example.pinyin || typeof example.translation !== 'string' || !example.translation
    || !example.source?.lessonId || !example.source.collection) return null;
  return example;
}

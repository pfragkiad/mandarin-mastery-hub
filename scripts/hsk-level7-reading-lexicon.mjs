#!/usr/bin/env node
/** Offline bridge to the app's exact recorded-reading splitter. --lexicon emits
 * syllables without inventing readings; stdin validation checks draft sentences.
 * Positional alignment alone never certifies contextual pronunciation. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const root = fileURLToPath(new URL('../', import.meta.url));
const inventory = new Set(JSON.parse(readFileSync(resolve(root, 'src/data/pinyin/inventory.json'), 'utf8')).syllables.map(s => s.base));
const { alignPhrasePinyin } = await createJiti(import.meta.url, { fsCache: false }).import(resolve(root, 'src/lib/phrase-pinyin-align.ts'));
const normalized = p => p.replaceAll('-', ' ').replaceAll('’', "'").replace(/(\p{L})\s+r(?=[\s\p{P}]|$)/gu, '$1r');
function align(hanzi, pinyin) {
  const pairing = alignPhrasePinyin(hanzi, normalized(pinyin), inventory);
  return pairing ? pairing.tokens.flatMap(t => t.pieces.filter(p => p.pair !== null).map(p => p.text)) : null;
}
if (process.argv.includes('--lexicon')) {
  const rows = JSON.parse(readFileSync(resolve(root, 'importer/data/hsk-level7/official-vocabulary.json'), 'utf8'));
  process.stdout.write(JSON.stringify(rows.map(r => ({ ...r, syllables: align(r.hanzi, r.pinyin) }))));
} else {
  const rows = JSON.parse(readFileSync(0, 'utf8'));
  process.stdout.write(JSON.stringify(rows.map(r => ({ id: r.id, syllables: align(r.hanzi, r.pinyin) }))));
}

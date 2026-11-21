#!/usr/bin/env python3
"""Neutral-tone sounds for the Sound chart, taken from exact single-character word recordings.

The Sound chart's syllable set (audio-cmn) has no neutral-tone clips: that source withdrew
them. A neutral tone can still be heard when a single-character vocabulary word is recorded
in exactly that neutral reading (吧 ba, 吗 ma …). This script lists those recordings, and
only those, in src/data/pinyin/neutral-audio.json, which loadPinyinData() merges as the
neutral tone's sound. Any further source with exact neutral-tone recordings can be added the
same way: through an exact recording attached to a record, never a guessed or borrowed tone.

Rules (fail closed):
  * the word is one character, its recorded pinyin has no tone mark and is one syllable
    that the inventory attests with the neutral tone;
  * the word already carries a CDN recording attachment (src/data/vocabulary.json);
  * for Shtooka (cmn-caen-tan) recordings, the preserved source index must list that exact
    word with that exact toneless reading, so a clip recorded in another tone never counts;
  * several words with one syllable: the lowest HSK index speaks it, the others are kept as
    `alsoRecordedIn` (none is merged or dropped silently);
  * the duration is measured from the CDN bytes, which must be the attachment's file.

Usage: python3 scripts/import-neutral-pinyin-audio.py --write [--base http://localhost:8080]
       python3 scripts/import-neutral-pinyin-audio.py --check
"""
import sys as _sys
from pathlib import Path as _Path
_sys.path.insert(0, str(_Path(__file__).resolve().parent))
_sys.dont_write_bytecode = True
import vocabulary_store  # noqa: E402  (split-by-level vocabulary)
import argparse, bz2, json, subprocess, sys, tempfile, unicodedata, urllib.request
import xml.etree.ElementTree as ET

OUT = 'src/data/pinyin/neutral-audio.json'
MARKS = set('\u0304\u0301\u030c\u0300')
nfc = lambda s: unicodedata.normalize('NFC', s)

def shtooka_readings():
    root = ET.parse(bz2.open('importer/data/hsk-audio/cmn-caen-tan-index.xml.bz2')).getroot()
    out = {}
    for f in root.find('group').findall('file'):
        tag = f.find('tag')
        if tag is not None and tag.get('swac_text'):
            out.setdefault(nfc(tag.get('swac_text')), set()).add(nfc(tag.get('swac_pron_phon') or ''))
    return out

def candidates():
    inventory = {nfc(s['base']): s['tones'] for s in json.load(open('src/data/pinyin/inventory.json', encoding='utf-8'))['syllables']}
    entries = vocabulary_store.read_vocabulary()['entries']
    shtooka = shtooka_readings()
    found = {}
    for e in sorted(entries, key=lambda e: (e.get('hsk_index') is None, e.get('hsk_index') or 0)):
        word, reading, audio = nfc(e['simplified']), nfc(e['pinyinDisplay'].strip()), e.get('audio')
        if len(word) != 1 or not audio or not audio.get('url'): continue
        if any(c in MARKS for c in unicodedata.normalize('NFD', reading)): continue
        base = reading.lower()
        if 5 not in inventory.get(base, []): continue
        if 'Shtooka' in audio.get('source', '') and reading not in shtooka.get(word, set()):
            print(f'skip {word} {reading}: not recorded in that reading by the source', file=sys.stderr); continue
        item = {'word': word, 'reading': reading, 'entryId': e['id'], 'hskIndex': e.get('hsk_index'), 'url': audio['url'],
                'source': audio['source'], 'license': audio['license'], 'recordingKind': audio.get('recordingKind') or 'word'}
        key = f'{base}5'
        if key in found: found[key].setdefault('alsoRecordedIn', []).append(word)
        else: found[key] = item
    return found

def duration(base, url):
    with tempfile.NamedTemporaryFile(suffix='.mp3') as tmp:
        subprocess.check_call(['curl', '-sSf', '-o', tmp.name, base + url])
        return round(float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', tmp.name]).decode()) * 1000)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--write', action='store_true'); ap.add_argument('--check', action='store_true'); ap.add_argument('--base', default='http://localhost:8080')
    args = ap.parse_args()
    found = candidates()
    if args.check:
        current = json.load(open(OUT, encoding='utf-8'))['recordings']
        strip = lambda d: {k: {f: v for f, v in r.items() if f != 'ms'} for k, r in d.items()}
        if strip(current) != strip(found): sys.exit('neutral-audio.json is out of date: run --write')
        print(f'{len(current)} neutral-tone recordings up to date'); return
    for item in found.values(): item['ms'] = duration(args.base, item['url'])
    doc = {'source': {'policy': 'Neutral-tone sounds come only from exact single-character word recordings in that toneless reading; no tone or voice is substituted.',
                      'generator': 'scripts/import-neutral-pinyin-audio.py'}, 'recordings': found}
    if args.write:
        json.dump(doc, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); open(OUT, 'a').write('\n')
    for k, r in found.items(): print(k, r['word'], r['ms'], 'ms', r.get('alsoRecordedIn', ''))

main()

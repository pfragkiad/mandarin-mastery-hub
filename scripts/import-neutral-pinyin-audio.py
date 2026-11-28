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
  * the word already carries a CDN recording attachment (src/data/vocabulary/);
  * for Shtooka recordings, the preserved owning source index (cmn-caen-tan or the
    supplemental cmn-balm-hsk1 package) must list that exact word with that exact
    toneless reading, so a clip recorded in another tone never counts;
  * an exact standalone source-word recording in the catalogue may supply a slot only
    when no Vocabulary entry owns it (needed for 哇 wa, whose Vocabulary word is wā);
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

def shtooka_readings(path='importer/data/hsk-audio/cmn-caen-tan-index.xml.bz2'):
    root = ET.parse(bz2.open(path)).getroot()
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
    hsk1 = shtooka_readings('importer/data/missing-audio/notices/cmn-balm-hsk1-index.xml')
    found = {}

    def consider(word, reading, audio, entry_id, hsk_index):
        word, reading = nfc(word), nfc(reading.strip())
        if len(word) != 1 or not audio or not audio.get('url'): return
        if any(c in MARKS for c in unicodedata.normalize('NFD', reading)): return
        base = reading.lower()
        if 5 not in inventory.get(base, []): return
        source = audio.get('source', '')
        # Check the owning index, never merely the presence of "Shtooka" in a label.
        if source == 'Shtooka Project (cmn-balm-hsk1) / Wei Gao' and reading not in hsk1.get(word, set()):
            print(f'skip {word} {reading}: not recorded in that reading by cmn-balm-hsk1', file=sys.stderr); return
        if source != 'Shtooka Project (cmn-balm-hsk1) / Wei Gao' and 'Shtooka' in source and reading not in shtooka.get(word, set()):
            print(f'skip {word} {reading}: not recorded in that reading by cmn-caen-tan', file=sys.stderr); return
        item = {'word': word, 'reading': reading, 'entryId': entry_id, 'hskIndex': hsk_index, 'url': audio['url'],
                'source': source, 'license': audio['license'], 'recordingKind': audio.get('recordingKind') or 'word'}
        key = f'{base}5'
        if key in found: found[key].setdefault('alsoRecordedIn', []).append(word)
        else: found[key] = item

    for e in sorted(entries, key=lambda e: (e.get('hsk_index') is None, e.get('hsk_index') or 0)):
        consider(e['simplified'], e['pinyinDisplay'], e.get('audio'), e['id'], e.get('hsk_index'))

    # A standalone exact source word is a last resort for a neutral character slot,
    # never a replacement for an attached Vocabulary recording. Only recordingKind
    # "word" qualifies; old tone-5 syllable assets remain categorically excluded.
    catalog = json.load(open('public/data/catalog.json', encoding='utf-8'))
    for glyph, bindings in sorted(catalog['readingAudio'].items()):
        for reading, recording_id in bindings.items():
            audio = catalog['audio'].get(recording_id) if recording_id else None
            if audio and audio.get('recordingKind') == 'word':
                consider(glyph, reading, audio, None, None)
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

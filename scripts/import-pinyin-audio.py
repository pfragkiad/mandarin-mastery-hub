#!/usr/bin/env python3
"""Compile the supplied pinyin pronunciation material into two browser-safe sidecars.

Inputs (from the supplied pinyin.zip / public.zip material):
  <material>/pinyin/data/pinyin-inventory.json       syllable inventory (CC-CEDICT snapshot)
  <material>/pinyin/data/pinyin-audio-manifest.json  recording manifest (hugolpz/audio-cmn)
  <material>/public/audio/pinyin/standard/*.mp3       the recordings themselves
  <uploads>/<id-with-v-for-ü>.json                    `lovable-assets create` output per recording

Outputs:
  src/data/pinyin/inventory.json  syllables with their dictionary-attested tones + source
  src/data/pinyin/audio.json      recording id -> CDN url/duration + source/speaker/license

Rules enforced here (fail closed):
  * every recording's bytes and SHA-256 must match the manifest before it is published;
  * neutral-tone (5) recordings are never published — the source withdrew them after
    incorrect spoken content was reported;
  * a recording must belong to a syllable/tone the inventory attests;
  * no frequency, ranking or pronunciation is inferred — only recorded facts are copied.

Usage: python3 scripts/import-pinyin-audio.py <material-dir> <uploads-dir>
"""
import hashlib
import json
import os
import sys
import unicodedata

material, uploads = sys.argv[1], sys.argv[2]
nfc = lambda s: unicodedata.normalize('NFC', s)

inventory = json.load(open(os.path.join(material, 'pinyin/data/pinyin-inventory.json'), encoding='utf-8'))
manifest = json.load(open(os.path.join(material, 'pinyin/data/pinyin-audio-manifest.json'), encoding='utf-8'))
audio_dir = os.path.join(material, 'public/audio/pinyin/standard')
# The archive stores ü in some file names as the literal escape "#U00fc".
files = {nfc(name.replace('#U00fc', 'ü')): name for name in os.listdir(audio_dir)}

syllables = []
attested = {}
for s in inventory['syllables']:
    base = nfc(s['base'])
    assert base == nfc(s['id']), s
    assert s['attestation'] == 'dictionary-attested', s
    tones = sorted(set(s['validTones']))
    attested[base] = set(tones)
    syllables.append({'base': base, 'initial': s['initial'], 'final': nfc(s['final']), 'tones': tones, 'note': s['articulationNotes']})

recordings = {}
for r in manifest['recordings']:
    rid, base, tone = nfc(r['id']), nfc(r['syllableId']), r['tone']
    if tone == 5:
        continue  # withdrawn neutral-tone source recordings are never published
    assert rid == f'{base}{tone}' and tone in attested.get(base, set()), r
    assert r['sourceId'] == 'audio-cmn-2013' and r['licenseId'] == 'CC-BY-SA-3.0', r
    data = open(os.path.join(audio_dir, files[rid + '.mp3']), 'rb').read()
    assert len(data) == r['bytes'] and hashlib.sha256(data).hexdigest() == r['sha256'], f'checksum mismatch: {rid}'
    pointer = json.load(open(os.path.join(uploads, rid.replace('ü', 'v') + '.json')))
    assert pointer['size'] == r['bytes'], f'uploaded size mismatch: {rid}'
    recordings[rid] = {'url': pointer['url'], 'ms': r['durationMs']}

first = manifest['recordings'][0]
out_dir = 'src/data/pinyin'
os.makedirs(out_dir, exist_ok=True)
json.dump({
    'source': {
        'name': 'CC-CEDICT',
        'url': inventory['sourceUrl'],
        'sha256': inventory['sourceSha256'],
        'license': 'CC BY-SA 4.0',
        'policy': inventory['policy'],
    },
    'syllables': syllables,
}, open(os.path.join(out_dir, 'inventory.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump({
    'source': {
        'name': 'audio-cmn',
        'url': f"https://github.com/hugolpz/audio-cmn/tree/{first['sourceCommit']}",
        'commit': first['sourceCommit'],
        'license': 'CC BY-SA 3.0',
        'credits': 'Chen Wang 王琛, Hugo Lopez, Nicolas Vion',
        'speaker': first['speakerId'],
        'accent': 'Mainland speaker; accent not reviewed',
        'reviewed': False,
        'neutralToneWithdrawn': True,
    },
    'recordings': recordings,
}, open(os.path.join(out_dir, 'audio.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'{len(syllables)} syllables, {len(recordings)} recordings')

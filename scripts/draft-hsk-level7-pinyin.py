#!/usr/bin/env python3
"""Draft/check assisted sentence pinyin for the complete official shared 7–9 band.

Requires pypinyin==0.55.0, jieba==0.42.1 and the repository's Node dependencies.
Optional temporary installs: --tools-dir PATH (or HSK_PINYIN_TOOLS).
The JSONL sentences and official transcription are read-only inputs. Output is an
unreviewed editorial layer, not official text or an audio transcription. Known
word readings are split by the existing frontend aligner, never by word length.
"""
from __future__ import annotations

import argparse
from bisect import bisect_right
from collections import Counter, defaultdict
import hashlib
import importlib.metadata
import json
import logging
import os
from pathlib import Path
import re
import subprocess
import sys
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = Path('importer/data/hsk-level7/sentence-drafts')
RANGES = ('5401-7267.jsonl', '7268-9134.jsonl', '9135-11000.jsonl')
OUTPUT = DIRECTORY / 'pinyin-0.0.1.json'
TRANSCRIPTION = Path('importer/data/hsk-level7/official-vocabulary.json')
BRIDGE = Path('scripts/hsk-level7-reading-lexicon.mjs')
HAN = re.compile(r'[\u3400-\u9fff\uf900-\ufaff]')
TONE_MARKS = {'\u0300', '\u0301', '\u0304', '\u030c'}
PUNCTUATION = str.maketrans({'，': ',', '。': '.', '？': '?', '！': '!',
                             '；': ';', '：': ':', '、': ',', '“': '"',
                             '”': '"', '‘': "'", '’': "'", '（': '(', '）': ')'})

# These are explicitly attributed editorial conflict decisions, not mutations of
# the official tuple. The raw printed reading/POS remains in each target record.
SOURCE_REVIEW = {
    5714: {'kind': 'source_reading_conflict', 'syllables': ['bú', 'jiàn', 'de'],
           'note': 'Printed 不见得 ends dé; this modal expression normally has neutral de. Sentence uses neutral de; retain printed dé for review.'},
    9382: {'kind': 'source_spelling_repair', 'syllables': ['téng', 'ài'],
           'note': "Printed téngài lacks the apostrophe before ài. Display téng'ài only; source spelling remains unchanged."},
}

SOURCE_POS_CAUTIONS = {
    7309: '继 is printed 动; the sentence uses its ordinary sequential/prepositional construction.',
    7774: '空前 is printed 动; the sentence uses the ordinary adjectival construction.',
    7966: '连年 is printed 动; the sentence uses its ordinary repeated-years time expression.',
    8356: '年均 is printed 动; the sentence uses its ordinary annual-average modifier.',
    8586: '迄今 is printed 动; the sentence uses its ordinary up-to-now time expression.',
    9701: '无比 is printed 动; the sentence uses the ordinary degree modifier 无比幸福.',
    10373: '由衷 is printed 动; the sentence uses ordinary 由衷地.',
    10846: '转眼 is printed 动; the sentence uses its ordinary temporal expression.',
}

# These local contexts were inspected after generation. They constrain only the
# listed sentence and anchor, without making a character-wide reading alias.
MODAL_DEI_CONTEXTS = {
    5452: '玩具得', 5592: '车得', 5837: '雪得', 5886: '事得',
    5909: '艺得', 6098: '末得', 6259: '店得', 6389: '匙得',
    7871: '回得', 8794: '路得',
}
REVIEWED_CHARACTER_ANCHORS = {
    (7114, '种'): '种着', (8797, '种'): '种着', (10993, '种'): '种着',
}
REVIEWED_WORD_SPANS = {
    6144: {'一行': ['yì', 'háng']},
    8536: {'曲子': ['qǔ', 'zi']}, 10720: {'曲子': ['qǔ', 'zi']},
    9194: {'长电缆': ['cháng', 'diàn', 'lǎn']},
}

PLACE_DIFANG = {6398, 6856, 7223, 7296, 7388, 7431, 8208, 9012,
                9220, 9421, 9678, 9723, 9850, 10464, 10602, 10686}
LOCAL_DIFANG = {5508, 5584, 5689, 6595, 6885, 6926, 9084, 9674,
                10483, 10499, 10624, 10673, 10853}
SENTENCE_WORD_READINGS = {
    7479: {'教授': ['jiāo', 'shòu']},
    10631: {'重重': ['zhòng', 'zhòng']},
    5861: {'口音': ['kǒu', 'yin']}, 7323: {'口音': ['kǒu', 'yin']},
    9411: {'口音': ['kǒu', 'yin']}, 5901: {'人家': ['rén', 'jiā']},
    6459: {'精神': ['jīng', 'shen']},
    8387: {'调配': ['tiáo', 'pèi']},
}
for _id in PLACE_DIFANG:
    SENTENCE_WORD_READINGS.setdefault(_id, {})['地方'] = ['dì', 'fang']
for _id in LOCAL_DIFANG:
    SENTENCE_WORD_READINGS.setdefault(_id, {})['地方'] = ['dì', 'fāng']

# Exact non-target occurrences inspected in the peer pinyin pass. These are
# sentence-bound editorial decisions, not readings copied into source records.
SENTENCE_CHARACTER_READINGS = {
    5418: {'觉': 'jiào'}, 6441: {'转': 'zhuàn'}, 7473: {'将': 'jiāng'},
    7785: {'卡': 'qiǎ'}, 9488: {'卡': 'qiǎ'}, 6287: {'调': 'tiáo'},
    6626: {'调': 'tiáo'}, 5779: {'当': 'dàng'}, 6420: {'当': 'dàng'},
    7227: {'当': 'dàng'}, 8899: {'当': 'dàng'}, 10201: {'当': 'dàng'},
    9167: {'落': 'là'}, 9692: {'待': 'dāi'}, 9769: {'弹': 'tán'},
    9798: {'调': 'tiáo', '差': 'chā'}, 9800: {'调': 'tiáo'},
    6650: {'差': 'chā'}, 10857: {'系': 'jì'},
    8229: {'长': 'cháng'}, 8586: {'长': 'cháng'},
    9086: {'遛': 'liù'},
    6144: {'行': 'háng'}, 8536: {'子': 'zi', '弹': 'tán'},
    10720: {'弹': 'tán'}, 9194: {'长': 'cháng'}, 8178: {'得': 'de'},
}
for _id in (5619, 6849, 8313, 9286, 10015, 10253, 10487):
    SENTENCE_CHARACTER_READINGS.setdefault(_id, {})['种'] = 'zhǒng'
for _id in (7450, 7549, 8086, 8371, 9200, 10102, 10248, 10379, 10977):
    SENTENCE_CHARACTER_READINGS.setdefault(_id, {})['干'] = 'gān'
for _id in (5427, 5965, 6673, 7461, 8842, 8873, 8875, 9042, 10418, 10465):
    SENTENCE_CHARACTER_READINGS.setdefault(_id, {})['场'] = 'chǎng'
for _id in (5595, 6196, 6777, 6916, 7548, 8127, 8494, 8823, 8824,
            9006, 9333, 9387, 9598, 10344, 10444, 10674, 6333, 7264,
            7935, 10234):
    SENTENCE_CHARACTER_READINGS.setdefault(_id, {})['为'] = 'wéi'
for _id in (6303, 6445, 7114, 7474, 8301, 8797, 9090, 10993):
    SENTENCE_CHARACTER_READINGS.setdefault(_id, {})['种'] = 'zhòng'
for _id in (6375, 6927, 8651, 8819, 9286, 10152, 10555, 10562, 10903):
    SENTENCE_CHARACTER_READINGS.setdefault(_id, {})['长'] = 'cháng'
for _id in (5610, 5793, 5903, 5951, 6060, 6412, 6833, 6922, 7238,
            7264, 7553, 7666, 7808, 7971, 8015, 8423, 8525, 8656, 8684,
            8697, 8777, 9197, 9263, 9328, 9422, 9647, 9663, 9722, 10001,
            10013, 10055, 10208, 10265, 10703, 10757, 10766, 10860):
    SENTENCE_CHARACTER_READINGS.setdefault(_id, {})['只'] = 'zhī'

# Full-word exceptions are constrained to these exact spellings and meanings;
# they are not character-wide aliases. Most readings come from official rows.
CONTEXT_WORDS = {
    '还得': ['hái', 'děi'], '总得': ['zǒng', 'děi'], '可得': ['kě', 'děi'],
    '也得': ['yě', 'děi'], '就得': ['jiù', 'děi'], '都得': ['dōu', 'děi'],
    '又得': ['yòu', 'děi'], '得先': ['děi', 'xiān'], '得再': ['děi', 'zài'],
    '得把': ['děi', 'bǎ'], '跑得': ['pǎo', 'de'], '走得': ['zǒu', 'de'],
    '做得': ['zuò', 'de'], '写得': ['xiě', 'de'], '说得': ['shuō', 'de'],
    '讲得': ['jiǎng', 'de'], '看得': ['kàn', 'de'], '听得': ['tīng', 'de'],
    '吃得': ['chī', 'de'], '睡得': ['shuì', 'de'], '笑得': ['xiào', 'de'],
    '哭得': ['kū', 'de'], '忙得': ['máng', 'de'], '累得': ['lèi', 'de'],
    '急得': ['jí', 'de'], '冷得': ['lěng', 'de'], '热得': ['rè', 'de'],
    '冻得': ['dòng', 'de'], '烫得': ['tàng', 'de'], '吓得': ['xià', 'de'],
    '疼得': ['téng', 'de'], '唱得': ['chàng', 'de'], '画得': ['huà', 'de'],
    '变得': ['biàn', 'de'], '显得': ['xiǎn', 'de'], '觉得': ['jué', 'de'],
    '记得': ['jì', 'de'], '舍不得': ['shě', 'bu', 'de'],
    '来得及': ['lái', 'de', 'jí'], '来不及': ['lái', 'bu', 'jí'],
    '不得不': ['bù', 'dé', 'bù'], '不得已': ['bù', 'dé', 'yǐ'],
    '这得': ['zhè', 'děi'], '那得': ['nà', 'děi'],
    '看着': ['kàn', 'zhe'], '望着': ['wàng', 'zhe'], '沿着': ['yán', 'zhe'],
    '顺着': ['shùn', 'zhe'], '随着': ['suí', 'zhe'], '趁着': ['chèn', 'zhe'],
    '拿着': ['ná', 'zhe'], '抱着': ['bào', 'zhe'], '站着': ['zhàn', 'zhe'],
    '坐着': ['zuò', 'zhe'], '留着': ['liú', 'zhe'], '带着': ['dài', 'zhe'],
    '等着': ['děng', 'zhe'], '笑着': ['xiào', 'zhe'], '想着': ['xiǎng', 'zhe'],
    '握着': ['wò', 'zhe'], '挂着': ['guà', 'zhe'], '放着': ['fàng', 'zhe'],
    '写着': ['xiě', 'zhe'], '刻着': ['kè', 'zhe'], '朝着': ['cháo', 'zhe'],
    '压着': ['yā', 'zhe'], '乐得': ['lè', 'de'], '应了一声': ['yìng', 'le', 'yì', 'shēng'],
    '重做': ['chóng', 'zuò'], '重画': ['chóng', 'huà'], '重写': ['chóng', 'xiě'],
    '调暗': ['tiáo', 'àn'], '调亮': ['tiáo', 'liàng'], '调低': ['tiáo', 'dī'],
    '调高': ['tiáo', 'gāo'], '长满': ['zhǎng', 'mǎn'], '长出': ['zhǎng', 'chū'],
    '长高': ['zhǎng', 'gāo'], '没了': ['méi', 'le'], '似的': ['shì', 'de'],
    '当地': ['dāng', 'dì'], '土地': ['tǔ', 'dì'], '空地': ['kòng', 'dì'],
    '静静地': ['jìng', 'jìng', 'de'], '轻快地': ['qīng', 'kuài', 'de'],
    '会意地': ['huì', 'yì', 'de'], '赞许地': ['zàn', 'xǔ', 'de'],
    '围着': ['wéi', 'zhe'], '烫着': ['tàng', 'zháo'],
    '不少': ['bù', 'shǎo'],
    '睡不着': ['shuì', 'bu', 'zháo'], '找不着': ['zhǎo', 'bu', 'zháo'],
    '呛着': ['qiāng', 'zháo'], '长椅': ['cháng', 'yǐ'],
    '长绳': ['cháng', 'shéng'], '长凳': ['cháng', 'dèng'],
    '长电缆': ['cháng', 'diàn', 'lǎn'], '长队': ['cháng', 'duì'],
    '待在': ['dāi', 'zài'], '待着': ['dāi', 'zhe'],
    '卡纸': ['qiǎ', 'zhǐ'], '卡住': ['qiǎ', 'zhù'], '曲子': ['qǔ', 'zi'],
}

# Known dictionary entries whose pronunciation depends on syntactic context.
# Use sentence-level support unless this occurrence is the selected exact target.
CONTEXT_SENSITIVE = {'穿着', '结果', '大意', '东西', '便宜', '当日', '当年',
                     '当时', '长大', '好好', '不了', '得了', '为难', '应当', '一行'}


def sha(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def encoded(value) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def base(text: str) -> str:
    return unicodedata.normalize('NFC', ''.join(c for c in unicodedata.normalize('NFD', text)
                                             if c not in TONE_MARKS)).lower()


def tone(text: str) -> int:
    for number, mark in ((1, '\u0304'), (2, '\u0301'), (3, '\u030c'), (4, '\u0300')):
        if mark in unicodedata.normalize('NFD', text):
            return number
    return 5


def bridge(rows=None):
    command = ['node', str(ROOT / BRIDGE)]
    if rows is None:
        command.append('--lexicon')
    result = subprocess.run(command, input=None if rows is None else json.dumps(rows, ensure_ascii=False),
                            text=True, encoding='utf-8', capture_output=True, cwd=ROOT, check=True)
    return json.loads(result.stdout)


def join_word(syllables):
    result = ''
    for syllable in syllables:
        if result and base(syllable).startswith(('a', 'e', 'o')):
            result += "'"
        result += syllable
    return result


def read_inputs():
    sources, rows = [], []
    for filename in RANGES:
        path = DIRECTORY / filename
        raw = (ROOT / path).read_bytes()
        current = [json.loads(line) for line in raw.decode('utf-8').splitlines() if line.strip()]
        sources.append({'path': path.as_posix(), 'sha256': sha(raw), 'records': len(current)})
        rows.extend(current)
    if [r['id'] for r in rows] != list(range(5401, 11001)):
        raise ValueError('All three ranges must be complete, ordered and unique; refusing a partial overlay.')
    return rows, sources


def build(tools_dir=None):
    if tools_dir:
        sys.path.insert(0, str(Path(tools_dir).resolve()))
    import jieba
    from pypinyin import Style, lazy_pinyin, pinyin
    versions = {name: importlib.metadata.version(name) for name in ('pypinyin', 'jieba')}
    assert versions == {'pypinyin': '0.55.0', 'jieba': '0.42.1'}, versions
    jieba.setLogLevel(logging.ERROR)
    drafts, sources = read_inputs()
    recorded = bridge()
    by_id = {r['id']: r for r in recorded}
    lexicon = defaultdict(list)
    unsplit = []
    for row in recorded:
        syllables = row['syllables']
        if syllables is None:
            unsplit.append({k: row[k] for k in ('id', 'hanzi', 'pinyin')})
        if row['id'] in SOURCE_REVIEW:
            syllables = SOURCE_REVIEW[row['id']]['syllables']
        if syllables:
            lexicon[row['hanzi']].append((syllables, row['id']))
    # Non-default source alternatives stay explicit and never replace raw strings.
    for id, alternatives in ((181, [['shéi'], ['shuí']]), (1688, [['shú'], ['shóu']])):
        for syllables in alternatives:
            lexicon[by_id[id]['hanzi']].append((syllables, id))
    starts = defaultdict(list)
    for word in set(lexicon) | set(CONTEXT_WORDS):
        if len(word) > 1:
            starts[word[0]].append(word)
    for words in starts.values():
        words.sort(key=lambda w: (-len(w), w))
    stats = Counter()
    target_differences = []
    word_differences = []
    entries, token_records = [], []
    # Cache only supporting alternatives, not generic source substitutions.
    alternatives_cache = {}

    def alternatives(char):
        if char not in alternatives_cache:
            alternatives_cache[char] = pinyin(char, style=Style.TONE, heteronym=True)[0]
        return alternatives_cache[char]

    for draft in drafts:
        id, sentence, headword = draft['id'], draft['hanzi'], draft['headword']
        source = by_id[id]
        assert source['hanzi'] == headword
        target_start = sentence.index(headword)
        target_end = target_start + len(headword)
        baseline = lazy_pinyin(sentence, style=Style.TONE, errors=lambda text: list(text))
        assert len(baseline) == len(sentence), (id, sentence, baseline)
        official = source['syllables']
        target_syllables = list(SOURCE_REVIEW.get(id, {}).get('syllables', official) or [])
        assert len(target_syllables) == len(headword), (id, source)
        flags = []
        if id in SOURCE_REVIEW:
            flags.append({k: v for k, v in SOURCE_REVIEW[id].items() if k != 'syllables'})
        if id in SOURCE_POS_CAUTIONS:
            flags.append({'kind': 'source_pos_analysis_caution', 'note': SOURCE_POS_CAUTIONS[id]})
        if id == 9263:
            flags.append({'kind': 'ambiguous_word_sense_reading_review', 'hanzi': '转动',
                          'note': 'Articulated puppet limbs can suggest turning/swiveling zhuǎndòng or axial rotation zhuàndòng. This non-target occurrence keeps recorded zhuàndòng pending semantic review; no character-wide substitution.'})
        baseline_target = baseline[target_start:target_end]
        if target_syllables != baseline_target:
            target_differences.append({'id': id, 'headword': headword, 'official_pinyin': source['pinyin'],
                                       'supporting_pypinyin': baseline_target, 'selected': target_syllables})
        jieba_ends = {}
        cursor = 0
        for word in jieba.cut(sentence, HMM=False):
            jieba_ends[cursor] = cursor + len(word)
            cursor += len(word)
        jieba_boundaries = sorted(jieba_ends.values())
        protected_words = {}
        for word, reading in REVIEWED_WORD_SPANS.get(id, {}).items():
            assert sentence.count(word) == 1, (id, 'Reviewed word span changed', word)
            start = sentence.index(word)
            assert start + len(word) <= target_start or start >= target_end
            protected_words[start] = (word, reading)
        tokens = []
        pos = 0
        while pos < len(sentence):
            char = sentence[pos]
            if not HAN.fullmatch(char):
                tokens.append({'start': pos, 'end': pos + 1, 'hanzi': char, 'syllables': [], 'method': 'punctuation'})
                pos += 1
                continue
            if pos == target_start:
                end, word = target_end, headword
                syllables = list(target_syllables)
                method, ids = 'exact_selected_target', [id]
            elif pos in protected_words:
                word, reading = protected_words[pos]
                end, syllables = pos + len(word), list(reading)
                method, ids = 'reviewed_sentence_word_span', []
            else:
                limit = target_start if pos < target_start else len(sentence)
                limit = min([limit] + [at for at in protected_words if at > pos])
                observed_end = jieba_boundaries[bisect_right(jieba_boundaries, pos)]
                def allowed_match(w):
                    if pos + len(w) > limit or not sentence.startswith(w, pos):
                        return False
                    # Dictionary words may not steal characters across observed
                    # morpheme boundaries: 这种/植物 is not 这/种植/物;
                    # 曲子/弹完 is not 曲/子弹/完. Only the explicit reviewed
                    # grammar phrases above may span segmentation boundaries.
                    if pos + len(w) > observed_end and w not in CONTEXT_WORDS:
                        return False
                    # 就得到 is 就 + 得到, not modal 就得 + 到. Likewise
                    # after 没完没了, 地 is structural, not noun 地下.
                    if w in {'还得', '总得', '可得', '也得', '就得', '都得', '又得'} and sentence.startswith(w + '到', pos):
                        return False
                    if w == '一下' and sentence.startswith('一下午', pos):
                        return False
                    if char == '地' and sentence[:pos].endswith('没完没了'):
                        return False
                    return True
                word = next((w for w in starts.get(char, []) if allowed_match(w)), None)
                if word is None:
                    end = min(observed_end, limit)
                    if char == '地' and sentence[:pos].endswith('没完没了'):
                        end = pos + 1
                    # Do not swallow an official word beginning inside an unknown run.
                    for candidate in range(pos + 1, end):
                        if any(candidate + len(w) <= min(limit, observed_end) and sentence.startswith(w, candidate)
                               for w in starts.get(sentence[candidate], [])):
                            end = candidate
                            break
                    word = sentence[pos:end]
                end = pos + len(word)
                supported = baseline[pos:end]
                choices = lexicon.get(word, [])
                readings = {}
                for reading, sid in choices:
                    readings.setdefault(tuple(reading), []).append(sid)
                ids = []
                if word in SENTENCE_WORD_READINGS.get(id, {}):
                    syllables = list(SENTENCE_WORD_READINGS[id][word])
                    method = 'reviewed_sentence_word_context'
                elif word in CONTEXT_WORDS:
                    syllables = list(CONTEXT_WORDS[word])
                    method = 'editorial_context_rule'
                elif word == '穿着':
                    syllables = ['chuān', 'zhe']
                    method = 'editorial_verbal_aspect_context'
                elif word in CONTEXT_SENSITIVE:
                    syllables = list(supported)
                    method = 'contextual_support_not_unconditional_dictionary_override'
                    if tuple(syllables) in readings:
                        ids = readings[tuple(syllables)]
                elif len(word) > 1 and len(readings) == 1:
                    selected = next(iter(readings))
                    syllables = list(selected)
                    ids = readings[selected]
                    method = 'unique_recorded_word'
                    if [base(s) for s in syllables] != [base(s) for s in supported] or any(
                            a != b and tone(a) != 5 and tone(b) != 5
                            for a, b in zip(syllables, supported)):
                        word_differences.append({'id': id, 'start': pos, 'hanzi': word,
                                                 'recorded_ids': ids, 'selected': list(syllables),
                                                 'supporting_pypinyin': supported})
                elif tuple(supported) in readings:
                    syllables = list(supported)
                    ids = readings[tuple(supported)]
                    method = 'recorded_word_context_match'
                else:
                    syllables = list(supported)
                    method = 'pypinyin_context_support'
                    if len(readings) > 1:
                        flags.append({'kind': 'ambiguous_recorded_word_context', 'start': pos, 'hanzi': word,
                                      'selected': syllables, 'recorded_alternatives': [list(k) for k in readings]})
                    if len(word) > 1:
                        risky = []
                        for offset, glyph in enumerate(word):
                            if glyph in '重长行调折薄背只差数当为将处供好正便省转曾卡冲觉空种系待藏落传弹朝累少乐假难号解相缝强提咽兴呛似剥横教量应都没还场着得地了':
                                choices_for_char = alternatives(glyph)
                                if len(choices_for_char) > 1:
                                    risky.append({'offset': offset, 'hanzi': glyph, 'alternatives': choices_for_char})
                        if risky:
                            flags.append({'kind': 'compound_polyphony_needs_context_review', 'start': pos,
                                          'hanzi': word, 'selected': syllables, 'characters': risky})
                if len(word) == 1:
                    if word in {'的', '吗', '呢', '吧', '啊', '嘛', '啦', '呀'}:
                        syllables = [{'的': 'de', '吗': 'ma', '呢': 'ne', '吧': 'ba',
                                      '啊': 'a', '嘛': 'ma', '啦': 'la', '呀': 'ya'}[word]]
                        method = 'neutral_grammatical_particle'
                    elif word == '了':
                        syllables = ['le']
                        method = 'neutral_aspect_particle'
                    elif word == '着':
                        syllables = ['zhe']
                        method = 'neutral_aspect_particle'
                    elif word == '地':
                        land = pos > 0 and sentence[pos - 1] in '块片亩处耕土场领大天各在一'
                        syllables = ['dì' if land else 'de']
                        method = 'editorial_land_or_structural_particle'
                    elif word == '得':
                        preceding = sentence[pos - 1] if pos else ''
                        modal = pos == 0 or preceding in '，。；：我你他她它咱们也还又可总就都' or sentence[pos + 1:pos + 2] in '把先再须'
                        syllables = ['děi' if modal else 'de']
                        method = 'editorial_modal_or_complement_particle'
                    elif word == '还':
                        following = sentence[pos + 1:pos + 2]
                        returned = following in '给钱款债书' and bool(following)
                        syllables = ['huán' if returned else 'hái']
                        method = 'editorial_return_or_still_context'
                    elif word in '重长行调折薄背只差数当为将处供好正便省转曾卡冲觉空种系待藏落传弹朝累':
                        options = alternatives(word)
                        if len(options) > 1:
                            flags.append({'kind': 'single_character_polyphony_needs_context_review', 'start': pos,
                                          'hanzi': word, 'selected': syllables, 'supporting_alternatives': options})
            assert len(syllables) == len(word), (id, word, syllables)
            token = {'start': pos, 'end': end, 'hanzi': word, 'syllables': syllables, 'method': method}
            if ids:
                token['recorded_ids'] = ids
            tokens.append(token)
            stats[method] += 1
            pos = end
        if id in MODAL_DEI_CONTEXTS:
            anchor = MODAL_DEI_CONTEXTS[id]
            assert sentence.count(anchor) == 1, (id, 'Reviewed modal anchor changed', anchor)
            at = sentence.index(anchor) + len(anchor) - 1
            for token in tokens:
                if token['start'] <= at < token['end']:
                    token['syllables'][at - token['start']] = 'děi'
                    token['method'] = 'reviewed_sentence_modal_context'
                    break
        # 一/不 have contextual surface tones; third-tone dictionary marks stay
        # unchanged. Ordinals, weekdays and serial 一 retain lexical yī. A–一–A
        # and A–不–A use neutral i/bu rather than a false dictionary-tone promise.
        indexed = {}
        for token in tokens:
            for offset, syllable in enumerate(token['syllables']):
                indexed[token['start'] + offset] = (token, offset)
        reviewed_characters = []
        for glyph, reading in SENTENCE_CHARACTER_READINGS.get(id, {}).items():
            matches = [at for at in indexed if sentence[at] == glyph and not target_start <= at < target_end]
            if (id, glyph) in REVIEWED_CHARACTER_ANCHORS:
                anchor = REVIEWED_CHARACTER_ANCHORS[id, glyph]
                matches = [at for at in matches if sentence.startswith(anchor, at)]
            assert matches, (id, 'Reviewed non-target character context changed', glyph)
            for at in matches:
                token, offset = indexed[at]
                old = token['syllables'][offset]
                token['syllables'][offset] = reading
                reviewed_characters.append({'start': at, 'hanzi': glyph, 'before': old, 'after': reading})
        sandhi = []
        for at in sorted(indexed):
            glyph = sentence[at]
            if glyph not in '一不':
                continue
            token, offset = indexed[at]
            original = token['syllables'][offset]
            before = sentence[at - 1] if at else ''
            following = sentence[at + 1] if at + 1 < len(sentence) else ''
            if glyph == '一':
                ordinal = before in {'第', '周'} or sentence[max(0, at - 2):at] in {'星期', '礼拜'} or token['hanzi'] in {'统一', '唯一', '一一', '逐一', '单一', '数一数二'}
                # Eleven/twenty-one etc keep number-final yī rather than
                # acquiring classifier sandhi from the following word.
                ordinal = ordinal or (before in '十百千万零〇二三四五六七八九' and bool(before) and following not in '十百千万')
                if ordinal or at + 1 not in indexed:
                    selected = 'yī'
                elif before and before == following:
                    selected = 'yi'
                else:
                    next_token, next_offset = indexed[at + 1]
                    selected = 'yí' if tone(next_token['syllables'][next_offset]) == 4 else 'yì'
            else:
                if before and before == following:
                    selected = 'bu'
                elif original == 'bu':
                    selected = 'bu'
                elif at + 1 in indexed:
                    next_token, next_offset = indexed[at + 1]
                    selected = 'bú' if tone(next_token['syllables'][next_offset]) == 4 else 'bù'
                else:
                    selected = 'bù'
            if selected != original:
                token['syllables'][offset] = selected
                sandhi.append({'start': at, 'hanzi': glyph, 'before': original, 'after': selected})
        entry = {'id': id, 'headword': headword, 'hanzi_sha256': sha(sentence.encode('utf-8')),
                 'review_status': 'assisted_editorial_draft_needs_language_review',
                 'target': {'start': target_start, 'end': target_end, 'official_entry': source['entry'],
                            'official_pinyin': source['pinyin'], 'official_pos_zh': source['part_of_speech'],
                            'official_syllables': official,
                            'sentence_syllables': [indexed[i][0]['syllables'][indexed[i][1]] for i in range(target_start, target_end)]},
                 'review_flags': flags, 'sandhi_adjustments': sandhi}
        if reviewed_characters:
            entry['reviewed_character_contexts'] = reviewed_characters
        entries.append(entry)
        token_records.append(tokens)

    # Check each word independently before full-sentence alignment. Only a token
    # whose exact spelling cannot split uniquely gets syllable spaces; this is
    # a mechanical display repair, not a new reading.
    unique_tokens = {}
    for tokens in token_records:
        for token in tokens:
            if token['syllables']:
                key = (token['hanzi'], tuple(token['syllables']))
                unique_tokens.setdefault(key, len(unique_tokens))
    requests = [{'id': n, 'hanzi': key[0], 'pinyin': join_word(key[1])} for key, n in unique_tokens.items()]
    validations = {r['id']: r['syllables'] for r in bridge(requests)}
    repairs = []
    for key, n in unique_tokens.items():
        if validations[n] is None:
            repairs.append({'hanzi': key[0], 'syllables': list(key[1]), 'from': join_word(key[1]),
                            'to': ' '.join(key[1])})
    repair_keys = {(r['hanzi'], tuple(r['syllables'])) for r in repairs}
    for entry, tokens in zip(entries, token_records):
        pieces = []
        for token in tokens:
            if token['syllables']:
                key = (token['hanzi'], tuple(token['syllables']))
                word = ' '.join(token['syllables']) if key in repair_keys else join_word(token['syllables'])
                pieces.append(word)
            else:
                punctuation = token['hanzi'].translate(PUNCTUATION)
                if pieces:
                    pieces[-1] += punctuation
                else:
                    pieces.append(punctuation)
        display = ' '.join(pieces).strip()
        entry['pinyin'] = display[:1].upper() + display[1:]
    sentence_checks = bridge([{'id': e['id'], 'hanzi': d['hanzi'], 'pinyin': e['pinyin']}
                              for e, d in zip(entries, drafts)])
    failures = [r['id'] for r in sentence_checks if r['syllables'] is None]
    if failures:
        raise ValueError(f'Shared phrase-pinyin alignment failed; no output emitted: {failures}')
    expected = {}
    for entry, tokens in zip(entries, token_records):
        expected[entry['id']] = [s for t in tokens for s in t['syllables']]
    for result in sentence_checks:
        actual = [s.lower() for s in result['syllables']]
        assert actual == [s.lower() for s in expected[result['id']]], (result['id'], actual, expected[result['id']])
    for source in sources:
        assert sha((ROOT / source['path']).read_bytes()) == source['sha256'], 'Drafts changed during generation; rebuild.'
    flag_counts = Counter(f['kind'] for e in entries for f in e['review_flags'])
    stats = Counter(t['method'] for tokens in token_records for t in tokens if t['syllables'])
    source_files = [TRANSCRIPTION, Path('src/data/pinyin/inventory.json'), Path('src/lib/phrase-pinyin-align.ts'),
                    Path('src/lib/sentence-align.ts'), BRIDGE, Path('scripts/draft-hsk-level7-pinyin.py')]
    return {'schema_version': 'hsk-level7-assisted-sentence-pinyin/0.0.1',
            'scope': 'All 5,600 official shared Levels 7–9 entries; offline unreviewed draft only.',
            'provenance': {'kind': 'assisted_editorial_reading_draft', 'tools': versions,
                           'word_readings': 'Exact official HSK spellings, split with the shared frontend aligner; selected target IDs are kept distinct.',
                           'support': 'Constrained known-word lexicon plus pypinyin sentence context and jieba boundaries; explicit contextual grammar rules.',
                           'convention': 'Word-grouped tone-marked pinyin; contextual 一/不 sandhi; neutral grammatical particles; third-tone dictionary spelling retained. Directional 来/去 retain dictionary tones unless explicitly reviewed; these drafts do not claim to transcribe colloquial recorded surface tones.',
                           'limitations': 'Structural alignment proves positional correspondence only. It does not establish independent native review, semantic correctness, source reading correctness, or recorded speech.',
                           'review_flags': 'Source conflicts and exposed character/word polyphony remain explicit; supporting dictionary disagreement alone is not proof that the official reading is wrong.'},
            'sources': sources + [{'path': path.as_posix(),
                                   'sha256': sha((ROOT / path).read_bytes() if path == TRANSCRIPTION
                                                 else (ROOT / path).read_bytes().replace(b'\r\n', b'\n')),
                                   **({} if path == TRANSCRIPTION else {'checksum_normalization': 'lf'})}
                                  for path in source_files],
            'validation': {'entries': len(entries), 'id_range': [5401, 11000],
                           'shared_aligner_passed': len(sentence_checks), 'shared_aligner_failed': len(failures),
                           'per_syllable_roundtrip_passed': len(entries), 'official_lexicon_rows': len(recorded),
                           'official_direct_split_passed': len(recorded) - len(unsplit),
                           'official_direct_split_failures': unsplit, 'token_methods': dict(stats),
                           'word_grouping_repairs': repairs, 'review_flag_counts': dict(flag_counts),
                           'sentences_with_review_flags': sum(bool(e['review_flags']) for e in entries),
                           'reviewed_character_contexts': sum(len(e.get('reviewed_character_contexts', [])) for e in entries),
                           'sentences_with_sandhi_adjustments': sum(bool(e['sandhi_adjustments']) for e in entries)},
            'target_supporting_dictionary_differences': target_differences,
            'known_word_supporting_dictionary_differences': word_differences,
            'entries': entries}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument('--write', action='store_true')
    action.add_argument('--check', action='store_true')
    parser.add_argument('--tools-dir', default=os.environ.get('HSK_PINYIN_TOOLS'))
    args = parser.parse_args()
    data = build(args.tools_dir)
    raw = encoded(data)
    if args.check:
        assert (ROOT / OUTPUT).read_bytes() == raw, 'Pinyin overlay differs; rebuild after reviewing source changes.'
    else:
        (ROOT / OUTPUT).write_bytes(raw)
    print(json.dumps({'action': 'checked' if args.check else 'wrote', 'path': OUTPUT.as_posix(),
                      'bytes': len(raw), 'sha256': sha(raw), 'validation': data['validation']}, ensure_ascii=False))


if __name__ == '__main__':
    main()

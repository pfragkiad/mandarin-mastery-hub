# Conversational Mandarin — deduplicated coverage audit v1.1.5

## Scope and outcome

- 16 source units; 17 conversational lessons (15 original plus telephone and newspaper scenarios).
- 296 distinct curated source vocabulary/expression candidates, after excluding unreliable ASR and narration fragments.
- 149 independent exact expression matches and 103 expressions present within longer utterances.
- 42 deliberately nonverbatim variants mapped to existing conversational patterns.
- 2 instructor narration items outside the learner conversation targets.
- **0 unclassified or demonstrably missing targets within this curated 296-item inventory.**
- This does **not** certify a complete line-by-line transcript or original-audio audit, nor native-speaker review.
- No additional lessons, exercises, or progress checkpoints were introduced in v1.1.2.

## Northern-style pronunciation note

Pronunciation: This course often uses northern-influenced 儿化 (érhuà), especially 一点儿 (yìdiǎnr), 哪儿 (nǎr), 这儿 (zhèr), 那儿 (nàr) and 一会儿 (yíhuìr). A small Northern-style -r marker identifies affected expressions. These are not exclusive to northern China; alternative forms vary by word and context. The ending -r is not an additional spoken syllable.

The sidecar `REGIONAL_EXPRESSION_MARKERS.json` provides per-expression stable IDs and machine-readable regional markers. The offline lesson HTML displays the marker; no new lesson JSON schema field was introduced.

## Learner-facing expression review

- 441 unique Chinese expressions, dialogue turns, grammar examples and keyed practice phrases indexed with durable `CMX-` IDs.
- 49 reviewed expressions contain an identified rhotic form.
- `CONVERSATIONAL_EXPRESSION_REVIEW.txt` includes ID, Hanzi, pinyin, English, lesson references and optional regional flag.
- `SOURCE_COVERAGE_CROSSWALK.txt` lists each of the 296 original distinct teachable candidates and its lesson mapping.

## Entries without verbatim matches (fully classified)

These are **not claimed to be exact lesson sentences**. They are accounted for as productive substitutions, compositional variations, or instructor narration.

| ID | Original expression | Classification | Lesson reference / reason |
|---|---|---|---|
| `CMX-A216875BBC48` | 你会说吗 (nǐ huì shuō ma) | `communicative_equivalent` | convm-speaking-languages: ability question with 吗 |
| `CMX-157CBEAB6CFE` | 对不起请问 (Duìbuqǐ, qǐngwèn.) | `polite_question_variant` | convm-greetings-politeness: Polite opening followed by a question, practised in several source contexts |
| `CMX-649A0CB5CB7F` | 请问你会说普通话吗 (qǐng wèn nǐ huì shuō pǔ tōng huà ma) | `polite_question_variant` | convm-greetings-politeness: Polite opening followed by a question, practised in several source contexts |
| `CMX-BCFDAB64303E` | 可是你普通话说得很好 (kě shì nǐ pǔ tōng huà shuō dé hěn hǎo) | `compositional_contrast` | convm-speaking-languages: 可是 contrast modelled in multiple practical responses |
| `CMX-39CE11BD86C8` | 可是我会说普通话 (kě shì wǒ huì shuō pǔ tōng huà) | `compositional_contrast` | convm-speaking-languages: 可是 contrast modelled in multiple practical responses |
| `CMX-0F86EC6A4240` | 请问你是中国人吗 (qǐng wèn nǐ shì zhōng guó rén ma) | `polite_question_variant` | convm-greetings-politeness: Polite opening followed by a question, practised in several source contexts |
| `CMX-FE09EC564B31` | 可是你会说普通话 (kě shì nǐ huì shuō pǔ tōng huà) | `compositional_contrast` | convm-speaking-languages: 可是 contrast modelled in multiple practical responses |
| `CMX-477705C08B4E` | 可是学院路在这儿 (kě shì xué yuàn lù zài zhè ér) | `compositional_contrast` | convm-speaking-languages: 可是 contrast modelled in multiple practical responses |
| `CMX-8F40872E5CF9` | 可是我知道 (kě shì wǒ zhī dào) | `compositional_contrast` | convm-speaking-languages: 可是 contrast modelled in multiple practical responses |
| `CMX-96CEC4EA5789` | 可是我想吃一点东西 (kě shì wǒ xiǎng chī yì diǎn dōng xī) | `compositional_contrast` | convm-speaking-languages: 可是 contrast modelled in multiple practical responses |
| `CMX-7FEC193D8E9D` | 可是我想喝一点东西 (kě shì wǒ xiǎng hē yì diǎn dōng xī) | `compositional_contrast` | convm-speaking-languages: 可是 contrast modelled in multiple practical responses |
| `CMX-544D495B5C89` | 我不想去你那儿 (wǒ bù xiǎng qù nǐ nà ér) | `communicative_equivalent` | convm-places-to-meet: refusing a suggested location |
| `CMX-E43D6B8F9E4D` | 你想什么时候喝 (nǐ xiǎng shén me shí hòu hē) | `communicative_equivalent` | convm-choices-alternatives: asking when and choosing now or later |
| `CMX-CB49DCC3792E` | 是八点钟吗 (shì bā diǎn zhōng ma) | `communicative_equivalent` | convm-clock-scheduling: confirming a proposed clock time |
| `CMX-4F4828D7A235` | 十一块人民币 (shí yī kuài rén mín bì) | `number_substitution` | convm-numbers-arithmetic: Productive number + 块 + 人民币 pattern, practised through prices |
| `CMX-3B3D41A15C0B` | 十三块人民币 (shí sān kuài rén mín bì) | `number_substitution` | convm-numbers-arithmetic: Productive number + 块 + 人民币 pattern, practised through prices |
| `CMX-DCDE5F95E6BA` | 两块人民币 (liǎng kuài rén mín bì) | `number_substitution` | convm-numbers-arithmetic: Productive number + 块 + 人民币 pattern, practised through prices |
| `CMX-2BBF30AEF4FB` | 六块人民币 (liù kuài rén mín bì) | `number_substitution` | convm-numbers-arithmetic: Productive number + 块 + 人民币 pattern, practised through prices |
| `CMX-E5BA7A370C8F` | 七块人民币 (qī kuài rén mín bì) | `number_substitution` | convm-numbers-arithmetic: Productive number + 块 + 人民币 pattern, practised through prices |
| `CMX-D736C7E45952` | 一次 (yí cì) | `instructor_narration` | Not a learner target: Narrative cue / named relationship, not a new learner task |
| `CMX-C75313BE8CFF` | 是今天吗 (shì jīn tiān ma) | `communicative_equivalent` | convm-today-tomorrow-later: confirming the day |
| `CMX-C628972F22A1` | 十五块人民币 (shí wǔ kuài rén mín bì) | `number_substitution` | convm-numbers-arithmetic: Productive number + 块 + 人民币 pattern, practised through prices |
| `CMX-7604BD60130E` | 十六块人民币 (shí liù kuài rén mín bì) | `number_substitution` | convm-numbers-arithmetic: Productive number + 块 + 人民币 pattern, practised through prices |
| `CMX-A245FC55ED9C` | 我想吃晚饭 (wǒ xiǎng chī wǎn fàn) | `communicative_equivalent` | convm-today-tomorrow-later: wanting dinner; inviting and accepting |
| `CMX-E7C5112578A7` | 你有人民币吗 (nǐ yǒu rén mín bì ma) | `communicative_equivalent` | convm-money-prices: asking whether someone has renminbi |
| `CMX-063DD75D5D56` | 你有没有美国报纸 (nǐ yǒu méi yǒu měi guó bào zhǐ) | `communicative_equivalent` | convm-newspaper-shopping: asking newspaper availability |
| `CMX-8E3B1F8C6558` | 请问你有没有美国报纸 (qǐng wèn nǐ yǒu méi yǒu měi guó bào zhǐ) | `polite_question_variant` | convm-greetings-politeness: Polite opening followed by a question, practised in several source contexts |
| `CMX-4B0009153C06` | 十四块人民币 (shí sì kuài rén mín bì) | `number_substitution` | convm-numbers-arithmetic: Productive number + 块 + 人民币 pattern, practised through prices |
| `CMX-B5E447633AA4` | 我没有美金 (wǒ méi yǒu měi jīn) | `communicative_equivalent` | convm-money-prices: negative currency possession |
| `CMX-C1EB0A782C39` | 可是我没有人民币 (kě shì wǒ méi yǒu rén mín bì) | `compositional_contrast` | convm-speaking-languages: 可是 contrast modelled in multiple practical responses |
| `CMX-F7DB96024B4F` | 我没有啤酒 (wǒ méi yǒu pí jiǔ) | `communicative_equivalent` | convm-choices-alternatives: negative availability and alternative drinks |
| `CMX-E8E8E6A7418C` | 你有没有美金 (nǐ yǒu méi yǒu měi jīn) | `communicative_equivalent` | convm-money-prices: availability of US dollars; 有没有 question taught |
| `CMX-56AD3419FFDE` | 太太 (tài tai) | `instructor_narration` | Not a learner target: Narrative cue / named relationship, not a new learner task |
| `CMX-79163BE712DA` | 十九块人民币 (shí jiǔ kuài rén mín bì) | `number_substitution` | convm-numbers-arithmetic: Productive number + 块 + 人民币 pattern, practised through prices |
| `CMX-31B30DA0453F` | 你有没有茶 (nǐ yǒu méi yǒu chá) | `communicative_equivalent` | convm-newspaper-shopping: 有没有 availability question, substitution of item |
| `CMX-C6CA65304E1F` | 我没有茶 (wǒ méi yǒu chá) | `communicative_equivalent` | convm-choices-alternatives: negative availability in a drink choice |
| `CMX-159100E0967A` | 可是我有啤酒 (kě shì wǒ yǒu pí jiǔ) | `compositional_contrast` | convm-speaking-languages: 可是 contrast modelled in multiple practical responses |
| `CMX-16F3E7A5BA5B` | 我有人民币 (wǒ yǒu rén mín bì) | `communicative_equivalent` | convm-money-prices: affirmative currency possession |
| `CMX-EB973353844B` | 你有没有啤酒 (nǐ yǒu méi yǒu pí jiǔ) | `communicative_equivalent` | convm-newspaper-shopping: 有没有 availability question, substitution of product |
| `CMX-FC5AD7699E3F` | 我有一点儿 (wǒ yǒu yì diǎn ér) | `communicative_equivalent` | convm-speaking-languages: one small amount: 一点儿, also possession with 有 |
| `CMX-9A7DD516464B` | 你可以吗 (nǐ kě yǐ ma) | `communicative_equivalent` | convm-permission-requests: permission / possibility |
| `CMX-91B8C2940F73` | 你要美金吗 (nǐ yào měi jīn ma) | `communicative_equivalent` | convm-money-prices: asking whether a currency is wanted, yes/no question |
| `CMX-78508FD411A2` | 你有没有钱 (nǐ yǒu méi yǒu qián) | `communicative_equivalent` | convm-permission-requests: 有没有 plus money/possession |

## Excluded transcript-study fragments (not counted among the 296)

The original automatic transcript contains narrator instructions, incomplete drill fragments and potentially unreliable ASR. The following were excluded from the distinct learner target inventory rather than silently treated as missing:

| Item | Reason |
|---|---|
| 不起 | partial word from repetition exercise |
| 这段 | narrator referring to a transcript segment |
| 对话 | narrator label rather than teachable target |
| 跟着 | narrator instruction follow along; not a target utterance |
| 诺 | uncertain recognition of response particle |
| 的 | ASR confuses 的 with complement 得 |
| 啊 | incidental filler in a pronunciation drill |
| 听 | instructor drill command rather than a lesson-specific target |
| 你是吗 | incomplete question without predicate |
| 你有吗 | incomplete question without object |
| 你有没有很多 | ungrammatical fragment without quantified object |
| 给我的 | context-free fragment; give-to-me action taught in complete exchange |
| 给你的 | context-free fragment; give-to-you action taught in complete exchange |
| 是我是美国人 | ASR concatenation; affirmative nationality modeled elsewhere |
| 我会说一点儿普通话 | semantically included; expression taught in original forms |

## Compatibility and validation

- This coverage study originated under Core v3.3.1/general schema v3.2.0. Current release uses **Core v3.4.0/general schema v3.3.0**; taxonomy v2.0.0 remains unchanged.
- All 15 original lesson IDs and 60 original practice-question IDs remain unchanged.
- All original checkpoint IDs/targets/flags and the first 15 curriculum placements remain unchanged.
- The two standalone character-lesson archives are byte-for-byte unchanged.
- No transcript text is embedded as external source commentary in learner-facing lessons; provenance remains in report files.
- This is an editorial semantic audit. The recordings and linguistic accuracy require independent listening/native-speaker verification.

## Editorial display patch v1.1.3

All 43 grammar cards now distinguish structural grammar from their audio-ready spoken example; 43 duplicated explanations were rewritten. Conversational source coverage classifications and expression IDs remain unchanged.

## v1.1.4 wording and export corrections

Historical note: v1.1.4 temporarily replaced five source-attested expressions. **Superseded by v1.1.5**: all five original phrases are restored with usage notes, and the source item again has an exact entry. The 296-target curated inventory is unchanged.

## v1.1.5 verified source wording / visual notes

Five expressions in v1.1.4 were silently rewritten despite being attested in the source. Their original Hanzi, pinyin and meanings have now been restored verbatim from the v1.1.3 expression release, and visible usage notes explain contextual emphasis or offer more neutral alternatives. One source crosswalk item returns from FUNCTIONAL_VARIANT to EXACT_ENTRY. The 296-item curated inventory and lessons' conversational scope remain unchanged.

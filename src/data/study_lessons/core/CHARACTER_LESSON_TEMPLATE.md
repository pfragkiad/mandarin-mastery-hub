---
schema: mandarin-character-lesson/2.6.0
lesson_id: char-<HEX_CODEPOINT>
title: <DESCRIPTIVE_LESSON_TITLE>
subtitle: <ONE_LINE_TOPIC_SUMMARY>
description: <FULL_LESSON_DESCRIPTION_EXPLAINING_SCOPE_AND_SKILLS>
primary_category_id: vocabulary-grammar-patterns
category_ids:
- vocabulary-grammar-patterns
tags: []
slug: lesson-topic
hanzi: <HANZI>
pinyin: <PINYIN>
hsk_3_level: null
---

# &lt;HANZI&gt; (&lt;PINYIN&gt;) — &lt;DESCRIPTIVE_LESSON_TITLE&gt;

**Category:** Vocabulary & Grammar Patterns  

**&lt;ONE_LINE_TOPIC_SUMMARY&gt;**

&lt;FULL_LESSON_DESCRIPTION_EXPLAINING_SCOPE_AND_SKILLS&gt;

**Lesson focus:** &lt;ONE_SENTENCE_LEARNER_FOCUS&gt;

**Core principle:** A character, morpheme, word, and construction are distinct linguistic units.

**Learning path:** &lt;RECOMMENDED_ORDER_OF_STUDY&gt;

## 1. At a glance

| Feature | Description |
| --- | --- |
| Character | **&lt;HANZI&gt; (&lt;PINYIN&gt;)** |
| Core takeaway | &lt;MAIN_TAKEAWAY&gt; |
| Independent usage | &lt;COMMON \| LIMITED \| FORMAL \| NONE&gt; |
| Modern functions | &lt;ROLE&gt; |
| Traditional form(s) | **&lt;TRADITIONAL&gt; (&lt;PINYIN&gt;)** |

### Main uses

| Reading | Function | Register | Example |
| --- | --- | --- | --- |
| &lt;PINYIN&gt; | &lt;FUNCTION&gt; | &lt;REGISTER&gt; | **&lt;WORD&gt; (&lt;PINYIN&gt;)** — &lt;MEANING&gt; |

&lt;EXPLANATION&gt;

## 2. Essential vocabulary and expressions

| Priority | Word and pinyin | Part of speech | Meaning | Register | Usage |
| --- | --- | --- | --- | --- | --- |
| A | **&lt;WORD&gt; (&lt;PINYIN&gt;)** | &lt;POS&gt; | &lt;MEANING&gt; | &lt;REGISTER&gt; | &lt;USAGE NOTE&gt; |

&lt;USAGE_OR_LEXICALIZATION_NOTES&gt;

## 3. Natural example sentences

### 1. &lt;USAGE_TITLE&gt;

**&lt;FULL_HANZI_SENTENCE&gt;**

*&lt;FULL_TONE_MARKED_PINYIN&gt;*

&lt;IDIOMATIC_ENGLISH&gt;

**Grammar:** &lt;TEACHING_NOTE&gt;

**Context:** &lt;CONTEXT&gt;

## 4. Common learner mistakes

| Mistake | Correct approach | Explanation |
| --- | --- | --- |
| &lt;MISCONCEPTION&gt; | &lt;BETTER_EXPLANATION&gt; | &lt;WHY&gt; |

## 5. Practice

### Question 1

&lt;CLEAR_MULTIPLE_CHOICE_PROMPT&gt;

- A. &lt;CORRECT_HANZI&gt; (&lt;CORRECT_PINYIN&gt;) — &lt;CORRECT_MEANING&gt;
- B. &lt;DISTRACTOR_HANZI&gt; (&lt;DISTRACTOR_PINYIN&gt;) — &lt;DISTRACTOR_MEANING&gt;

### Question 2

&lt;OPEN_ENDED_QUESTION&gt;

### Suggested answers

1. A. &lt;CORRECT_HANZI&gt; (&lt;CORRECT_PINYIN&gt;) — &lt;CORRECT_MEANING&gt; — &lt;WHY_A_IS_CORRECT&gt;
2. &lt;SUGGESTED_FREE_TEXT_ANSWER&gt; — &lt;WHY_THIS_ANSWER_IS_VALID&gt;

## Quiz authoring reference (template only)

For single-choice questions, use unique `choices[].id` values and the authoritative `correct_choice_ids` key. Do not store a duplicate `answer` string for selected choices. Open-ended questions instead use `choices: []`, `correct_choice_ids: []`, and an `answer` string.

```json
{
  "id": "q-next-time",
  "kind": "selection",
  "prompt": "Which expression means next time?",
  "choices": [
    {"id": "a", "hanzi": "下次", "pinyin": "xià cì", "meaning_en": "next time"},
    {"id": "b", "hanzi": "上次", "pinyin": "shàng cì", "meaning_en": "last time"}
  ],
  "correct_choice_ids": ["a"],
  "explanation": "下 (xià) indicates the following occasion."
}
```

A plain-text option can be `{"id":"a","text":"How many times?"}`. For a `multi_selection` question, provide two or more correct IDs. Every selected ID must match one of that question’s choices.

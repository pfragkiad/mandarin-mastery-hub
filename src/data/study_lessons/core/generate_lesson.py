#!/usr/bin/env python3
"""Mandarin Tutor: deterministic learner HTML/Markdown/ZIP generator.

Supported schemas: mandarin-character-lesson/3.0.0 and /3.1.0,
mandarin-topic-lesson/3.0.0, /3.1.0 and /3.2.0,
mandarin-general-lesson/3.0.0 and /3.1.0 (generic/grammar/dialogue/review).
The JSON is authoritative. Provenance lives exclusively in report.md.
No internet services, third-party fonts, or paid libraries are used.

CLI: python generate_lesson.py --lesson lesson.json --catalog-ids catalog_ids.json \
       --out-dir ./rendered --report ./report.md --zip
Dependencies for validation: jsonschema (same as validate_core.py).
"""
from __future__ import annotations
import argparse, html, json, re, unicodedata, zipfile
from collections import Counter
from pathlib import Path

HERE=Path(__file__).resolve().parent
FONT="'Kaiti SC','STKaiti','KaiTi','DFKai-SB','BiauKai','SimSun',serif"
CSS="""
:root{color-scheme:light;--ink:#172838;--navy:#172e43;--muted:#536776;--line:#d8e1e9;--mint:#e9f5f2;--bg:#f5f8fa;--paper:#fff;--accent:#177c78}
*{box-sizing:border-box}body{background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:0;line-height:1.65}
main{max-width:900px;margin:32px auto;padding:30px 38px;background:var(--paper);border:1px solid var(--line);border-radius:18px}
header{border-bottom:2px solid #c8dfd8;padding-bottom:18px;margin-bottom:22px}h1{font-size:2rem;color:var(--navy);margin:.2em 0}
h2{color:var(--navy);font-size:1.3rem;margin:1.5em 0 .6em;border-bottom:1px solid var(--line);padding-bottom:.3em}
h3{color:var(--navy);margin:1.1em 0 .3em}.muted,.pinyin,.caption{color:var(--muted)}.eyebrow{text-transform:uppercase;font-size:.73rem;letter-spacing:.14em;color:var(--accent);font-weight:750}
.hanzi,.hanzi-char{font-family:Kaiti SC,STKaiti,KaiTi,DFKai-SB,BiauKai,SimSun,serif}.hanzi{font-size:1.27em}.hanzi-char{cursor:default}
[data-catalog-id]{border-bottom:1px dotted #77b4a9}code{white-space:break-spaces;font-size:.88em}p{margin:.45em 0 1em}
.exchange{margin:11px 0;padding:12px 14px;border-left:3px solid #78a9bb;background:#f5f9fb;border-radius:0 9px 9px 0}.exchange p{margin:3px 0}.exchange .speaker{font-weight:700;color:var(--navy);font-size:.84em}.task{margin:12px 0;padding:15px;border:1px solid var(--line);border-radius:10px}.task .model{background:#f4faf8;padding:10px;border-radius:7px}.chip small{color:var(--muted)}.lesson-tip{border-left:3px solid #f1b85d;padding:12px;background:#fffaf1;border-radius:0 8px 8px 0}.smallbank{margin:12px 0;padding:10px;border:1px solid var(--line);border-radius:8px}.sectionlead{font-size:.93rem;color:var(--muted);margin-bottom:12px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:13px}.card{padding:15px;border:1px solid var(--line);border-radius:12px;background:#fff}.card h3{margin:0}.number{font-size:.77rem;color:var(--accent);font-weight:750}
.example{border-left:3px solid #96cabe;padding:7px 13px;margin:9px 0;background:#f6faf9;border-radius:0 8px 8px 0}.example p{margin:.25em 0}.note{font-size:.87rem;color:var(--muted)}
.term-head{display:flex;align-items:baseline;flex-wrap:wrap;gap:8px}.term-head .hanzi{font-size:1.55rem;font-weight:600}.term-head .pinyin{font-size:.9rem}
.chip{display:inline-block;background:var(--mint);border-radius:99px;padding:2px 9px;margin:2px 5px 2px 0;font-size:.77rem;color:#235b59}
.quiz{margin:10px 0;padding:14px 18px;border:1px solid var(--line);border-radius:11px}.answer{background:var(--mint);border-radius:7px;padding:8px 12px;margin-top:8px}details summary{cursor:pointer;font-weight:600;color:var(--accent)}.small{font-size:.84rem}
pre{overflow:auto;background:#f5f8fa;padding:12px;border-radius:9px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid var(--line);padding:8px;text-align:left;vertical-align:top}
@media(max-width:650px){main{margin:0;padding:18px;border:0;border-radius:0}.cards{grid-template-columns:1fr}}
@media print{body{background:white}main{border:0;margin:0;padding:0;max-width:none}details:not([open]) .answer{display:block}h2{break-after:avoid}.card,.example,.quiz{break-inside:avoid}}
"""

def js(x):return json.dumps(x,ensure_ascii=False,indent=2)
def chinese(ch):
    n=unicodedata.name(ch,'')
    return n.startswith('CJK UNIFIED IDEOGRAPH') or n.startswith('CJK COMPATIBILITY IDEOGRAPH')
def esc(x):return html.escape(str(x),quote=True)
def rich(x,refs):
    out=[]
    for ch in str(x):
        if chinese(ch):
            ident=refs.get(ch)
            out.append(f'<span class="hanzi-char" data-catalog-id="{esc(ident)}" title="Catalog: {esc(ident)}">{esc(ch)}</span>' if ident else f'<span class="hanzi-char">{esc(ch)}</span>')
        elif ch=='\n':out.append('<span class="nl"></span>\n')
        else:out.append(esc(ch))
    return ''.join(out)

def pair(hanzi,pinyin,refs,large=False):
    return f'<span class="hanzi">{rich(hanzi,refs)}</span> <span class="pinyin">({esc(pinyin)})</span>'
def ex_html(ex,refs):
    p=f'<div class="example"><p>{pair(ex["hanzi"],ex["pinyin"],refs)}</p><p>{esc(ex["english"])}</p>'
    if ex.get('teaching_note'):p+=f'<p class="note">{rich(ex["teaching_note"],refs)}</p>'
    return p+'</div>'
def question_html(q,refs):
    a=[f'<section class="quiz"><div class="small muted">{esc(q["kind"].replace("_"," ").title())}</div><p><b>{rich(q["prompt"],refs)}</b></p>']
    for c in q['choices']:
        label=c.get('text') or f'{c.get("hanzi", "")} ({c.get("pinyin", "")}) — {c.get("meaning_en", "")}'
        a.append(f'<p>{esc(c["id"])}. {rich(label,refs)}</p>')
    ids=q.get('correct_choice_ids',[])
    if ids:ans=', '.join(ids)
    else:ans=q.get('answer','Suggested answer not provided')
    a.append(f'<details><summary>Show answer</summary><div class="answer">{rich(ans,refs)}'+(f'<p>{rich(q.get("explanation",""),refs)}</p>' if q.get('explanation') else '')+'</div></details></section>')
    return ''.join(a)
def question_md(q):
    lines=[f'**{q["kind"].replace("_"," ").title()}:** {q["prompt"]}']
    for c in q['choices']:
        label=c.get('text') or f'{c.get("hanzi", "")} ({c.get("pinyin", "")}) — {c.get("meaning_en", "")}'
        lines.append(f'- {c["id"]}. {label}')
    ans=', '.join(q['correct_choice_ids']) if q.get('correct_choice_ids') else q.get('answer','')
    lines.append(f'**Answer:** {ans}. {q.get("explanation","")}')
    return '\n'.join(lines)
def example_md(ex):
    return '\n'.join([f'**{ex["hanzi"]}**',f'*{ex["pinyin"]}*',ex['english'],*( [f'**Usage:** {ex["teaching_note"]}'] if ex.get('teaching_note') else [])])

def header(data,refs):
    l=data['lesson'];cl=data.get('classification',{})
    tags=[t for t in cl.get('topic_ids',[])]+['#'+t for t in cl.get('tags',[])]
    label=' · '.join(tags)
    return f'<header><div class="eyebrow">Mandarin tutor · {esc(data["lesson_type"].replace("_"," "))}</div><h1>{rich(l["title"],refs)}</h1><p>{rich(l.get("subtitle",l["description"]),refs)}</p><p class="muted small">{esc(label)}</p></header>'


def render_topic_v31(data, refs):
    """Instruction first: never repeat the 2 existing example sentences from each word detail card."""
    s=data['sections'];t=s['teaching_plan'];old=s['practice']['questions']
    a=['<h2>Your goal</h2><ul>']
    m=[f'# {data["lesson"]["title"]}',data['lesson']['description'],'',
       '> A teaching lesson: contextual communication, grammar, guided production, reading and speaking. Word-detail cards hold the original two examples per entry.','',
       '## Your goal']
    for obj in data['learning_objectives']:
        a.append(f'<li>{rich(obj,refs)}</li>')
        m.append('- '+obj)
    a.append('</ul>')
    # Start with an independent dialogue rather than a vocabulary card.
    d=t['dialogue']
    a.append(f'<h2>1 · Conversation — {esc(d["title"])}</h2><p class="sectionlead">{rich(d["context_en"],refs)}</p>')
    m+=['','## 1. Conversation — '+d['title'],d['context_en']]
    for turn in d['turns']:
        a.append(f'<div class="exchange"><div class="speaker">{esc(turn["speaker"])}</div><p>{pair(turn["hanzi"],turn["pinyin"],refs)}</p><p>{esc(turn["english"])}</p></div>')
        m.append(f'**{turn["speaker"]}:** {turn["hanzi"]} ({turn["pinyin"]}) — {turn["english"]}')
    # Explicit taught usage patterns with *fresh* worked sentences.
    a.append('<h2>2 · How the language works</h2>')
    m+=['','## 2. How the language works']
    for pat in t['patterns']:
        a.append(f'<h3>{rich(pat["title"],refs)}</h3><p>{rich(pat["explanation_en"],refs)}</p><p class="chip">{rich(pat["formula_en"],refs)}</p>')
        m+=[f'### {pat["title"]}',pat['explanation_en'],'**Pattern:** '+pat['formula_en']]
        for e in pat['examples']:
            a.append(ex_html(e,refs));m.append(example_md(e))
    # Scaffolding with shown model and concealed substitutions.
    b=t['guided_building']
    a.append(f'<h2>3 · Build new sentences</h2><p class="sectionlead">{rich(b["instruction_en"],refs)}</p><div class="task"><b>Worked model</b>{ex_html(b["model"],refs)}</div>')
    m+=['','## 3. Build new sentences',b['instruction_en'],'**Worked model:** '+example_md(b['model'])]
    for j,sub in enumerate(b['substitutions'],1):
        a.append(f'<div class="task"><b>Change {j}: {esc(sub["cue_en"])}</b><details><summary>Reveal a model response</summary>{ex_html(sub["model_answer"],refs)}</details></div>')
        m+=['',f'**Change {j}: {sub["cue_en"]}**',f'*Model response:* {example_md(sub["model_answer"])}']
    # Contextual reading with comprehension rather than another sentence dump.
    r=t['reading']
    a.append(f'<h2>4 · Read for meaning — {rich(r["title"],refs)}</h2><p class="sectionlead">Read the passage, then answer in English or Mandarin.</p>')
    m+=['','## 4. Read for meaning — '+r['title']]
    for e in r['paragraphs']:
        a.append(ex_html(e,refs));m.append(example_md(e))
    for j,q in enumerate(r['questions'],1):
        a.append(f'<div class="task"><b>{j}. {esc(q["prompt_en"])}</b><details><summary>Show the answer</summary><p>{esc(q["answer_en"])}</p></details></div>')
        m.append(f'**Q{j}. {q["prompt_en"]}** Suggested answer: {q["answer_en"]}')
    # Practice spontaneous answer (not merely translating headwords).
    a.append('<h2>5 · Speak and personalize</h2><p class="sectionlead">Answer aloud before opening the model. Adapt each reply to your own life.</p>')
    m+=['','## 5. Speak and personalize','Try to answer aloud before checking the sample; adapt it to your own situation.']
    for j,sp in enumerate(t['speaking_tasks'],1):
        a.append(f'<div class="task"><b>{j}. {rich(sp["scenario_en"],refs)}</b><details><summary>Show one possible response</summary>{ex_html(sp["model_answer"],refs)}</details></div>')
        m+=['',f'**Speaking {j}:** '+sp['scenario_en'],'*Possible response:* '+example_md(sp['model_answer'])]
    a.append('<h2>6 · Watch out</h2><div class="lesson-tip">'+rich(t['common_pitfall'],refs)+'</div>')
    a.append('<h3>Pronunciation clinic</h3><p>'+rich(t['pronunciation_focus'],refs)+'</p>')
    m+=['','## 6. Watch out',t['common_pitfall'],'**Pronunciation:** '+t['pronunciation_focus']]
    # Applied checks first; preserve old headword recall as an optional appendix.
    applied=[q for q in old if q['id'].startswith('applied-')]
    recall=[q for q in old if not q['id'].startswith('applied-')]
    a.append('<h2>7 · Check what you can do</h2>')
    m+=['','## 7. Check what you can do']
    for q in applied:a.append(question_html(q,refs));m+=['',question_md(q)]
    a.append('<h2>Review and next step</h2><ul>')
    m+=['','## Review and next step']
    for text in t['review']['can_do']:
        a.append(f'<li>{rich(text,refs)}</li>');m.append('- '+text)
    a.append('</ul>')
    # A compact word bank with stable data links; no source sentences duplicated.
    a.append('<details class="smallbank"><summary>Reference word bank (already in vocabulary detail cards)</summary><div class="cards">')
    m+=['','## Reference word bank (details on vocabulary cards)']
    for v in s['vocabulary']['items']:
        ref=v.get('syllabus_refs',[]);sid=ref[0].get('entry_id') if ref else None
        a.append(f'<div class="card" data-syllabus-entry-id="{esc(sid if sid else "")}"><span class="small muted">{esc("HSK #"+str(sid) if sid else "Review")}</span><p>{pair(v["hanzi"],v["pinyin"],refs)} — {esc(v["meaning_en"])}</p></div>')
        m.append(f'- {v["hanzi"]} ({v["pinyin"]}) — {v["meaning_en"]} [HSK entry {sid}]')
    a.append('</div></details>')
    if recall:
        a.append('<details class="smallbank"><summary>Optional vocabulary recall quiz</summary>')
        m+=['','## Optional vocabulary recall quiz']
        for q in recall:a.append(question_html(q,refs));m+=['',question_md(q)]
        a.append('</details>')
    return ''.join(a),'\n\n'.join(x for x in m if x!='')+'\n'

def render_topic(data,refs):
    if data['schema_version'] in ('mandarin-topic-lesson/3.1.0', 'mandarin-topic-lesson/3.2.0'):
        return render_topic_v31(data,refs)
    sec=data['sections']; a=['<h2>Learning objectives</h2><ul>']
    for obj in data['learning_objectives']:a.append(f'<li>{rich(obj,refs)}</li>')
    a.append('</ul><h2>Overview</h2>')
    a.append(f'<p>{rich(sec["overview"]["topic_description"],refs)}</p><p>{rich(sec["overview"]["focus"],refs)}</p>')
    a.append('<h2>Vocabulary and examples</h2><div class="cards">')
    for v in sec['vocabulary']['items']:
        ref=v.get('syllabus_refs',[]);sid=ref[0].get('entry_id') if ref else None
        a.append(f'<article class="card"><div class="number">{esc("HSK entry "+str(sid) if sid else v["learning_role"].title())}</div>')
        a.append(f'<div class="term-head">{pair(v["hanzi"],v["pinyin"],refs)}</div>')
        a.append(f'<p>{esc(v["meaning_en"])}</p>')
        a.append(f'<div class="small muted">{esc(v["primary_pos_id"])} · {esc(v["learning_role"])}</div>')
        for ex in v['examples']:a.append(ex_html(ex,refs))
        if v.get('pos_note'):a.append(f'<p class="note">{rich(v["pos_note"],refs)}</p>')
        a.append('</article>')
    a.append('</div>')
    if sec.get('grammar_points'):
        a.append('<h2>Usage and grammar</h2>')
        exmap={e['id']:e for v in sec['vocabulary']['items'] for e in v['examples']}
        for g in sec['grammar_points']:
            a.append(f'<h3>{rich(g["title"],refs)}</h3><p>{rich(g["explanation"],refs)}</p>')
            if g['example_id'] in exmap:a.append(ex_html(exmap[g['example_id']],refs))
    if sec['vocabulary'].get('related_entries'):
        a.append('<h2>Related vocabulary</h2><p>')
        for v in sec['vocabulary']['related_entries']:
            a.append(f'<span class="chip">{pair(v["hanzi"],v["pinyin"],refs)} — {esc(v["meaning_en"])}</span> ')
        a.append('</p>')
    if sec['practice']['enabled']:
        a.append('<h2>Practice</h2>')
        for q in sec['practice']['questions']:a.append(question_html(q,refs))
    m=[f'# {data["lesson"]["title"]}',data['lesson']['description'],'',f'**Topics:** {", ".join(data["classification"]["topic_ids"])}','', '## Learning objectives']
    for o in data['learning_objectives']:m.append('- '+o)
    m+=['','## Overview',sec['overview']['topic_description'],sec['overview']['focus'],'','## Vocabulary and examples']
    for v in sec['vocabulary']['items']:
        ref=v.get('syllabus_refs',[]);sid=ref[0].get('entry_id') if ref else '—'
        m += [f'### {v["hanzi"]} ({v["pinyin"]}) — {v["meaning_en"]}',f'HSK entry: {sid} · POS: {v["primary_pos_id"]} · {v["learning_role"]}']
        for ex in v['examples']:m+=['',example_md(ex)]
        if v.get('pos_note'):m+=['',v['pos_note']]
    if sec.get('grammar_points'):
        m+=['','## Usage and grammar']
        for g in sec['grammar_points']:m+=[f'### {g["title"]}',g['explanation']]
    if sec['vocabulary'].get('related_entries'):
        m+=['','## Related vocabulary']
        for v in sec['vocabulary']['related_entries']:m+=['- '+v['hanzi']+' ('+v['pinyin']+') — '+v['meaning_en']]
    if sec['practice']['enabled']:
        m+=['','## Practice']
        for q in sec['practice']['questions']:m+=['',question_md(q)]
    return ''.join(a),'\n\n'.join(x for x in m if x!='')+'\n'

def extension_block_html(block,refs):
    kind=block['kind']
    if kind=='table':
        headers=block.get('headers',[])
        rows=block.get('rows',[])
        return ('<table><thead><tr>'+''.join(f'<th>{rich(k,refs)}</th>' for k in headers)+'</tr></thead><tbody>'+
                ''.join('<tr>'+''.join(f'<td>{rich(cell,refs)}</td>' for cell in row)+'</tr>' for row in rows)+'</tbody></table>')
    if kind=='list':return '<ul>'+''.join(f'<li>{rich(v,refs)}</li>' for v in block['items'])+'</ul>'
    if kind=='paragraph':return f'<p>{rich(block["text"],refs)}</p>'
    if kind=='term':return f'<p>{pair(block["hanzi"],block["pinyin"],refs)} — {rich(block["meaning_en"],refs)}. {rich(block["note"],refs)}</p>'
    if kind=='example':return ex_html({'hanzi':block['hanzi'],'pinyin':block['pinyin'],'english':block['english'],'teaching_note':block['usage_note']},refs)
    if kind=='unclassified':return f'<p>{rich(block["raw_content"],refs)}</p>'
    raise ValueError('Unsupported extension block: '+kind)

def extension_block_md(block):
    kind=block['kind']
    if kind=='table':
        rows=[block['headers']]+block['rows']
        safe=lambda s:str(s).replace('|','\\|').replace('\n',' ')
        return '\n'.join(['| '+' | '.join(map(safe,rows[0]))+' |',
                          '| '+' | '.join('---' for _ in rows[0])+' |']+
                         ['| '+' | '.join(map(safe,row))+' |' for row in rows[1:]])
    if kind=='list':return '\n'.join('- '+str(item) for item in block['items'])
    if kind=='paragraph':return block['text']
    if kind=='term':return f'{block["hanzi"]} ({block["pinyin"]}) — {block["meaning_en"]}. {block["note"]}'
    if kind=='example':return f'{block["hanzi"]} ({block["pinyin"]}) — {block["english"]}. {block["usage_note"]}'
    if kind=='unclassified':return block['raw_content']
    raise ValueError('Unsupported extension block: '+kind)

def render_character(data,refs):
    s=data['sections']; a=['<h2>At a glance</h2>']
    a +=[f'<p class="term-head">{pair(data["headword"]["hanzi"],data["headword"]["pinyin"],refs)}</p>',f'<p>{rich(s["overview"]["core_takeaway"],refs)}</p>']
    a += ['<h2>Meaning and use</h2>',f'<p>{rich(s["overview"]["one_minute_explanation"],refs)}</p>']
    for meaning in s['overview']['meaning_map']:
        ex=meaning['example']; e=pair(ex.get('hanzi',''),ex.get('pinyin',''),refs) if ex else ''
        a += [f'<div class="card"><b>{rich(meaning["function_en"],refs)}</b><p>{e} — {esc(ex.get("meaning_en", "") if ex else "")}</p></div>']
    a+=['<h2>Essential words and expressions</h2><div class="cards">']
    for v in s['vocabulary']['items']:
        a.append(f'<article class="card"><div class="term-head">{pair(v["hanzi"],v["pinyin"],refs)}</div>')
        a.append(f'<p>{esc(v["meaning_en"])}</p><div class="small muted">{esc(v["part_of_speech"])} · priority {esc(v["priority"])}</div>')
        if v.get('usage_note'):a.append(f'<p class="note">{rich(v["usage_note"],refs)}</p>')
        a.append('</article>')
    a+=['</div>']
    if s['constructions']['enabled'] and s['constructions']['items']:
        a+=['<h2>Common constructions</h2>']
        for c in s['constructions']['items']:
            a.append(f'<article class="card"><b>{pair(c["pattern_hanzi"],c["pattern_pinyin"],refs)}</b><p>{rich(c["function_en"],refs)}</p>')
            a.append(f'<p>{pair(c["example"]["hanzi"],c["example"]["pinyin"],refs)} — {esc(c["example"].get("meaning_en",""))}</p><p class="note">{rich(c["usage_note"],refs)}</p></article>')
    a+=['<h2>Natural examples</h2>']
    for ex in s['examples']['items']:
        a.append(f'<h3>{esc(ex["title"])}</h3>{ex_html(ex,refs)}')
    if s['contrasts']['items']:
        a+=['<h2>Meaning contrasts</h2>']
        for c in s['contrasts']['items']:
            a.append(f'<div class="card"><p>{pair(c["hanzi"],c["pinyin"],refs)} — {esc(c["meaning_en"])}</p>')
            a.append(f'<p>{pair(c["example"]["hanzi"],c["example"]["pinyin"],refs)}</p><p>{rich(c["usage"],refs)}</p><p class="note">{rich(c["limitation"],refs)}</p></div>')
    if s['mistakes']['items']:
        a+=['<h2>Common mistakes</h2>']
        for v in s['mistakes']['items']:
            a.append(f'<div class="card"><p><b>{rich(v["incorrect_inference"],refs)}</b></p><p>{rich(v["correction"],refs)}</p><p class="note">{rich(v["reason"],refs)}</p></div>')
    if s['historical']['enabled'] and s['historical']['items']:
        a+=['<h2>Historical context</h2>']
        for v in s['historical']['items']:
            a.append(f'<p>{pair(v["hanzi"],v["pinyin"],refs)} — {esc(v["translation_en"])}. {rich(v["explanation"],refs)}</p>')
    learner_extensions=[e for e in s['extensions']['items'] if e.get('visibility')=='learner']
    if learner_extensions:
        a+=['<h2>Additional learning material</h2>']
        for ext in learner_extensions:
            a.append(f'<h3>{rich(ext["title"],refs)}</h3>')
            for block in ext['blocks']:a.append(extension_block_html(block,refs))
    if s['practice']['enabled']:
        a+=['<h2>Practice</h2>']
        for q in s['practice']['questions']:a.append(question_html(q,refs))
    m=[f'# {data["headword"]["hanzi"]} ({data["headword"]["pinyin"]}) — {data["lesson"]["title"]}',data['lesson']['description'],f'**Topics:** {", ".join(data["classification"]["topic_ids"])}', '## Lesson focus',data['intro']['lesson_focus'],'## At a glance',s['overview']['core_takeaway'],s['overview']['one_minute_explanation'],'## Essential words and expressions']
    for v in s['vocabulary']['items']:m+=[f'### {v["hanzi"]} ({v["pinyin"]}) — {v["meaning_en"]}',v.get('usage_note','')]
    if s['constructions']['enabled'] and s['constructions']['items']:
        m+=['## Common constructions']
        for c in s['constructions']['items']:m +=[f'### {c["pattern_hanzi"]} ({c["pattern_pinyin"]})',c['function_en'],f'{c["example"]["hanzi"]} ({c["example"]["pinyin"]}) — {c["example"].get("meaning_en","")}',c['usage_note']]
    m+=['## Natural examples']
    for ex in s['examples']['items']:m +=[f'### {ex["title"]}',example_md(ex)]
    if s['contrasts']['items']:
        m+=['## Meaning contrasts']
        for c in s['contrasts']['items']:m += [f'### {c["hanzi"]} ({c["pinyin"]}) — {c["meaning_en"]}',c['usage'],c['limitation']]
    if s['mistakes']['items']:
        m+=['## Common mistakes']
        for x in s['mistakes']['items']:m += [f'**Misconception:** {x["incorrect_inference"]}',f'**Correct:** {x["correction"]}',x['reason']]
    if s['historical']['enabled'] and s['historical']['items']:
        m+=['## Historical context']
        for v in s['historical']['items']:
            m += [f'{v["hanzi"]} ({v["pinyin"]}) — {v["translation_en"]}',v['explanation']]
    if learner_extensions:
        m+=['## Additional learning material']
        for ext in learner_extensions:
            m+=['### '+ext['title']]
            for block in ext['blocks']:m.append(extension_block_md(block))
    if s['practice']['enabled']:
        m+=['## Practice']
        for q in s['practice']['questions']:m +=[question_md(q)]
    return '\n'.join(a),'\n\n'.join(z for z in m if z)+'\n'

def render_general(data,refs):
    a=['<h2>Learning objectives</h2><ul>']
    for ob in data['learning_objectives']:a.append(f'<li>{rich(ob,refs)}</li>')
    a.append('</ul>')
    m=['# '+data['lesson']['title'],data['lesson']['description'],'## Learning objectives',*['- '+v for v in data['learning_objectives']]]
    for block in data['sections']['blocks']:
        name=block.get('title') or block.get('kind','Lesson section').replace('_',' ').title()
        a.append(f'<h2>{rich(name,refs)}</h2>');m.append('## '+name)
        if block.get('text'):
            a.append(f'<p>{rich(block["text"],refs)}</p>');m.append(block['text'])
        for turn in block.get('turns',[]):
            speaker=turn.get('speaker','Speaker')
            a.append(f'<p><b>{esc(speaker)}:</b> {pair(turn["hanzi"],turn["pinyin"],refs)} — {esc(turn["english"])}</p>')
            m.append(f'**{speaker}:** {turn["hanzi"]} ({turn["pinyin"]}) — {turn["english"]}')
        for it in block.get('items',[]):
            if isinstance(it,str):a.append(f'<p>{rich(it,refs)}</p>');m.append(it)
            elif isinstance(it,dict):
                h=it.get('hanzi');p=it.get('pinyin');eng=it.get('english') or it.get('meaning_en') or ''
                if h and p:a.append(f'<p>{pair(h,p,refs)} — {esc(eng)}</p>');m.append(f'{h} ({p}) — {eng}')
                else:
                    a.append(f'<p>{rich(it.get("text",str(it)),refs)}</p>');m.append(it.get('text',str(it)))
    if data['sections']['practice']['enabled']:
        a.append('<h2>Practice</h2>');m.append('## Practice')
        for q in data['sections']['practice']['questions']:a.append(question_html(q,refs));m.append(question_md(q))
    return ''.join(a),'\n\n'.join(m)+'\n'

def render_lesson(data):
    refs=data.get('catalog_character_refs',{})
    t=data['lesson_type']
    if t=='topic_vocabulary':body,md=render_topic(data,refs)
    elif t=='character_usage':body,md=render_character(data,refs)
    else:body,md=render_general(data,refs)
    html_doc='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(data['lesson']['title'])+'</title><style>'+CSS+'</style></head><body><main>'+header(data,refs)+body+'</main></body></html>\n'
    return html_doc,md

def validate_lesson(data,catalog=None):
    # Validate via the same contracts distributed with the core ZIP.
    from validate_core import checks_lesson
    checks_lesson(data,catalog)
    if catalog is not None:
        # Stronger check than JSON Schema: don't carry unused/wrong refs.
        for char,ident in data['catalog_character_refs'].items():
            if catalog.get(char)!=ident:raise ValueError('Wrong character mapping '+char)

def write_package(data, out_dir, report, catalog=None, make_zip=True, name=None):
    validate_lesson(data,catalog)
    out_dir=Path(out_dir);out_dir.mkdir(parents=True,exist_ok=True)
    if name is None:
        if data['lesson_type']=='character_usage':name='CHARACTER_LESSON_'+data['headword']['hanzi'].upper()
        else:name='TOPIC_LESSON_'+data['lesson_id'].replace('-','_').upper()
    h,m=render_lesson(data)
    paths={'json':out_dir/(name+'.json'),'html':out_dir/(name+'.html'),'md':out_dir/(name+'.md'),'report':out_dir/'report.md'}
    paths['json'].write_text(js(data)+'\n','utf-8')
    paths['html'].write_text(h,'utf-8')
    paths['md'].write_text(m,'utf-8')
    paths['report'].write_text(report.rstrip()+'\n','utf-8')
    if make_zip:
        zp=out_dir.parent/(name+'.zip')
        with zipfile.ZipFile(zp,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
            for path in paths.values():z.write(path,path.name)
        with zipfile.ZipFile(zp) as z:
            assert z.testzip() is None
            assert len(z.namelist())==4
        return zp
    return paths

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--lesson',required=True,type=Path);ap.add_argument('--catalog-ids',type=Path)
    ap.add_argument('--out-dir',type=Path,required=True);ap.add_argument('--report',type=Path)
    ap.add_argument('--zip',action='store_true');ap.add_argument('--name')
    args=ap.parse_args()
    data=json.loads(args.lesson.read_text('utf-8'))
    catalog=json.loads(args.catalog_ids.read_text('utf-8'))['characters'] if args.catalog_ids else None
    rep=args.report.read_text('utf-8') if args.report else '# Report\n\nNo source-specific report supplied.'
    print(write_package(data,args.out_dir,rep,catalog,args.zip,args.name))
if __name__=='__main__':main()

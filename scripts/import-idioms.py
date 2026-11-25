#!/usr/bin/env python3
"""Generate the lazy-loaded browser idiom sidecar (public/data/idioms.json)
from the owner-supplied idiom handoff in importer/data/idioms/.

Usage:
  python3 scripts/import-idioms.py --write
  python3 scripts/import-idioms.py --check
"""
import argparse
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "importer" / "data" / "idioms"
TSV_PATH = SRC_DIR / "chengyu_all8519_english_review.tsv"
CUM_PATH = SRC_DIR / "chengyu_cumulative_all8519.json"
CLASSES_PATH = SRC_DIR / "chengyu_rank_classes.json"
TOPICS_PATH = SRC_DIR / "chengyu_all8519_topic_classification.json"
OUT_PATH = ROOT / "public" / "data" / "idioms.json"


def build_payload() -> dict:
    with CLASSES_PATH.open("r", encoding="utf-8") as f:
        raw_classes = json.load(f)

    rank_classes = []
    for band in raw_classes["rank_classes"]:
        r_from = int(band["rank_from"])
        r_to = int(band["rank_to"])
        label = f"Top {r_to}" if r_from == 1 else f"{r_from:,}–{r_to:,}"
        rank_classes.append({
            "id": f"{r_from}-{r_to}",
            "label": label,
            "from": r_from,
            "to": r_to,
            "bandCoveragePct": round(float(band["band_coverage_pct"]), 2),
            "cumulativePct": round(float(band["cumulative_frequency_pct"]), 2),
        })

    with CUM_PATH.open("r", encoding="utf-8") as f:
        cum_data = json.load(f)
    cum_by_rank = {int(e["frequency_rank"]): e for e in cum_data["entries"]}

    with TOPICS_PATH.open("r", encoding="utf-8") as f:
        topics_data = json.load(f)
    topic_label_by_id = {t["id"]: t["label"] for t in topics_data["taxonomy"]["topics"]}
    topics_by_id: dict[str, tuple[str | None, list[str]]] = {}
    for te in topics_data["entries"]:
        primary_id = te.get("primaryTopicId")
        primary_label = topic_label_by_id.get(primary_id) if primary_id else None
        labels = [topic_label_by_id[tid] for tid in (te.get("topicIds") or []) if tid in topic_label_by_id]
        topics_by_id[str(te["id"])] = (primary_label, labels)

    entries = []
    with TSV_PATH.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            rank = int(row["frequency_rank"])
            cum = cum_by_rank.get(rank)
            primary_topic, all_topics = topics_by_id.get(str(row["id"]), (None, []))
            entry: dict = {
                "id": f"idiom-{row['id']}",
                "rank": rank,
                "hanzi": row["simplified"].strip(),
                "pinyin": row["pinyin"].strip(),
                "meaning": row["meaning_en"].strip(),
            }
            trad = row.get("traditional", "").strip()
            if trad and trad != entry["hanzi"]:
                entry["traditional"] = trad
            if cum:
                entry["score"] = round(float(cum["frequency_score"]), 2)
                entry["docFreq"] = int(cum["document_frequency"])
                entry["cumPct"] = round(float(cum["cumulative_frequency_pct"]), 2)
            if primary_topic:
                entry["topic"] = primary_topic
            if len(all_topics) > 1:
                entry["topics"] = all_topics
            entries.append(entry)

    entries.sort(key=lambda e: e["rank"])
    return {
        "schemaVersion": 1,
        "source": "THUOCL chengyu frequency list; unreviewed English glosses from CC-CEDICT, Wiktionary, PETCI, and assistant drafts.",
        "total": len(entries),
        "rankClasses": rank_classes,
        "entries": entries,
    }


def serialize(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--write", action="store_true")
    group.add_argument("--check", action="store_true")
    args = parser.parse_args()

    payload = build_payload()
    rendered = serialize(payload)

    if args.write:
        OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        OUT_PATH.write_text(rendered, encoding="utf-8")
        print(f"Wrote {OUT_PATH.relative_to(ROOT)} ({payload['total']} idioms, {len(rendered.encode('utf-8')) / 1024:.1f} KB)")
        return 0

    if not OUT_PATH.exists():
        print(f"Missing {OUT_PATH.relative_to(ROOT)}; run with --write", file=sys.stderr)
        return 1
    existing = OUT_PATH.read_text(encoding="utf-8")
    if existing != rendered:
        print(f"Out of date: {OUT_PATH.relative_to(ROOT)}; run with --write", file=sys.stderr)
        return 1
    print(f"OK: {OUT_PATH.relative_to(ROOT)} ({payload['total']} idioms)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
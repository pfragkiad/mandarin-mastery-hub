"""Builds public/data/usage-order.json from the supplied usage-order export (Jun Da Modern
frequency list + derived component/radical exposure). Usage: python3 scripts/import-usage-order.py <usage-order dir>"""
import json, sys, pathlib
root = pathlib.Path(sys.argv[1])
out = {"schemaVersion": 1, "scopes": {}}
for scope, key in (("all-forms", "all"), ("non-traditional", "simplified")):
    load = lambda k: json.load(open(root / scope / f"{k}.json"))
    chars, comps, rads = load("characters"), load("components"), load("radicals")
    out["source"] = {k: chars["source"][k] for k in ("provider", "version", "sourceUrl", "license")}
    out["method"] = comps["methodology"]["status"]
    out["scopes"][key] = {
        "characters": {r["glyph"]: r["frequency"]["sourceRank"] for r in chars["records"] if r.get("frequency")},
        "components": {r["glyph"]: r["derivedRank"] for r in comps["records"] if r["derivedRank"]},
        "radicals": {str(r["radicalNumber"]): r["derivedRank"] for r in rads["records"] if r["derivedRank"]},
    }
json.dump(out, open("public/data/usage-order.json", "w"), ensure_ascii=False, separators=(",", ":"))

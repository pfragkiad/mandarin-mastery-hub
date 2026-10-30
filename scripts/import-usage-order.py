"""Builds public/data/usage-order.json from the supplied usage-order export (Jun Da Modern
frequency list + derived component/radical exposure). Usage: python3 scripts/import-usage-order.py <usage-order dir> [component-classes dir]"""
import json, sys, pathlib
root = pathlib.Path(sys.argv[1])
component_root = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else None
out = {"schemaVersion": 2, "scopes": {}}
for scope, key in (("all-forms", "all"), ("non-traditional", "simplified")):
    load = lambda k: json.load(open(root / scope / f"{k}.json"))
    chars, comps, rads = load("characters"), load("components"), load("radicals")
    classes = None
    if component_root:
        comps = json.load(open(component_root / scope / "components.json"))
        classes = json.load(open(component_root / scope / "classes.json"))
    out["source"] = {k: chars["source"][k] for k in ("provider", "version", "sourceUrl", "license")}
    out["method"] = comps.get("structuralMethodology", comps["methodology"])["status"]
    out["scopes"][key] = {
        "characters": {r["glyph"]: r["frequency"]["sourceRank"] for r in chars["records"] if r.get("frequency")},
        "components": {r["glyph"]: r["derivedRank"] for r in comps["records"] if r["derivedRank"]},
        "radicals": {str(r["radicalNumber"]): r["derivedRank"] for r in rads["records"] if r["derivedRank"]},
        "cumulative": {
            "characters": {r["glyph"]: r["frequency"]["cumulativePercent"] for r in chars["records"] if r.get("frequency")},
            "components": {r["glyph"]: r["cumulativeExposurePercent"] for r in comps["records"] if r.get("cumulativeExposurePercent") is not None},
        },
        "groupCumulative": {
            "characters": {
                f"{lo}-{hi}": sum(r["frequency"]["count"] for r in chars["records"] if r.get("frequency") and r["frequency"]["sourceRank"] <= hi) / chars["source"]["corpusTotal"] * 100
                for lo, hi in ((1, 100), (101, 300), (301, 500), (501, 1000), (1001, 2000), (2001, 3500), (3501, 5000), (5001, 9933))
            },
            "components": {f'{b["minRank"]}-{b["maxRank"] if b["maxRank"] is not None else "plus"}': b["cumulativeExposurePercent"] for b in classes["bins"]} if classes else {},
        },
    }
json.dump(out, open("public/data/usage-order.json", "w"), ensure_ascii=False, separators=(",", ":"))

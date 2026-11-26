#!/usr/bin/env python3
"""Weekly credibility audit for Food, Afters, Chill spots, markets and deals. Writes credibility.json (shown to the
owner under You -> Owner). Reads only the repo's own data files; no network, no cost.

How a spot is scored (0-1, shown as /10). The same formula every week, so the trend means something:
  hours 35%     Google-confirmed in the last 30 days 1.0 · listed, sources agree 0.7 · sources disagree ("usually") 0.4 · none 0
  location 25%  a named map feature or building 1.0 · an exact street address 0.9 · rough truck area 0.7 (≤0.15 mi) / 0.5
                · a street-level point 0.6
  price 20%     Google diners' price 1.0 · a price typed for that place 0.6 · the category's typical price 0.4
                (free spots like beaches skip price; the other parts are re-weighted)
  fresh 20%     last checked ≤14 days 1.0 · ≤30 0.8 · ≤60 0.5 · older or never 0.3 (0.3 too once Google couldn't match it)
Markets: day and time listed 40% · checked ≤30 days 40% (≤60 half) · exact pin 20%.
Deals: share re-checked in the last 30 days.
Keep FOOD in sync with GRP in night.js (categories that count as food)."""
import json, sys, datetime

TODAY = datetime.date.today()
FOOD = {"burger", "sushi", "dimsum", "thai", "pizza", "dessert", "hall", "boil", "hotpot", "hibachi", "fine", "truck",
        "kbbq", "ramen", "tacos", "pho", "korean", "diner"}
CHILL = {"beach", "stars"}
FREE = CHILL
POINT = {"amenity", "tourism", "leisure", "shop", "building", "office", "manual"}

def days(s):
    try: return (TODAY - datetime.date.fromisoformat(s)).days
    except Exception: return None

def fresh_of(d):
    if d is None: return 0.3
    return 1.0 if d <= 14 else 0.8 if d <= 30 else 0.5 if d <= 60 else 0.3

def spot(p):
    d = days(p.get("hu"))
    if p.get("h") and p.get("hs") == "g" and d is not None and d <= 30: h, hw = 1.0, None
    elif p.get("h") and not p.get("hq"): h, hw = 0.7, None
    elif p.get("h"): h, hw = 0.4, "hours: sources disagree"
    else: h, hw = 0.0, "no hours"
    area = p.get("area")
    if area: l, lw = (0.7, None) if (area.get("r") or 1) <= 0.15 else (0.5, "rough area")
    elif p.get("geo") in POINT: l, lw = 1.0, None
    elif p.get("geo") in ("place", "osm"): l, lw = 0.9, None
    else: l, lw = 0.6, "street-level pin"
    f = fresh_of(d)
    if p.get("gmiss"): f = min(f, 0.3)
    fw = "never checked" if d is None else (f"not re-checked in {d} days" if d > 30 else None)
    if p.get("gmiss"): fw = "Google couldn't match it"
    parts = [(0.35, h), (0.25, l), (0.20, f)]
    pw = None
    if p.get("c") not in FREE:
        pr = 1.0 if p.get("gp") else 0.6 if p.get("pp") else 0.4
        if pr < 1: pw = "typical price only"
        parts.append((0.20, pr))
    s = sum(w * v for w, v in parts) / sum(w for w, _ in parts)
    why = [x for x in (hw, lw, fw, pw) if x]
    return s, {"hours": h, "location": l, "fresh": f, "price": parts[3][1] if len(parts) > 3 else None}, why

def summary(ps):
    if not ps: return None
    rows = [(p,) + spot(p) for p in ps]
    sub = {}
    for k in ("hours", "location", "price", "fresh"):
        vals = [r[2][k] for r in rows if r[2][k] is not None]
        sub[k] = round(10 * sum(vals) / len(vals), 1) if vals else None
    gp = sum(1 for p in ps if p.get("gp"))
    hg = sum(1 for p in ps if p.get("hs") == "g" and p.get("h"))
    return {"score": round(10 * sum(r[1] for r in rows) / len(rows), 1), "n": len(ps), "sub": sub,
            "googleHours": round(100 * hg / len(ps)), "googlePrice": round(100 * gp / len(ps)),
            "noHours": sum(1 for p in ps if not p.get("h"))}, rows

def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else "credibility.json"
    A = [p for p in json.load(open("afters.json"))["places"] if not p.get("gone")]
    groups = {
        "Food": [p for p in A if p["c"] in FOOD and p["c"] != "truck"],
        "Food trucks": [p for p in A if p["c"] == "truck"],
        "Afters": [p for p in A if p["c"] not in FOOD | CHILL and p["c"] != "speak"],
        "Speakeasies": [p for p in A if p["c"] == "speak"],
        "Chill spots": [p for p in A if p["c"] in CHILL],
    }
    areas, worst = {}, []
    for name, ps in groups.items():
        r = summary(ps)
        if not r: continue
        areas[name], rows = r
        if name == "Chill spots": areas[name].pop("googleHours", None)   # beaches/stargazing follow park rules; Google never checks them
        for p, s, _, why in rows:
            if why: worst.append({"n": p["n"], "city": p.get("city", ""), "area": name, "score": round(10 * s, 1), "why": why})
    # markets (community.json weekly listings)
    try:
        M = json.load(open("community.json")).get("events", [])
    except FileNotFoundError:
        M = []
    if M:
        def mk(e):
            d = days(e.get("updatedAt"))
            t = 1.0 if e.get("time") and e.get("recurrence") else 0.0
            f = 1.0 if d is not None and d <= 30 else 0.5 if d is not None and d <= 60 else 0.0
            l = 0.6 if e.get("geo") == "highway" else 1.0
            return 0.4 * t + 0.4 * f + 0.2 * l, d
        ms = [mk(e) for e in M]
        areas["Markets"] = {"score": round(10 * sum(s for s, _ in ms) / len(ms), 1), "n": len(M),
                            "stale": sum(1 for _, d in ms if d is None or d > 30)}
        for e, (s, d) in zip(M, ms):
            if d is None or d > 30: worst.append({"n": e["title"], "city": e.get("city", ""), "area": "Markets", "score": round(10 * s, 1), "why": [f"not re-checked in {d} days" if d is not None else "never checked"]})
    # deals (afters.json only; owner-added deals live in Supabase)
    D = [p["deal"] for p in A if p.get("deal")]
    if D:
        ok = sum(1 for x in D if (days(x.get("chk")) or 999) <= 30)
        areas["Deals"] = {"score": round(10 * ok / len(D), 1), "n": len(D), "food": sum(1 for p in A if p.get("deal") and p["c"] in FOOD)}
    worst.sort(key=lambda w: (w["score"], w["n"]))
    snap = {k: v["score"] for k, v in areas.items()}
    try:
        old = json.load(open(out_path))
        hist = [h for h in old.get("history", []) if h.get("date") != TODAY.isoformat()]
    except (FileNotFoundError, ValueError):
        hist = []
    hist = (hist + [{"date": TODAY.isoformat(), **snap}])[-26:]
    out = {"note": "Weekly credibility audit (scripts/credibility.py explains the scoring). Scores are /10. 'worst' = spots to fix first.",
           "checked": TODAY.isoformat(), "areas": areas, "worst": worst[:10], "history": hist}
    with open(out_path, "w") as fh: fh.write(json.dumps(out, ensure_ascii=False, indent=1))
    print(" · ".join(f"{k} {v['score']}" for k, v in areas.items()))

if __name__ == "__main__":
    main()

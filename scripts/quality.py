#!/usr/bin/env python3
"""Data quality check on events.json, so bad listings get caught before people trust them.
Writes quality.json (shown to the owner under You -> Owner: review). Reads only; never edits events.json.
Checks: duplicate listings (same title, venue, date and time), morning times on club / comedy shows, unparseable times,
dates far ahead, locations outside Southern California, odd prices, missing or non-web ticket links.
Usage: python3 scripts/quality.py events.json quality.json"""
import json, re, sys, datetime

SRC = sys.argv[1] if len(sys.argv) > 1 else "events.json"
OUT = sys.argv[2] if len(sys.argv) > 2 else "quality.json"
TODAY = datetime.date.today()
NIGHT_KINDS = {"club", "comedy"}   # concerts and theater have real matinees
CLOCK = re.compile(r"(\d{1,2})(?::(\d\d))?\s*([ap])\.?\s?m\b", re.I)

def norm(s): return re.sub(r"[^a-z0-9]+", " ", str(s or "").lower()).strip()
def day(s):
    try: return datetime.date.fromisoformat(str(s)[:10])
    except Exception: return None

def main():
    evs = json.load(open(SRC)).get("events", [])
    items, seen = [], {}
    def flag(kind, e, why): items.append({"type": kind, "id": e.get("id"), "title": str(e.get("title", ""))[:80], "venue": e.get("venue"), "start": e.get("start"), "why": why})
    for e in evs:
        if e.get("recurrence"): continue   # weekly / monthly events are checked by their own rules
        st, en = day(e.get("start")), day(e.get("end") or e.get("start"))
        if not st: flag("date", e, "no usable date"); continue
        k = (e.get("start"), norm(e.get("venue")), norm(e.get("title")), norm(e.get("time")))   # early + late sets are two shows
        if k in seen: flag("duplicate", e, f"same title, venue and date as {seen[k]}")
        else: seen[k] = e.get("id")
        if st > TODAY + datetime.timedelta(days=420): flag("far", e, "more than 14 months away")
        t = str(e.get("time") or "")
        m = CLOCK.search(t)
        if t and re.search(r"\d", t) and not m: flag("time", e, f"can't read the time \"{t[:40]}\"")
        if m and e.get("kind") in NIGHT_KINDS and m.group(3).lower() == "a":
            h = int(m.group(1)) % 12
            if 6 <= h <= 10: flag("time", e, f"{t[:30]} for a {e.get('kind')} show: AM/PM mix-up?")
        la, lo = e.get("lat"), e.get("lon")
        if isinstance(la, (int, float)) and isinstance(lo, (int, float)) and not (32.3 <= la <= 35.9 and -121.5 <= lo <= -114.0):
            flag("place", e, f"location {la:.2f}, {lo:.2f} is outside Southern California")
        pf, pt = e.get("priceFrom"), e.get("priceTo")
        if isinstance(pf, (int, float)) and (pf < 0 or pf > 2000): flag("price", e, f"price from ${pf}")
        if isinstance(pf, (int, float)) and isinstance(pt, (int, float)) and pt < pf: flag("price", e, f"price range ${pf}–${pt} is backwards")
        u = str(e.get("url") or "")
        if u and not re.match(r"https?://", u): flag("link", e, "ticket link isn't a web address")
    counts = {}
    for x in items: counts[x["type"]] = counts.get(x["type"], 0) + 1
    order = ["time", "duplicate", "place", "price", "link", "date", "far"]
    items.sort(key=lambda x: (order.index(x["type"]) if x["type"] in order else 99, str(x["start"])))
    json.dump({"checked": TODAY.isoformat(), "events": len(evs), "counts": counts, "items": items[:60]}, open(OUT, "w"), ensure_ascii=False, indent=0)
    print(f"{len(evs)} events checked: " + (", ".join(f"{v} {k}" for k, v in counts.items()) or "nothing flagged"))

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Refresh opening hours for afters.json + pool.json from Google Places API (New). Runs daily in GitHub Actions.

MONEY RULES (the whole point of this file):
  * Hours live in Google's "Place Details Enterprise" SKU: 1,000 free calls a month, then billed.
  * This script never makes more than DETAILS_CAP detail calls in a calendar month, or RUN_CAP calls of
    each kind per run. Every call is counted in scripts/places_budget.json BEFORE it is sent, so a
    failed or timed-out call still counts. If the counter can't be saved, nothing is sent.
  * Place IDs come from Text Search with an IDs-only field mask (Google's cheapest SKU), are cached
    in afters.json/pool.json ("gid"), and are looked up once per place, not every run.
  * Second wall, set in Google Cloud by the owner: a 30-requests-per-day quota on the Places API.
    30 x 31 days = 930, under the 1,000 free calls, even if this file had a bug.
Beaches and stargazing are skipped: their hours are city/park rules, not Google listings.
No key (GOOGLE_PLACES_KEY unset) = prints what it would do and exits without calling anything."""
import json, os, sys, math, datetime, urllib.request

DETAILS_CAP = 900   # per calendar month (free tier is 1,000)
SEARCH_CAP = 900    # per calendar month (IDs-only search; capped anyway to be safe)
RUN_CAP = 25        # per run, for each kind of call
BUDGET = "scripts/places_budget.json"
FILES = ["afters.json", "pool.json"]
SKIP_C = {"beach", "stars"}
KEY = os.environ.get("GOOGLE_PLACES_KEY", "").strip()
TODAY = datetime.date.today()
MONTH = TODAY.strftime("%Y-%m")

def load_budget():
    try: b = json.load(open(BUDGET))
    except FileNotFoundError: b = {}
    if b.get("month") != MONTH: b = {"month": MONTH, "search": 0, "details": 0, "note": "Google Places calls this month. Counted before sending. Caps: details %d, search %d." % (DETAILS_CAP, SEARCH_CAP)}
    return b
def save_budget(b):
    tmp = BUDGET + ".tmp"
    with open(tmp, "w") as f: json.dump(b, f, indent=1)
    os.replace(tmp, BUDGET)

class Spent(Exception): pass
run_used = {"search": 0, "details": 0}
def spend(b, kind):
    cap = DETAILS_CAP if kind == "details" else SEARCH_CAP
    if b[kind] >= cap: raise Spent(f"monthly {kind} cap {cap} reached")
    if run_used[kind] >= RUN_CAP: raise Spent(f"per-run {kind} cap {RUN_CAP} reached")
    b[kind] += 1; run_used[kind] += 1
    save_budget(b)   # written to disk before the request goes out

def call(url, body=None, mask=""):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None,
        headers={"X-Goog-Api-Key": KEY, "X-Goog-FieldMask": mask, "Content-Type": "application/json"},
        method="POST" if body is not None else "GET")
    with urllib.request.urlopen(req, timeout=30) as r: return json.load(r)

def miles(a, b, c, d):
    t = math.radians; x = math.sin(t(c - a) / 2) ** 2 + math.cos(t(a)) * math.cos(t(c)) * math.sin(t(d - b) / 2) ** 2
    return 2 * 3958.8 * math.asin(math.sqrt(x))

def find_id(b, p):
    spend(b, "search")
    j = call("https://places.googleapis.com/v1/places:searchText",
             {"textQuery": ", ".join(x for x in [p["n"], p.get("a"), p.get("city"), "CA"] if x), "maxResultCount": 1,
              "locationBias": {"circle": {"center": {"latitude": p["lat"], "longitude": p["lon"]}, "radius": 800.0}}},
             "places.id")
    pl = j.get("places") or []
    return pl[0]["id"] if pl else None

def details(b, gid):
    spend(b, "details")
    return call(f"https://places.googleapis.com/v1/places/{gid}", None, "id,displayName,location,businessStatus,regularOpeningHours")

# ---- turn Google's weekly periods into "Till 11 PM, 1 AM Fri–Sat" + til (latest Fri/Sat close, 24h clock, 26 = 2 AM) ----
DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
def clock(m):
    h, mi = (m // 60) % 24, m % 60
    if h == 0 and mi == 0: return "midnight"
    if h == 12 and mi == 0: return "noon"
    return f"{h % 12 or 12}{':%02d' % mi if mi else ''} {'AM' if h < 12 else 'PM'}"
def dayset(ds):
    order = [1, 2, 3, 4, 5, 6, 0]; ds = [d for d in order if d in ds]; out = []; i = 0
    while i < len(ds):
        j = i
        while j + 1 < len(ds) and order.index(ds[j + 1]) == order.index(ds[j]) + 1: j += 1
        out.append(DAYS[ds[i]] if i == j else f"{DAYS[ds[i]]}–{DAYS[ds[j]]}"); i = j + 1
    return ", ".join(out)
def summarize(roh):
    periods = (roh or {}).get("periods") or []
    if not periods: return None, None
    if len(periods) == 1 and "close" not in periods[0]: return "Open 24 hours", 30
    close = {}
    for pr in periods:
        o, c = pr.get("open"), pr.get("close")
        if not o: continue
        if not c: close[o["day"]] = 30 * 60; continue
        m = ((c["day"] - o["day"]) % 7) * 1440 + c.get("hour", 0) * 60 + c.get("minute", 0)
        close[o["day"]] = max(close.get(o["day"], 0), m)
    if not close: return None, None
    if all(v >= 30 * 60 for v in close.values()) and len(close) == 7: return "Open 24 hours", 30
    counts = {}
    for v in close.values(): counts[v] = counts.get(v, 0) + 1
    base = max(counts, key=lambda v: (counts[v], v))
    parts = [f"Till {clock(base)}"]
    for v in sorted(set(close.values()) - {base}):
        parts.append(f"{clock(v)} {dayset([d for d in close if close[d] == v])}")
    shut = [d for d in range(7) if d not in close]
    if shut: parts.append(f"closed {dayset(shut)}")
    til = max(close.get(5, 0), close.get(6, 0)) or max(close.values())
    return ", ".join(parts), round(til / 60, 1)

def main():
    data = {f: json.load(open(f)) for f in FILES}
    todo = [(f, p) for f in FILES for p in data[f]["places"] if p.get("c") not in SKIP_C and not p.get("gone") and isinstance(p.get("lat"), (int, float)) and p.get("gmiss", 0) < 2]   # 2 misses = stop paying to look
    todo.sort(key=lambda fp: (fp[1].get("hu") or "0000", fp[1]["n"]))   # never-checked first, then oldest
    if not KEY:
        print(f"No GOOGLE_PLACES_KEY: would check up to {RUN_CAP} of {len(todo)} places. Nothing sent."); return
    b = load_budget(); save_budget(b)
    print(f"{MONTH}: {b['details']}/{DETAILS_CAP} details and {b['search']}/{SEARCH_CAP} searches used before this run.")
    done = 0
    try:
        for f, p in todo:
            if b["details"] >= DETAILS_CAP or run_used["details"] >= RUN_CAP: raise Spent("details cap reached")   # don't search for an ID we can't use
            if not p.get("gid"):
                gid = find_id(b, p)
                if not gid: p["hu"] = TODAY.isoformat(); p["gmiss"] = p.get("gmiss", 0) + 1; print("  no match:", p["n"]); continue
                p["gid"] = gid
            d = details(b, p["gid"])
            loc = d.get("location") or {}
            if loc and miles(p["lat"], p["lon"], loc.get("latitude", 0), loc.get("longitude", 0)) > 0.6:
                print("  wrong place, dropping id:", p["n"], "→", (d.get("displayName") or {}).get("text")); p.pop("gid"); p["hu"] = TODAY.isoformat(); p["gmiss"] = p.get("gmiss", 0) + 1; continue
            st = d.get("businessStatus")
            if st == "CLOSED_PERMANENTLY": p["gone"] = 1; print("  closed for good:", p["n"])
            elif st == "CLOSED_TEMPORARILY": p.update(h="Temporarily closed", til=0); p.pop("hq", None)
            else:
                h, til = summarize(d.get("regularOpeningHours"))
                if h: p.update(h=h, til=til); p.pop("hq", None); p["hs"] = "g"
            p["hu"] = TODAY.isoformat(); done += 1
    except Spent as e:
        print("Stopped:", e)
    except Exception as e:
        print("Stopped on error:", repr(e)[:300])
    for f in FILES:
        with open(f, "w") as fh: fh.write(json.dumps(data[f], ensure_ascii=False, indent=0) + "\n")
    print(f"Updated {done}. Month total now: {b['details']} details, {b['search']} searches.")

if __name__ == "__main__":
    main()

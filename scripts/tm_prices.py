#!/usr/bin/env python3
"""Fill in Ticketmaster prices on events.json (runs in GitHub Actions, after the daily refresh).

Uses Ticketmaster's free Discovery API (official data, no scraping). Needs the repo secret TM_API_KEY.
It touches price fields, marks shows Ticketmaster lists as cancelled, and adds up to 60 missing shows a day at
venues we already list (see add_missing below). No UI changes.

Rules
- Match a show only when the date is the same AND the venue matches AND the title/artist matches.
  A wrong match is worse than an estimate, so anything unsure is skipped.
- priceFrom = Ticketmaster's lowest listed price (whole $). If the show already has a fresh price
  (checked in the last 3 days) from another site, keep whichever is lower: that's the cheapest way in.
- Price moves of $5+ are tracked the same way the daily refresh does (priceWas / priceChangedAt).
"""
import json, os, re, sys, time, unicodedata, urllib.parse, urllib.request
from datetime import date, datetime, timedelta, timezone
from difflib import SequenceMatcher

KEY = os.environ.get("TM_API_KEY", "").strip()
PATH = sys.argv[1] if len(sys.argv) > 1 else "events.json"
API = "https://app.ticketmaster.com/discovery/v2/events.json"
CENTER = "33.7455,-117.8677"  # Santa Ana
RADIUS = 125                  # miles, matches the app's ~120 mi scope
SEGMENTS = ["Music", "Arts & Theatre"]  # comedy lives under Arts & Theatre
WINDOW_DAYS = 7
HORIZON_DAYS = 280
FRESH_DAYS = 3

STOP = {"the", "a", "an", "at", "and", "&", "with", "w", "feat", "ft", "presents", "live", "tour", "in", "of",
        "concert", "show", "theatre", "theater", "night", "tickets", "ticket", "vip", "package", "packages", "la", "los", "angeles"}

def norm(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\(.*?\)|\[.*?\]", " ", s)
    return re.sub(r"[^a-z0-9 ]+", " ", s)

def toks(s):
    return {t for t in norm(s).split() if t not in STOP and len(t) > 1}

def sim(a, b):
    a, b = " ".join(sorted(toks(a))), " ".join(sorted(toks(b)))
    return SequenceMatcher(None, a, b).ratio() if a and b else 0.0

def venue_ok(ours, theirs):
    a, b = toks(ours), toks(theirs)
    if not a or not b:
        return False
    overlap = len(a & b) / min(len(a), len(b))
    return overlap >= 0.5 or sim(ours, theirs) >= 0.75

def title_ok(ev, tm):
    names = [tm["name"]] + tm["artists"]
    arts = ev.get("artists") or ""
    if isinstance(arts, list):   # a few listings keep artists as a list
        arts = ", ".join(str(a) for a in arts if a)
    ours = [ev.get("title") or ""] + [x for x in re.split(r",|·|/| w/ | with ", str(arts)) if x.strip()]
    best = 0.0
    for o in ours:
        for n in names:
            best = max(best, sim(o, n))
            to, tn = toks(o), toks(n)
            if to and tn and (to <= tn or tn <= to) and min(len(to), len(tn)) >= 1 and len(" ".join(to & tn)) >= 4:
                best = max(best, 0.9)
    return best >= 0.72

def clean_url(u):
    """Ticketmaster wraps links in affiliate tracking (impact/evyy.net) when the developer profile has an
    affiliate ID. We don't use the affiliate program, so unwrap to the plain ticket page."""
    if not u:
        return u
    p = urllib.parse.urlparse(u)
    if "evyy.net" in p.netloc or "impact" in p.netloc:
        inner = urllib.parse.parse_qs(p.query).get("u")
        if inner:
            u = inner[0]
    p = urllib.parse.urlparse(u)
    q = [(k, v) for k, v in urllib.parse.parse_qsl(p.query) if not k.startswith("utm_")]
    return urllib.parse.urlunparse(p._replace(query=urllib.parse.urlencode(q)))

def get(params, tries=4):
    url = API + "?" + urllib.parse.urlencode({**params, "apikey": KEY})
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "show-shack/1.0"}), timeout=30) as r:
                time.sleep(0.25)  # stay under 5 requests/second
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(2 + 2 * i); continue
            if e.code in (401, 403):
                sys.exit(f"Ticketmaster rejected the key (HTTP {e.code}). Check the TM_API_KEY secret.")
            time.sleep(1 + i)
        except Exception:
            time.sleep(1 + i)
    return None

def fetch_all():
    out, today = [], date.today()
    for seg in SEGMENTS:
        d = today
        while d < today + timedelta(days=HORIZON_DAYS):
            e = d + timedelta(days=WINDOW_DAYS)
            page = 0
            while True:
                j = get({"latlong": CENTER, "radius": RADIUS, "unit": "miles", "countryCode": "US",
                         "segmentName": seg, "startDateTime": f"{d}T00:00:00Z", "endDateTime": f"{e}T00:00:00Z",
                         "size": 200, "page": page, "sort": "date,asc"})
                if not j:
                    break
                for x in (j.get("_embedded") or {}).get("events", []):
                    v = ((x.get("_embedded") or {}).get("venues") or [{}])[0]
                    pr = [p for p in (x.get("priceRanges") or []) if (p.get("min") or 0) > 0 and (p.get("currency") or "USD") == "USD"]  # $0 = "no price set", never "free"
                    cl = (x.get("classifications") or [{}])[0]
                    out.append({
                        "id": x.get("id"), "name": x.get("name") or "", "url": clean_url(x.get("url")),
                        "date": ((x.get("dates") or {}).get("start") or {}).get("localDate"),
                        "time": ((x.get("dates") or {}).get("start") or {}).get("localTime"),
                        "seg": (cl.get("segment") or {}).get("name") or "", "genre": (cl.get("genre") or {}).get("name") or "",
                        "sub": (cl.get("subGenre") or {}).get("name") or "",
                        "max": max((p.get("max") or 0 for p in pr), default=None),
                        "status": (((x.get("dates") or {}).get("status") or {}).get("code") or "").lower(),
                        "onsale": ((x.get("sales") or {}).get("public") or {}).get("startDateTime"),
                        "venue": v.get("name") or "", "city": (v.get("city") or {}).get("name") or "",
                        "artists": [a.get("name") for a in ((x.get("_embedded") or {}).get("attractions") or []) if a.get("name")],
                        "min": min((p["min"] for p in pr), default=None),
                    })
                pg = j.get("page") or {}
                page += 1
                if page >= (pg.get("totalPages") or 0) or (page + 1) * 200 > 1000:
                    break
            d = e
    return out

# ---- adding shows we're missing ----
# Only at venues we already list (so the name, city and map pin are ours), only on dates where we list NOTHING at that
# venue (so a show we have under a different title can't be added twice), one show per venue per night, music, comedy
# and theater only, no parking/VIP/package listings. Added shows carry "src": "tm-auto" and "tmId"; the daily refresh
# updates them instead of adding its own copy (scripts/refresh-extra.md).
ADD_MAX, ADD_PER_VENUE = 60, 10   # per run; it runs every morning, so the backlog fills in over a few days
JUNK = re.compile(r"\b(parking|vip|packages?|upgrades?|add[- ]?ons?|gift ?cards?|vouchers?|tailgate|suites?|premium seat|"
                  r"club access|lounge access|camping|shuttle|lockers?|season pass|meet ?(and|&) ?greets?|soundcheck|merch|"
                  r"fast ?lane|early entry|cabanas?)\b", re.I)
GENRE = [("hip-hop", "hiphop"), ("rap", "hiphop"), ("dance/electronic", "electronic"), ("electronic", "electronic"),
         ("latin", "latin"), ("regional mexican", "latin"), ("reggae", "reggae"), ("pop", "pop"), ("jazz", "jazz"),
         ("r&b", "jazz"), ("blues", "jazz"), ("soul", "jazz"), ("rock", "indie"), ("alternative", "indie"),
         ("metal", "indie"), ("punk", "indie"), ("indie", "indie"), ("folk", "indie"), ("country", "indie")]

def kind_of(t):
    g = (t["genre"] or "").lower()
    if g == "comedy" or (t["sub"] or "").lower() == "comedy":
        return "comedy"
    if t["seg"] == "Music":
        return "concert"
    if t["seg"] == "Arts & Theatre" and g in ("theatre", "musical", "performance art", "variety", "magic & illusion", "dance"):
        return "theater"
    return None

def clock(s):
    try:
        h, m = int(s[:2]), int(s[3:5])
    except Exception:
        return None
    return f"{(h % 12) or 12}:{m:02d} {'AM' if h < 12 else 'PM'}"

def slug(s, n=40):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:n].strip("-")

def add_missing(data, tm, today):
    evs = data.get("events", [])
    today_s, last = today.isoformat(), (today + timedelta(days=HORIZON_DAYS)).isoformat()
    venues = {}   # our venues with a map pin: (venue, city) -> {lat, lon, n}
    for e in evs:
        if e.get("venue") and e.get("city") and isinstance(e.get("lat"), (int, float)) and "see tickets" not in e["venue"]:
            v = venues.setdefault((e["venue"], e["city"]), {"lat": e["lat"], "lon": e["lon"], "n": 0})
            v["n"] += 1
    taken, ids, tm_ids = set(), {e.get("id") for e in evs}, {e.get("tmId") for e in evs if e.get("tmId")}
    for e in evs:   # every night each of our venues already has something (incl. multi-night runs)
        if e.get("start") and not e.get("recurrence"):
            try:
                d0 = date.fromisoformat(e["start"]); end = date.fromisoformat(e.get("end") or e["start"])
            except ValueError:
                continue
            d = d0
            while d <= end and (d - d0).days < 60:
                taken.add((norm(e.get("venue")), d.isoformat())); d += timedelta(days=1)
    by_date = {}
    for e in evs:
        if e.get("start"):
            by_date.setdefault(e["start"], []).append(e)
    added, per_venue = 0, {}
    for t in sorted(tm, key=lambda x: x["date"] or ""):
        if added >= ADD_MAX:
            break
        d = t["date"]
        if not d or d < today_s or d > last or t["id"] in tm_ids or t["status"] != "onsale" or JUNK.search(t["name"]):
            continue
        k = kind_of(t)
        if not k:
            continue
        mine = [(vk, v) for vk, v in venues.items() if norm(vk[1]) == norm(t["city"]) and venue_ok(vk[0], t["venue"])]
        if not mine:
            continue
        (vname, vcity), v = max(mine, key=lambda x: x[1]["n"])
        if (norm(vname), d) in taken or per_venue.get(vname, 0) >= ADD_PER_VENUE:
            continue
        if any(title_ok(o, t) for o in by_date.get(d, [])):   # same show listed under another venue name
            continue
        title = t["name"].strip()
        artists = ", ".join(a for a in t["artists"] if norm(a) != norm(title)) or None
        genres = sorted({g for key, g in GENRE if key in (t["genre"] + " " + t["sub"]).lower()}) if k == "concert" else []
        eid, i = f"{slug(title)}-{slug(vname, 20)}-{d}", 2
        while eid in ids:
            eid, i = f"{slug(title)}-{slug(vname, 20)}-{d}-{i}", i + 1
        onsale = (t.get("onsale") or "")[:10]
        lo = int(round(t["min"])) if t["min"] else None
        hi = int(round(t["max"])) if t.get("max") and lo is not None and t["max"] > t["min"] else None
        evs.append({"id": eid, "title": title, "artists": artists, "kind": k, "genres": genres, "venue": vname, "city": vcity,
                    "lat": v["lat"], "lon": v["lon"], "start": d, "end": None, "time": clock(t.get("time") or ""),
                    "priceFrom": lo, "priceTo": hi, "priceEst": False, "priceAvg": None, "priceNote": None,
                    "priceAsOf": today_s if lo is not None else None, "priceSrc": "ticketmaster" if lo is not None else None,
                    "priceWas": None, "priceChangedAt": None, "onSaleAt": onsale if onsale > today_s else None, "ages": None,
                    "note": None, "url": t["url"], "status": "announced" if onsale > today_s else "on sale",
                    "updatedAt": today_s, "src": "tm-auto", "tmId": t["id"]})
        ids.add(eid); tm_ids.add(t["id"]); taken.add((norm(vname), d)); by_date.setdefault(d, []).append(evs[-1])
        per_venue[vname] = per_venue.get(vname, 0) + 1; added += 1
    return added

def main():
    if not KEY:
        print("No TM_API_KEY secret yet; skipping Ticketmaster prices.")
        return 0
    data = json.load(open(PATH, encoding="utf-8"))
    n_start = len(data.get("events", []))
    tm = fetch_all()
    by_date = {}
    for t in tm:
        if t["date"]:
            by_date.setdefault(t["date"], []).append(t)
    today = datetime.now(timezone.utc).astimezone().date()
    today_s = today.isoformat()
    fresh_cut = (today - timedelta(days=FRESH_DAYS)).isoformat()
    matched = priced = changed = cancelled = 0
    for ev in data.get("events", []):
        if ev.get("url"):
            ev["url"] = clean_url(ev["url"])
        if ev.get("priceSrc") == "ticketmaster" and ev.get("priceFrom") == 0:
            ev["priceFrom"], ev["priceSrc"] = None, None
    for ev in data.get("events", []):
        if ev.get("recurrence") or not ev.get("start") or (ev.get("end") or ev["start"]) < today_s:
            continue
        cands = [t for t in by_date.get(ev["start"], []) if venue_ok(ev.get("venue"), t["venue"]) and title_ok(ev, t)]
        if not cands:
            continue
        matched += 1
        if any(t["status"] == "cancelled" for t in cands) and all(t["status"] == "cancelled" for t in cands):
            if ev.get("status") != "cancelled":
                ev["status"] = "cancelled"; cancelled += 1
            continue
        live = [t for t in cands if t["status"] not in ("cancelled", "offsale")]
        mins = [t["min"] for t in live if t["min"] is not None]
        if not mins:
            continue
        tm_min = int(round(min(mins)))
        old = ev.get("priceFrom")
        fresh_other = old is not None and (ev.get("priceAsOf") or "") >= fresh_cut and ev.get("priceSrc") != "ticketmaster"
        new = min(old, tm_min) if fresh_other else tm_min
        if new == old and fresh_other:
            continue  # the other site's price is already the cheapest and fresh
        same_src = ev.get("priceSrc") == "ticketmaster" and new == tm_min
        if old is not None and abs(new - old) >= 5 and same_src:   # a real move, not just a different site's price
            ev["priceWas"], ev["priceChangedAt"] = old, today_s; changed += 1
        if ev.get("status") == "announced" and any(t["status"] == "onsale" for t in live):
            ev["status"], ev["onSaleAt"] = "on sale", today_s
        ev["priceFrom"], ev["priceEst"], ev["priceAsOf"] = new, False, today_s
        if new == tm_min:
            ev["priceSrc"] = "ticketmaster"
            if not ev.get("priceTo") or ev.get("priceTo") < new:
                ev["priceTo"] = None
        if "google.com/search" in (ev.get("url") or "") and live[0].get("url"):
            ev["url"] = live[0]["url"]  # a real ticket page beats a search link
        priced += 1
    added = add_missing(data, tm, today)
    note = f"Ticketmaster: {len(tm)} listings checked, {matched} matched, {priced} priced, {changed} price moves, {cancelled} cancelled, {added} added."
    data["tmNote"], data["tmRun"] = note, datetime.now(timezone.utc).isoformat(timespec="seconds")
    n_before = len(data.get("events", []))
    s = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    assert len(json.loads(s)["events"]) == n_before and n_before >= n_start
    open(PATH, "w", encoding="utf-8").write(s)
    print(note)
    return 0

if __name__ == "__main__":
    sys.exit(main())

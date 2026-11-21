"""When did each show first show up in events.json, and when was it actually announced?  -> fresh.json
  {"seen": {"<id>": "YYYY-MM-DD"},      the day the Shack first listed it
   "new":  {"<id>": "YYYY-MM-DD"},      the day it was announced / added at the venue (only shows we're fairly sure about)
   "venues": {"<venue>": "YYYY-MM-DD"}} the day the Shack started covering each venue

Powers the "Just announced" row on the home screen. Dates are Pacific.
"First seen by the Shack" is NOT "announced": the Shack backfills venue calendars (a new venue's whole season shows up at
once, and the Ticketmaster pass adds ~60 long-on-sale shows a day). So "new" only keeps:
  - Ticketmaster-matched shows: the first presale / on-sale day (announcedAt, set by tm_prices.py), or the day we saw it if
    tickets aren't on sale yet (that's a fresh announcement by definition)
  - everything else: the first-seen day, unless it was the day we started covering that venue, part of a big one-day
    catch-up at that venue (> BURST shows), or the show is under a week away (we'd missed it, it wasn't just announced)
  python3 scripts/firstseen.py          # add today's date for ids that aren't in fresh.json yet, drop ids that are gone
  python3 scripts/firstseen.py --git    # rebuild from git history (first commit each id appeared in)
"""
import json, subprocess, sys, datetime
from zoneinfo import ZoneInfo

PT = ZoneInfo("America/Los_Angeles")
OUT = "fresh.json"
BURST = 8        # more new shows than this at one venue on one day = a crawl catching up, not announcements
MIN_LEAD = 7     # shows first seen less than this many days before they happen were missed, not just announced


def evs_of(data):
    if isinstance(data, dict):
        evs = (data.get("events") or []) + (data.get("picks") or [])
    else:
        evs = data or []
    return [e for e in evs if isinstance(e, dict) and e.get("id")]


def ids_of(data):
    return {str(e["id"]) for e in evs_of(data)}


def current_events():
    with open("events.json") as f:
        return {str(e["id"]): e for e in evs_of(json.load(f))}


def announced(evs, seen, venues, base, today):
    """id -> the day it was announced, for the shows we can vouch for (see the docstring)."""
    burst = {}
    for i, d in seen.items():
        v = evs[i].get("venue") or ""
        burst[(v, d)] = burst.get((v, d), 0) + 1
    out = {}
    for i, e in evs.items():
        d, v = seen.get(i), e.get("venue") or ""
        if not d:
            continue
        ann = e.get("announcedAt")
        if ann:
            out[i] = d if ann > today else min(ann, d)   # not on sale yet: announced around when we saw it
            continue
        if e.get("tmId") or e.get("src") == "tm-auto":
            continue   # a Ticketmaster listing whose sale dates we haven't read yet: can't tell, stay quiet
        if d <= base or venues.get(v) == d or burst[(v, d)] > BURST:
            continue
        try:
            if e.get("start") and (datetime.date.fromisoformat(e["start"]) - datetime.date.fromisoformat(d)).days < MIN_LEAD:
                continue
        except ValueError:
            pass
        out[i] = d
    return out


def from_git():
    log = subprocess.run(["git", "log", "--reverse", "--format=%H %ct", "--", "events.json"],
                         capture_output=True, text=True, check=True).stdout.split("\n")
    seen = {}
    for line in filter(None, log):
        sha, ts = line.split()
        day = datetime.datetime.fromtimestamp(int(ts), PT).date().isoformat()
        try:
            blob = subprocess.run(["git", "show", f"{sha}:events.json"], capture_output=True, text=True, check=True).stdout
            ids = ids_of(json.loads(blob))
        except Exception:
            continue
        for i in ids:
            seen.setdefault(i, day)
    return seen


def main():
    evs = current_events()
    live = set(evs)
    today = datetime.datetime.now(PT).date().isoformat()
    try:
        with open(OUT) as f:
            old = json.load(f)
    except (OSError, ValueError):
        old = {}
    seen = from_git() if "--git" in sys.argv else old.get("seen", {})
    # "base": the day the list was first imported. Shows dated that day were already there, not newly added.
    base = old.get("base") if "--git" not in sys.argv else None
    base = base or (min(seen.values()) if seen else today)
    seen = {i: d for i, d in seen.items() if i in live}
    for i in live:
        seen.setdefault(i, today)
    # the day the Shack started covering each venue (kept even after that venue's first shows are past)
    venues = dict(old.get("venues") or {}) if "--git" not in sys.argv else {}
    for i, d in seen.items():
        v = evs[i].get("venue") or ""
        if v and (v not in venues or d < venues[v]):
            venues[v] = d
    new = announced(evs, seen, venues, base, today)
    with open(OUT, "w") as f:
        json.dump({"updated": today, "base": base, "seen": dict(sorted(seen.items())), "new": dict(sorted(new.items())),
                   "venues": dict(sorted(venues.items()))}, f, separators=(",", ":"), ensure_ascii=False)
        f.write("\n")
    week = (datetime.date.fromisoformat(today) - datetime.timedelta(days=7)).isoformat()
    print(f"{len(seen)} shows tracked, {sum(1 for d in seen.values() if d > base and d >= week)} first listed in the last 7 days, "
          f"{sum(1 for d in new.values() if d >= week)} announced in the last 7 days")


if __name__ == "__main__":
    main()

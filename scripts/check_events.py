#!/usr/bin/env python3
"""Daily health check for events.json. Exits 1 (red X in Actions, GitHub emails the owner) when the show list
is stale or has broken rows; prints softer warnings that don't fail. Run: python3 scripts/check_events.py"""
import json, re, sys, datetime as dt
from collections import Counter

STALE_HOURS = 36  # the morning refresh runs daily; a day and a half without one means it stopped

d = json.load(open("events.json"))
ev = d.get("events") or []
now = dt.datetime.now(dt.timezone.utc)
today = now.astimezone(dt.timezone(dt.timedelta(hours=-8))).date().isoformat()  # Pacific, close enough
errors, warns = [], []

last = d.get("lastRun")
if not last:
    errors.append("no lastRun stamp")
else:
    age = (now - dt.datetime.fromisoformat(last.replace("Z", "+00:00"))).total_seconds() / 3600
    if age > STALE_HOURS:
        errors.append(f"show list is stale: last refresh {age:.0f}h ago ({last})")

if len(ev) < 300:
    errors.append(f"only {len(ev)} shows (usually 1000+): the refresh may have wiped the list")

dup = [k for k, n in Counter(e.get("id") for e in ev).items() if n > 1]
if dup:
    errors.append(f"{len(dup)} duplicate ids, e.g. {dup[:3]}")

broken, badprice, badurl = [], [], []
for e in ev:
    t = e.get("title") or "?"
    if not e.get("title") or not e.get("venue") or not (e.get("start") or e.get("recurrence")):
        broken.append(t)
    lo, hi = e.get("priceFrom"), e.get("priceTo")
    if lo is not None and (lo < 0 or (hi is not None and hi < lo)):
        badprice.append(t)
    u = e.get("url") or ""
    if u and not re.match(r"^https?://", u):
        badurl.append(t)
for name, rows in (("missing title/venue/date", broken), ("price low > high or negative", badprice), ("non-http link", badurl)):
    if rows:
        errors.append(f"{len(rows)} shows with {name}, e.g. {rows[:3]}")

past = [e for e in ev if e.get("start") and (e.get("end") or e["start"]) < today]
if past:
    warns.append(f"{len(past)} past shows still in the file (the app hides them; the refresh should drop them)")
search = [e for e in ev if re.search(r"google\.[a-z.]+/search", e.get("url") or "") and (e.get("start") or "") >= today]
if search:
    warns.append(f"{len(search)} upcoming shows link to a Google search, not a ticket page (shown as 'Find tickets')")
resale = Counter(re.sub(r"^https?://(www\.)?", "", e.get("url") or "").split("/")[0] for e in ev)
rs = sum(resale[h] for h in ("gametime.co", "tickpick.com", "vividseats.com", "stubhub.com", "seatgeek.com"))
if rs:
    warns.append(f"{rs} shows link to resale sites ({rs * 100 // max(len(ev), 1)}%): prefer the venue or primary seller")
noprice = sum(1 for e in ev if e.get("priceFrom") is None and e.get("status") not in ("cancelled", "sold out"))
warns.append(f"{noprice} of {len(ev)} shows have no real price yet")

print(f"events.json: {len(ev)} shows, last refresh {last}")
for w in warns:
    print("  warn:", w)
for x in errors:
    print("  ERROR:", x)
sys.exit(1 if errors else 0)

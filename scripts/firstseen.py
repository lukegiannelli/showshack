"""When did each show first show up in events.json?  -> fresh.json  {"seen": {"<id>": "YYYY-MM-DD", ...}}

Powers the "Recently added" row on the home screen. Dates are Pacific.
  python3 scripts/firstseen.py          # add today's date for ids that aren't in fresh.json yet, drop ids that are gone
  python3 scripts/firstseen.py --git    # rebuild from git history (first commit each id appeared in)
"""
import json, subprocess, sys, datetime
from zoneinfo import ZoneInfo

PT = ZoneInfo("America/Los_Angeles")
OUT = "fresh.json"


def ids_of(data):
    if isinstance(data, dict):
        evs = (data.get("events") or []) + (data.get("picks") or [])
    else:
        evs = data or []
    return {str(e["id"]) for e in evs if isinstance(e, dict) and e.get("id")}


def current_ids():
    with open("events.json") as f:
        return ids_of(json.load(f))


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
    live = current_ids()
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
    with open(OUT, "w") as f:
        json.dump({"updated": today, "base": base, "seen": dict(sorted(seen.items()))}, f, separators=(",", ":"))
        f.write("\n")
    week = (datetime.date.fromisoformat(today) - datetime.timedelta(days=7)).isoformat()
    print(f"{len(seen)} shows tracked, {sum(1 for d in seen.values() if d > base and d >= week)} added in the last 7 days")


if __name__ == "__main__":
    main()

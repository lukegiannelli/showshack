"""Weekly coverage check: are we missing shows at the venues people use most?

For the 50 venues with the most listings, asks Ticketmaster's free Discovery API (official data, no scraping) how many
events it has there in the next 60 days, and compares with how many we list. Venues where Ticketmaster has clearly
more go into coverage.json, which the owner sees under You -> Owner: review. Nothing is added automatically.
Needs the repo secret TM_API_KEY (the same one the price check uses). Without it, it does nothing.
Usage: python3 scripts/coverage.py events.json coverage.json
"""
import json, os, re, sys, time, urllib.parse, urllib.request
from datetime import date, datetime, timedelta, timezone

KEY = os.environ.get("TM_API_KEY", "").strip()
API = "https://app.ticketmaster.com/discovery/v2/"
UA = "ShowShack-coverage/1.0"


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower().replace("&", " and ")).strip()


def get(path, params, tries=3):
    url = API + path + "?" + urllib.parse.urlencode({**params, "apikey": KEY})
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=20) as r:
                return json.load(r)
        except Exception:
            time.sleep(1.5 * (i + 1))
    return None


def main():
    if not KEY:
        print("No TM_API_KEY; skipping.")
        return
    src, out = sys.argv[1], sys.argv[2]
    evs = json.load(open(src, encoding="utf-8"))["events"]
    today = date.today()
    end = today + timedelta(days=60)
    soon = [e for e in evs if e.get("start") and today.isoformat() <= e["start"] <= end.isoformat()]
    count = {}
    for e in soon:
        k = (e.get("venue") or "", e.get("city") or "")
        count[k] = count.get(k, 0) + 1
    top = sorted(count.items(), key=lambda x: -x[1])[:50]
    start_s = datetime(today.year, today.month, today.day, tzinfo=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    end_s = datetime(end.year, end.month, end.day, tzinfo=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    gaps, checked = [], 0
    for (venue, city), ours in top:
        time.sleep(0.3)
        v = get("venues.json", {"keyword": venue, "stateCode": "CA", "countryCode": "US", "size": 5})
        cands = ((v or {}).get("_embedded") or {}).get("venues") or []
        match = next((c for c in cands if norm(c.get("name")) == norm(venue) or
                      (norm(venue) in norm(c.get("name")) and norm((c.get("city") or {}).get("name")) == norm(city))), None)
        if not match:
            continue
        time.sleep(0.3)
        r = get("events.json", {"venueId": match["id"], "startDateTime": start_s, "endDateTime": end_s, "size": 1})
        tm = (((r or {}).get("page") or {}).get("totalElements")) or 0
        checked += 1
        if tm - ours >= 3 and tm >= ours * 1.5:
            gaps.append({"venue": venue, "city": city, "ours": ours, "tm": tm})
    gaps.sort(key=lambda g: -(g["tm"] - g["ours"]))
    json.dump({"checked": today.isoformat(), "venues": checked, "gaps": gaps}, open(out, "w", encoding="utf-8"), separators=(",", ":"))
    print(f"Checked {checked} venues; {len(gaps)} look short.")


if __name__ == "__main__":
    main()

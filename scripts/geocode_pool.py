#!/usr/bin/env python3
"""Fill lat/lon for pool.json places from OpenStreetMap Nominatim (runs in GitHub Actions).
Only touches places without coordinates. Rejects any hit whose city doesn't match. 1 request/second per Nominatim policy."""
import json, sys, time, urllib.parse, urllib.request
PATHS = sys.argv[1:] or ["pool.json"]
UA = {"User-Agent": "show-shack/1.0 (https://github.com/lukegiannelli/showshack)"}
def q(params):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({**params, "format": "jsonv2", "addressdetails": 1, "limit": 3, "countrycodes": "us"})
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        out = json.load(r)
    time.sleep(1.1)
    return out
def city_ok(hit, city):
    a = hit.get("address") or {}
    names = {str(a.get(k, "")).lower() for k in ("city", "town", "village", "hamlet", "suburb", "municipality")}
    return city.lower() in names or city.lower() in hit.get("display_name", "").lower()
ROADS = {"road", "secondary", "primary", "tertiary", "residential", "trunk", "street"}
ABBR = [(" St", " Street"), (" Ave", " Avenue"), (" Blvd", " Boulevard"), (" Hwy", " Highway"), (" Cir", " Circle")]
def spelled(a):
    a = " " + a + " "
    for k, v in (("E ", "East "), ("W ", "West "), ("N ", "North "), ("S ", "South ")):
        a = a.replace(" " + k, " " + v)
    for k, v in ABBR:
        a = a.replace(k + " ", v + " ")
    return a.strip()
def run(PATH):
    data = json.load(open(PATH))
    if "events" in data:   # events.json: only series/shows seeded with an "addr" and no coordinates
        items = [e for e in data["events"] if e.get("addr") and not isinstance(e.get("lat"), (int, float))]
        for e in items: e["a"] = e["addr"]
    else:
        items = data["places"]
    done = miss = 0
    for p in items:
        if isinstance(p.get("lat"), (int, float)) and p.get("geo") not in ROADS:
            continue
        hit = None
        for params in ({"street": p["a"], "city": p["city"], "state": "CA", "postalcode": p.get("zip", "")},
                       {"street": p["a"], "city": p["city"], "state": "CA"},
                       {"street": spelled(p["a"]), "city": p["city"], "state": "CA"},
                       {"q": f'{p["a"]}, {p["city"]}, CA'},
                       {"q": f'{spelled(p["a"])}, {p["city"]}, California'}):
            try:
                res = [h for h in q(params) if city_ok(h, p["city"])]
            except Exception as e:
                print("error", p.get("n") or p.get("title"), e); res = []
            good = [h for h in res if (h.get("addresstype") or h.get("type")) not in ROADS]
            if good:
                hit = good[0]; break
            if res and not hit:
                hit = res[0]   # street-level fallback; keep looking for a better one
        if hit:
            p["lat"], p["lon"] = round(float(hit["lat"]), 5), round(float(hit["lon"]), 5)
            p["geo"] = hit.get("addresstype") or hit.get("type")
            done += 1; print("ok  ", p.get("n") or p.get("title"), p["lat"], p["lon"], p["geo"])
        else:
            miss += 1; print("MISS", p.get("n") or p.get("title"))
    if "events" in data:          # "a" was only a temporary alias of addr on events; pool places keep theirs
        for e in items:
            e.pop("a", None)
    if "events" in data:
        txt = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    else:
        txt = json.dumps(data, ensure_ascii=False, indent=0)
    open(PATH, "w", encoding="utf-8").write(txt)
    print(f"{PATH}: geocoded {done}, missed {miss}")
for P in PATHS:
    run(P)

#!/usr/bin/env python3
"""Food near the busiest venues -> afters.json. Runs weekly in GitHub Actions (OpenStreetMap / Overpass, free, no key).

For the TOP venues with the most upcoming shows, make sure each has WANT food spots within a short walk.
Where it's short, add the closest *independent* places OpenStreetMap knows about:
  - chains are skipped (OSM "brand" tags, or a name that shows up 3+ times in the area)
  - only cuisines the app has a category for (tacos, pizza, ramen, sushi, burgers, ...)
  - places that list late hours (open past 10 PM) win ties
New spots carry src "osm" and no hours; the "Hours from Google Places" job checks never-checked spots first, so real
closing times (or "closed for good") land within a few days.
  python3 scripts/food_near_venues.py            # add spots
  python3 scripts/food_near_venues.py --dry      # print what it would add
"""
import datetime, json, math, re, sys, urllib.parse, urllib.request
from collections import Counter

TOP, WANT, WALK_MI, MAX_ADD = 25, 3, 0.75, 40
FOOD = {"kbbq", "ramen", "tacos", "pho", "korean", "diner", "boil", "hotpot", "hibachi", "fine", "dimsum", "thai",
        "pizza", "dessert", "hall", "burger", "sushi"}
SHOW_KINDS = {"concert", "festival", "club", "comedy", "theater"}
# OSM cuisine -> app category (first match wins; order matters)
CUISINE = [("korean_barbecue|korean_bbq", "kbbq"), ("hot_pot|hotpot", "hotpot"), ("ramen", "ramen"), ("pho|vietnamese", "pho"),
           ("dim_sum", "dimsum"), ("teppanyaki|hibachi", "hibachi"), ("sushi|japanese", "sushi"), ("korean", "korean"),
           ("thai", "thai"), ("pizza", "pizza"), ("taco|mexican|burrito|tex-mex|latin_american", "tacos"),
           ("burger|hot_dog|american|sandwich|chicken|wings", "burger"), ("diner|breakfast", "diner"),
           ("cajun|crab|seafood_boil", "boil"), ("ice_cream|dessert|bubble_tea|frozen_yogurt|donut|crepe|cake", "dessert")]
CHAINS = re.compile(r"\b(mcdonald|starbucks|subway|taco bell|chipotle|jack in the box|carl'?s jr|wendy|burger king|"
                    r"domino|pizza hut|little caesar|panda express|in-n-out|del taco|el pollo loco|denny|ihop|"
                    r"panera|chick-fil-a|popeyes|kfc|wingstop|dunkin|baskin|cold stone|jamba|raising cane|"
                    r"blaze pizza|mod pizza|shake shack|five guys|habit burger|rubio|cheesecake factory|bj'?s)\b", re.I)


def miles(a, b, c, d):
    t = math.radians
    x = math.sin(t(c - a) / 2) ** 2 + math.cos(t(a)) * math.cos(t(c)) * math.sin(t(d - b) / 2) ** 2
    return 2 * 3958.8 * math.asin(math.sqrt(x))


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", str(s or "").lower()).strip()


def busiest_venues(today):
    evs = json.load(open("events.json", encoding="utf-8")).get("events", [])
    n, at = Counter(), {}
    for e in evs:
        if e.get("kind") not in SHOW_KINDS or e.get("recurrence") or not isinstance(e.get("lat"), (int, float)):
            continue
        if (e.get("end") or e.get("start") or "") < today:
            continue
        k = (e["venue"], e["city"])
        n[k] += 1
        at[k] = (e["lat"], e["lon"])
    return [(k, at[k], c) for k, c in n.most_common(TOP)]


def cat_of(t):
    cu = (t.get("cuisine") or "").lower()
    if t.get("amenity") == "food_court":
        return "hall"
    if t.get("amenity") == "ice_cream":
        return "dessert"
    for pat, c in CUISINE:
        if re.search(pat, cu):
            return c
    return None


def late(oh):
    """True when an OSM opening_hours string closes at/after 10 PM (or past midnight, or 24/7). Rough on purpose."""
    oh = (oh or "").replace(" ", "")
    if "24/7" in oh:
        return True
    for h in re.findall(r"-(\d{1,2}):\d\d", oh):
        h = int(h)
        if h >= 22 or h <= 4:
            return True
    return False


def overpass(points):
    parts = "".join(f'nwr["amenity"~"^(restaurant|fast_food|cafe|ice_cream|food_court)$"]["name"](around:{int(WALK_MI*1609)},{la},{lo});'
                    for la, lo in points)
    q = f"[out:json][timeout:120];({parts});out center tags;"
    req = urllib.request.Request("https://overpass-api.de/api/interpreter", data=urllib.parse.urlencode({"data": q}).encode(),
                                 headers={"User-Agent": "show-shack/1.0 (https://github.com/lukegiannelli/showshack)"})
    return json.load(urllib.request.urlopen(req, timeout=180)).get("elements", [])


def main():
    dry = "--dry" in sys.argv
    today = datetime.date.today().isoformat()
    data = json.load(open("afters.json", encoding="utf-8"))
    places = data["places"]
    food = [p for p in places if p.get("c") in FOOD and not p.get("gone") and isinstance(p.get("lat"), (int, float))]
    need = []
    for (venue, city), (la, lo), shows in busiest_venues(today):
        have = sum(1 for p in food if miles(la, lo, p["lat"], p["lon"]) <= WALK_MI)
        print(f"{shows:4d} shows  {have} food within {WALK_MI} mi  {venue} ({city})")
        if have < WANT:
            need.append((venue, city, la, lo, WANT - have))
    if not need:
        print("Every busy venue already has food nearby.")
        return
    els = overpass([(la, lo) for _, _, la, lo, _ in need])
    names = Counter(norm(e.get("tags", {}).get("name")) for e in els)
    cands, seen = [], set()
    for e in els:
        t = e.get("tags", {})
        name = t.get("name")
        la = e.get("lat") or (e.get("center") or {}).get("lat")
        lo = e.get("lon") or (e.get("center") or {}).get("lon")
        if not name or la is None:
            continue
        k = (norm(name), round(la, 3), round(lo, 3))
        if k in seen:
            continue
        seen.add(k)
        if t.get("brand") or t.get("brand:wikidata") or CHAINS.search(name) or names[norm(name)] >= 3:
            continue   # chains: the point is local spots
        c = cat_of(t)
        if not c:
            continue
        if any(norm(p["n"]) == norm(name) or miles(la, lo, p["lat"], p["lon"]) < 0.02 for p in places if isinstance(p.get("lat"), (int, float))):
            continue   # already listed
        cands.append({"name": name, "c": c, "lat": la, "lon": lo, "t": t, "late": late(t.get("opening_hours"))})
    added = []
    for venue, city, vla, vlo, short in need:
        near = sorted((x for x in cands if miles(vla, vlo, x["lat"], x["lon"]) <= WALK_MI and x["name"] not in {a["n"] for a in added}),
                      key=lambda x: (not x["late"], miles(vla, vlo, x["lat"], x["lon"])))
        for x in near[:short]:
            if len(added) >= MAX_ADD:
                break
            t, m = x["t"], miles(vla, vlo, x["lat"], x["lon"])
            p = {"n": x["name"][:80], "c": x["c"], "city": t.get("addr:city") or city,
                 "a": " ".join(v for v in [t.get("addr:housenumber"), t.get("addr:street")] if v),
                 "t": [f"~{max(2, round(m * 20))} min walk from {venue}"],
                 "lat": round(x["lat"], 5), "lon": round(x["lon"], 5), "geo": "osm", "src": "osm", "added": today}
            if t.get("addr:postcode"):
                p["zip"] = t["addr:postcode"][:5]
            if t.get("website"):
                p["u"] = t["website"]
            p = {k: v for k, v in p.items() if v not in ("", None)}
            added.append(p)
            print(f"  + {p['n']} ({p['c']}) {p['t'][0]}{' · lists late hours' if x['late'] else ''}")
    print(f"{len(added)} spots to add.")
    if dry or not added:
        return
    places.extend(added)
    with open("afters.json", "w", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=False, indent=0))   # the layout the morning refresh and hours job write


if __name__ == "__main__":
    main()

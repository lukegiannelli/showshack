"""Turn an 'Add a show' issue into a pick in events.json. Run by the add-show workflow."""
import json, os, re, sys, datetime

body = os.environ.get("ISSUE_BODY", "")
num = os.environ["ISSUE_NUMBER"]
LABELS = {"Artist or event": "show", "Date (YYYY-MM-DD)": "date", "Time": "time", "Venue": "venue", "City": "city",
          "Type": "kind", "Genre": "genre", "Lowest price $ (0 = free)": "price", "Link": "url",
          "Latitude (auto)": "lat", "Longitude (auto)": "lon"}
f = {}
for block in re.split(r"^### ", body, flags=re.M)[1:]:
    head, _, val = block.partition("\n")
    val = val.strip()
    if val == "_No response_": val = ""
    if head.strip() in LABELS: f[LABELS[head.strip()]] = val

def num_or_none(v):
    try: return float(v)
    except (TypeError, ValueError): return None

if not (f.get("show") and re.fullmatch(r"\d{4}-\d{2}-\d{2}", f.get("date", "")) and f.get("venue") and f.get("city")):
    print("Missing artist, date (YYYY-MM-DD), venue or city."); sys.exit(1)

price = num_or_none(f.get("price"))
url = f.get("url") or None
if url and not url.startswith("http"): url = "https://" + url
pick = {"id": f"gh{num}", "title": f["show"], "artists": None, "kind": f.get("kind") or "concert",
        "genres": [f["genre"]] if f.get("genre") else [], "venue": f["venue"], "city": f["city"],
        "lat": num_or_none(f.get("lat")), "lon": num_or_none(f.get("lon")), "start": f["date"], "end": None,
        "time": f.get("time") or None, "priceFrom": None if price is None else max(0, round(price)),
        "priceAvg": None, "priceNote": None, "note": None, "url": url, "status": "on sale",
        "createdBy": "luke", "createdAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}

with open("events.json", encoding="utf-8") as fh: data = json.load(fh)
picks = [p for p in data.get("picks", []) if p.get("id") != pick["id"]]
picks.append(pick)
data["picks"] = picks
with open("events.json", "w", encoding="utf-8") as fh: json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))
print(f"Added {pick['title']} on {pick['start']} at {pick['venue']}.")

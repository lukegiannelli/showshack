"""Find transparent artist logos (TheAudioDB) for headliners in events.json -> logos.json.
logos.json = {"logos": {key: url}, "miss": {key: "YYYY-MM-DD"}}. key = normalized headliner name.
Misses are retried after 30 days. Only exact name matches are kept (no fuzzy guesses)."""
import json, re, sys, time, urllib.request, urllib.parse, datetime
KINDS = {"concert", "festival", "club"}
def head(title):
    t = re.sub(r"\s*\(.*?\)\s*", " ", title or "")
    t = re.split(r":| & Friends| - | – | — | w/ | with | feat\.? | ft\.? | / |, | \+ | x ", t, flags=re.I)[0]
    return t.strip()
def key(n):
    n = n.casefold().replace("&", "and")
    n = re.sub(r"^the ", "", n)
    return re.sub(r"[^a-z0-9]+", "", n)
today = datetime.date.today()
ev = json.load(open("events.json"))["events"]
try: db = json.load(open("logos.json"))
except Exception: db = {"logos": {}, "miss": {}}
db.setdefault("logos", {}); db.setdefault("miss", {})
names = {}
for e in ev:
    if e.get("kind") in KINDS:
        h = head(e.get("title"))
        if 2 <= len(h) <= 60: names.setdefault(key(h), h)
todo = [(k, n) for k, n in names.items() if k and k not in db["logos"] and
        (k not in db["miss"] or (today - datetime.date.fromisoformat(db["miss"][k])).days > 30)]
LIMIT = int(sys.argv[1]) if len(sys.argv) > 1 else 400
print(f"{len(names)} headliners, {len(db['logos'])} logos known, {len(todo)} to look up (cap {LIMIT})")
found = 0; KEY = "123"
for k, n in todo[:LIMIT]:
    url = f"https://www.theaudiodb.com/api/v1/json/{KEY}/search.php?s=" + urllib.parse.quote(n)
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "ShowShack/1.0"}), timeout=20) as r:
            j = json.load(r)
    except Exception as ex:
        print("ERR", n, ex); time.sleep(3); continue
    hit = None
    for a in (j or {}).get("artists") or []:
        if key(a.get("strArtist") or "") == k and a.get("strArtistLogo"):
            hit = a["strArtistLogo"]; break
    if hit: db["logos"][k] = hit; db["miss"].pop(k, None); found += 1; print("LOGO", n)
    else: db["miss"][k] = today.isoformat()
    time.sleep(2.2)
json.dump(db, open("logos.json", "w"), separators=(",", ":"), ensure_ascii=False, sort_keys=True)
print(f"found {found}; total {len(db['logos'])}")

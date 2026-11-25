# Extra jobs for the daily refresh

The daily refresh routine reads this file and follows it after its main show update. Edit this file to change the extra
jobs; the routine itself doesn't need to change.

## Runs unattended: never wait on a person (every run)

Nobody is watching this run, so anything that asks for approval is effectively a "no".

**FETCH RULE — read this before STEP B and copy it word for word into every subagent's prompt.**
`.claude/settings.json` allowing WebFetch is NOT enough. WebFetch only works without a prompt on a URL that appeared
in a WebSearch result *in that same agent's own context*. A URL taken from a file, from venue-sources.json, or typed
into a subagent's prompt fails with `PROVENANCE_REQUIRED` ("permission request not answered in time"). That is why
every run from Nov 20–23 2026 came back "fetch blocked".
- For every venue: WebSearch first (e.g. `<venue> <city> calendar events`, `gametime <venue> tickets venue`), then
  WebFetch only a URL copied exactly from those results. The `calendar` field in venue-sources.json is a hint for
  what to search for, never a URL to fetch directly.
- If a search-result URL is still refused, search again and try a different result URL. Only call a venue
  "fetch blocked" after two different search-result URLs were refused.
- The orchestrator must NOT hand subagents URLs to fetch; hand them venue names and let them search.

- **Search before you fetch (this is what blocked 11/20–11/22).** WebFetch refuses a URL with
  `PROVENANCE_REQUIRED` ("permission request not answered in time") when the URL didn't come from a search result
  or the user, e.g. a calendar URL copied out of venue-sources.json or a file you wrote for an agent. That refusal is
  a permission prompt nobody is awake to answer. So every agent, for every venue: first WebSearch
  (`"<venue> <city> calendar"` or `"<venue> events"`), then WebFetch only URLs that appeared in **that agent's own**
  search results. Put this rule in each subagent's prompt word for word. The `calendar` URLs in venue-sources.json
  are hints for what to search, not URLs to fetch directly.
- If a fetch is still refused or blocked, don't keep retrying it and don't swap in a weaker source to fill the gap.
  Leave that venue's `lastChecked` alone (so tomorrow's run picks it up first) and put "fetch blocked" in its `how`.
- Tell the subagents the same: a refused fetch means skip the venue, and report it in `how`.
- In the FINISH line, give how many venues were really read vs. blocked, e.g. "47 read, 3 blocked".

## Accuracy rules (every run)

- **Official first.** The venue's or promoter's own page, then the ticket seller's event page. Aggregators
  (Songkick, americanarenas, gametime venue lists) are fine for *finding* a show, but confirm the date/time on an
  official or ticket-seller page before adding it. If you can't confirm, don't add it: list it in the note instead.
- **Two sources disagree:** the official page wins. Never "fix" an existing show (date, title, venue) from one
  aggregator alone. Put it in the note for Luke.
- **On-sale dates.** When a venue or ticket page shows a future on-sale or presale date, set `status` "announced",
  `onSaleAt` to the public on-sale day and `presaleAt` to the first presale day (YYYY-MM-DD, Pacific). These power
  the Tickets hub, the "On sale Sat" pills and the 9 AM "on sale today" phone ping. Once the date has passed and
  tickets are buyable, `status` "on sale" (keep `onSaleAt`).
- **Prices.** Write the number the seller shows. Ticketmaster prices come from the GitHub Action as face value and
  the app adds an estimated ~30% for fees on its own, so never add fees yourself and never overwrite a
  `priceSrc` "ticketmaster" price with a fee-inclusive one from another site unless it's lower.
- **Don't guess.** No invented times, prices or coordinates. "Time TBA" and `null` are correct answers.

## Keep "Listing checked" honest (every run, no extra tool calls)

Every show card says "✓ Listing checked <date>" from the show's `updatedAt`, and shows an amber
"Not re-checked since…" badge when that date is more than 30 days old. So:

- For every venue you checked this run, set `updatedAt` to today on each show we list there that its calendar (or
  ticket page) still shows. Do this in the same Python script that applies the agents' results.
- Leave `updatedAt` alone on shows you didn't actually see today.
- For the community kinds (dance, contact, sound, drum, social, art, volunteer, openmic), set `updatedAt` to today only
  when you saw the listing itself today.

## Shows the Ticketmaster job added (every run)

The "Ticketmaster prices" GitHub Action also adds shows we're missing at venues we already list. Those carry
`"src": "tm-auto"` and a `tmId`.

- Before you add a show, look for a `tm-auto` show at the same venue on the same date. If there is one, it's the same
  night: update that entry (title, time, price, url to the official event page) instead of adding a second one.
  Keep its `id`, `src` and `tmId`.
- If the venue's own calendar doesn't have a `tm-auto` show (and the date is within the next 60 days), it may be a
  private or rental event. Leave it, but mention it in your note so Luke can check.

## Groupon comedy deals (Sundays only, about 10 tool calls)

`groupon.json` holds Groupon deals for the comedy clubs we list. The app shows one under the price of that venue's
comedy shows ("💸 Groupon: 2 GA tickets $24"), but only while `chk` is within 14 days and `until` hasn't passed. So
every Sunday:

1. Comedy clubs to check: the venues with the most upcoming `kind: "comedy"` shows (the Improvs in Irvine, Brea,
   Ontario, Corona and Hollywood, The Ice House, Laugh Factory, The Comedy Store, Comedy & Magic Club, The American
   Comedy Co., and any other comedy club we list). Skip theaters, arenas and casinos.
2. WebSearch `groupon <venue name> <city>`. Only use a `groupon.com/deals/...` page that is clearly for **that exact
   venue and location** (Groupon has Improvs in many states). Open it with WebFetch.
3. If the page shows a live, buyable deal, write
   `"<venue exactly as in events.json>": {"t": "2 GA tickets", "p": 24, "v": 50, "u": "<deal page>", "until": "YYYY-MM-DD" or null, "chk": "<today>", "fine": "Wed–Sun regular shows; 2-drink min; 21+"}`
   with `p` = the cheapest option's Groupon price for what `t` says, and `v` = its listed value. Copy the numbers from
   the page; never estimate them.
4. If a venue's deal is gone, sold out or expired, delete its entry. If you can't load the page today, leave the entry
   alone (it hides itself after 14 days).
5. Set `"checked"` to today. Keep the file small and valid JSON (`json.dumps(data, ensure_ascii=False, indent=1)`), and
   add it to the same "Daily refresh" commit. Mention it in the message, e.g. "Groupon: 3 comedy deals".

## Food spots from OpenStreetMap (every run, no extra tool calls)

The "Food near busy venues" workflow adds independent food spots near the busiest venues each Monday. They carry
`"src": "osm"`. If one of the venue agents happens to see that a `src: "osm"` spot has closed or is actually a
chain, set `"gone": 1` on it (don't delete it, so the weekly job doesn't add it back). Hours come from the Google
Places job; don't type hours in for these.

## Food & afters deals (Sundays and Wednesdays only, about 15 tool calls)

`afters.json` holds the food and afters spots. A spot can have a `deal`:

```json
"deal": {"t": "Happy hour: $5 drafts", "d": "Mon–Fri 4–7 PM", "until": "2027-01-31", "u": "https://…", "chk": "2026-11-12"}
```

- `t` what the deal is (short, at most 90 characters), `d` when it runs (optional), `until` the end date if the place
  gives one (optional), `u` the page where the place itself posts it, `chk` the day you last confirmed it.
- The app hides a deal after `until`, or 120 days after `chk` when there is no end date.

Each run:

1. Drop deals whose `until` has passed.
2. Re-check up to 6 existing deals with the oldest `chk`: open `u`. If the deal is still posted, set `chk` to today.
   If it's gone or changed, update it or remove it.
3. Look for up to 6 new deals at spots that don't have one yet, closest to the big venues first (Orange County, then
   Los Angeles, San Diego, Inland Empire, desert): happy hours, "show your ticket" specials, late-night menus, weekday
   bowling or arcade specials.
   - Only add a deal you can read on the place's **own website** (or its official page on a venue, mall, hotel or
     city tourism site). Never from Yelp, blogs, listicles, Groupon or review sites. Never guess prices or times.
   - Many chains post different deals per location: only use the page for that exact location.
4. Keep the file's layout: `JSON.stringify(data, null, 1).replace(/^ +/gm, "")` with Windows line endings (`\r\n`)
   and no newline at the end. Change nothing else in the file.
5. If you changed `afters.json`, bump the number in `fetch("afters.json?v=N")` in `night.js` by one, and add both files
   to the same "Daily refresh" commit. Mention the deals in the commit message, for example "2 deals checked, 1 added".

Deals the owner adds on the You page live in Supabase, not in this file. Leave those alone.

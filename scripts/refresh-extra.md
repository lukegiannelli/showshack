# Extra jobs for the daily refresh

The daily refresh routine reads this file and follows it after its main show update. Edit this file to change the extra
jobs; the routine itself doesn't need to change.

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

## Show list quality (every run, last step)

Run `python3 scripts/check_events.py` after writing `events.json` and fix what it reports before committing:

- **Errors** (it exits 1) must be fixed: missing title/venue/date, price low above high, broken links, duplicate ids.
- **Past shows:** drop any show whose `end` (or `start` if no end) is before today.
- **Google-search links:** for each upcoming show whose `url` is a Google search, look for the real ticket or event
  page (venue site, Ticketmaster, AXS, DICE, Eventbrite) and use it. Leave the search link only if none exists.
- **Resale links:** when a show links to Gametime, TickPick, Vivid Seats, StubHub or SeatGeek, swap in the venue's own
  page or the primary seller if one sells it. Resale is fine only when the show is sold out at face value.
- **Never guess a price** into `priceFrom`/`priceTo`. Unknown stays `null`; donation or pay-what-you-can goes in
  `priceNote` (with the suggested amount in `priceFrom`/`priceTo` only if the organizer states one).

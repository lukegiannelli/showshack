# Extra jobs for the daily refresh

The daily refresh routine reads this file and follows it after its main show update. Edit this file to change the extra
jobs; the routine itself doesn't need to change.

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

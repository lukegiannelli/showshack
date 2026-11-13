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

### Deals confirmed by phone (`"via": "call"`)

Some places hide their deals from automated checks (a bot check, a menu only in an image) or don't post them at all.
Those can still be listed if someone **called the place** and they confirmed it:

```json
"deal": {"t": "Happy hour: $8 cocktails", "d": "Mon–Thu 3–6 PM", "via": "call", "chk": "2026-11-13"}
```

- `via: "call"` replaces `u`: there is no page to link. The card says "confirmed by phone" with the `chk` date.
- These hide **45 days** after `chk` (not 120), because nobody can re-check them automatically.
- Only the owner adds them, after a real call. The refresh never adds or re-dates a phone deal itself.
- In step 2, when you reach a phone deal: if the place's own site now shows the deal, switch it to a normal deal (`u`,
  drop `via`, set `chk` to today). Otherwise leave it alone, and if it hides within 10 days, put "call to re-check:
  <place>" in the commit message.

Waiting on a call (no deal on any official page yet): Lulu California Bistro (Palm Springs, 760-327-5858),
Kalbi Social Club (Irvine, 949-418-7072), The Blind Rabbit and Hammer Workshop & Bar (Anaheim Packing House).

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
4. Keep the file's layout: `JSON.stringify(data, null, 1).replace(/^ +/gm, "")` with plain `\n` line endings
   and no newline at the end. Change nothing else in the file.
5. If you changed `afters.json`, bump the number in `fetch("afters.json?v=N")` in `night.js` by one, and add both files
   to the same "Daily refresh" commit. Mention the deals in the commit message, for example "2 deals checked, 1 added".

Deals the owner adds on the You page live in Supabase, not in this file. Leave those alone.

# 🛖 The Show Shack

SoCal shows, raves, comedy, open mics, ecstatic dance, contact improv, sound baths and drum circles, with prices and drive times.

**Live:** https://lukegiannelli.github.io/showshack/

- `index.html` – the app (installable: Share → Add to Home Screen)
- `events.json` – the show list, refreshed every morning by a scheduled Claude task
- `fresh.json` – the day each show first appeared (powers **Recently added**), kept up to date by the `Recently added` workflow
- Add a show: open the site with `#owner` once on your device to show the **＋ Add a show** button. It opens a prefilled GitHub issue; the `Add a show` workflow publishes it (owner's issues only).

# Working on The Show Shack with Luke

Every Claude session in this repo reads this file first. These are the standing settings, so Luke doesn't repeat them.

## How Luke wants to work
- Be a debate partner: critical, direct, no flattery. Flag problems before he asks. Say "I don't know" when you don't.
- Mobile-first replies: short, scannable, bullets. When he's stuck: one clear next step plus 2-3 options.
- Use tappable choices (AskUserQuestion) when something is truly ambiguous; otherwise pick the sensible default and say so.
- Never buy anything or sign up for paid services on his behalf.
- He often works from his phone. Assume he can't read long diffs: summarize what changed and what he should check.

## Product taste (the bar)
- "Feels like you paid for it": calm, fast, obvious. People come for **what's on, when, how much, how far**. Everything
  else is secondary and should stay out of the way until asked for.
- No pop-ups on a first visit. One prompt per screen at most. Don't repeat the same hint on every card.
- Never invent data (prices, times, coordinates). "Time TBA" and `null` are correct answers.
- Check desktop (1440px) and phone (390px) before calling a UI change done.

## Codebase rules
- Plain static site on GitHub Pages: `index.html` + `app.js` (data, filters, cards) + `b.js` (home/tabs layout) +
  feature files (`you.js`, `music.js`, `night.js`, ...). No build step, no framework.
- When you change a CSS/JS file, bump its `?v=` in `index.html` **and** bump `CACHE` in `sw.js`, or phones keep the old file.
- Syntax-check JS you touched: `node -e "new Function(require('fs').readFileSync('app.js','utf8'))"`.
- Screenshots: Playwright with `page.route('http://shack.test/**', ...)` serving files from the repo (no local
  server needed). Set `localStorage['shack-new']` to skip the What's new sheet when testing returning users.
- `events.json`, `fresh.json`, `venue-sources.json` are written by the daily refresh and GitHub Actions; don't
  hand-edit them in UI work.
- The daily refresh routine follows `scripts/refresh-extra.md`. Unattended runs can't answer permission prompts:
  WebFetch only URLs that came from WebSearch results in the same agent.
- Work on a `claude/*` branch, then open a PR to `main` when Luke asks. Commit messages: plain English, what and why.

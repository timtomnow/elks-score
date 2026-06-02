# Elks Score

A lightweight web app for tracking the Edmonton Elks and the rest of the CFL — live scores, division standings, the weekly scoreboard, and deep links to official game stats. Installable as a home screen app on Android and iPhone.

**Demo:** [timtomnow.github.io/elks-score](https://timtomnow.github.io/elks-score/)

## Features

**Featured Elks game**
- Automatically shows the most relevant Elks game: live if one is on, otherwise the next scheduled game, otherwise the most recent final
- Live score with quarter and game clock
- Possession indicator (gold dot beside the team with the ball)
- Team records (W–L–T)
- Expandable **Game details**: round / pre-season label, kickoff time, and timeouts remaining while live
- A clearly branded **CFL.ca** button linking to the official box score, live game tracker, or preview for deeper stats

**Recent Elks results**
- The last few completed Elks games, **including pre-season**, with final score, win/loss tag, round, and date
- Each result links to its CFL.ca box score

**CFL standings**
- West and East divisions, sorted by points (CFL scoring: win = 2, tie = 1, loss = 0)
- Games played, wins, losses, ties, and points per team
- Elks highlighted

**Weekly scoreboard**
- Every game in the current week with scores and status (live quarter + clock, final, or kickoff time)
- Each game links out to its official CFL Game Tracker page

**Upcoming Elks games**
- The next few scheduled Elks games with date and kickoff time

**Auto-refresh**
- Every 30 seconds while a game is live, every 5 minutes otherwise

## Data source

This app reads the same public JSON feed that powers the live scoreboard widget on **cfl.ca** (provided via Genius Sports):

- `…/json/scoreboard/squads.json` — teams and records
- `…/json/scoreboard/rounds.json` — schedule, live scores, and game state

These are undocumented, unofficial endpoints with no published usage terms — great for a personal app, but they can change without notice. Deeper stats (box scores, play-by-play) are not in this feed; the app links out to CFL's official Game Tracker for those.

### Why a proxy is required

The upstream feed (`cflscoreboard.cfl.ca`) sends **no CORS headers**, so a browser will refuse to fetch it from any origin other than cfl.ca itself. To get around this, the app talks to a small **Cloudflare Worker** that fetches the feed server-side and re-serves it with CORS headers and short edge-cache TTLs. (Same pattern as the `oilers-score` repo.)

## Setup

### 1. Deploy the worker

```bash
cd worker
npx wrangler login      # opens the browser to authorize your Cloudflare account
npx wrangler deploy
```

This publishes `elks-score-proxy` to `https://elks-score-proxy.<your-subdomain>.workers.dev`.

Rate limiting via Workers KV is **optional** and off by default — the worker runs fine without it. To enable a daily request cap, follow the commented instructions in [`worker/wrangler.toml`](worker/wrangler.toml).

### 2. Point the app at your worker

Edit [`config.js`](config.js) and set `CFL_API_BASE` to your deployed worker URL (the default assumes the `oilers-score-proxy` workers.dev subdomain). The team can be changed there too.

### 3. Serve the app

It's a static site — host the repo root anywhere (e.g. GitHub Pages). Opening `index.html` directly via `file://` will **not** work (browser blocks `fetch` from `null` origin); use a real server such as `python3 -m http.server` for local testing.

## Roadmap

- **Tier 1 (done):** live scores, standings, weekly scoreboard, links to official game stats
- **Tier 1.5 (done):** recent results including pre-season, expandable game details (round, kickoff, live timeouts), and clearly branded CFL.ca links — surfacing everything the public scoreboard feed actually exposes
- **Tier 2 (later):** full box scores / player stats / play-by-play inline. **Not available from the public scoreboard feed** (it carries summary data only, and the old official `api.cfl.ca` is gone), so this would require scraping CFL's gametracker pages — fragile and out of scope for now. The app links out to CFL.ca for these instead.

## Tech

A static front end (`index.html` + `config.js`) — no build step, no framework, no API keys — plus a ~150-line Cloudflare Worker that proxies the CFL feed. Host the front end anywhere; the worker runs free on Cloudflare's edge.

## Disclaimer

Not affiliated with or endorsed by the Canadian Football League or the Edmonton Elks. Team names and logos are property of their respective owners.

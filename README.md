# Elks Score

A lightweight web app for tracking the Edmonton Elks and the rest of the CFL — live scores, division standings, the weekly scoreboard, and deep links to official game stats. Installable as a home screen app on Android and iPhone.

## Features

**Featured Elks game**
- Automatically shows the most relevant Elks game: live if one is on, otherwise the next scheduled game, otherwise the most recent final
- Live score with quarter and game clock
- Possession indicator (gold dot beside the team with the ball)
- Team records (W–L–T)
- One tap to the official CFL Game Tracker / preview / recap

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

- `https://cflscoreboard.cfl.ca/json/scoreboard/squads.json` — teams and records
- `https://cflscoreboard.cfl.ca/json/scoreboard/rounds.json` — schedule, live scores, and game state

These are undocumented, unofficial endpoints with no published usage terms — great for a personal app, but they can change without notice. Deeper stats (box scores, play-by-play) are not in this feed; the app links out to CFL's official Game Tracker for those.

## Roadmap

- **Tier 1 (done):** live scores, standings, weekly scoreboard, links to official game stats
- **Tier 2 (later):** serve box scores / player stats inline (requires scraping CFL's stats pages or a licensed Genius Sports feed)

## Tech

A single static `index.html` — no build step, no dependencies, no API keys. Just open it or host it anywhere (e.g. GitHub Pages).

## Disclaimer

Not affiliated with or endorsed by the Canadian Football League or the Edmonton Elks. Team names and logos are property of their respective owners.

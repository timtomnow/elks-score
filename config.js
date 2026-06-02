// Public configuration — edit these values to match your deployment.
// See README.md for setup instructions.

const CONFIG = {
  // Your deployed Cloudflare Worker URL (CORS proxy for the CFL scoreboard feed).
  // The upstream feed (cflscoreboard.cfl.ca) sends no CORS headers, so the
  // browser CANNOT fetch it directly — the proxy is required.
  // If your workers.dev subdomain differs, update this to match.
  CFL_API_BASE: 'https://elks-score-proxy.oilers-score-proxy.workers.dev',

  // CFL team identifier (Genius Sports squad id) — change to fork for another team.
  TEAM_ID:    114347,   // Edmonton Elks
  TEAM_ABBR:  'EDM',
};

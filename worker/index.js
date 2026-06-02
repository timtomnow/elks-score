/**
 * Elks Score — CFL Scoreboard CORS Proxy
 *
 * Cloudflare Worker that proxies cflscoreboard.cfl.ca (the public JSON feed
 * powering cfl.ca's live scoreboard), adds CORS headers, caches responses at
 * the edge, and optionally enforces a daily request cap via Workers KV so the
 * free tier (100k req/day) is never breached.
 *
 * The upstream feed sends NO CORS headers, so browsers can't fetch it directly —
 * this worker is what makes a client-side app possible.
 *
 * Optional KV namespace binding: RATE_KV  (see wrangler.toml)
 * Optional environment variable:  DAILY_CAP  (default 50000)
 */

const CFL_BASE = 'https://cflscoreboard.cfl.ca';

// Only these upstream path prefixes may be proxied (prevents open-proxy abuse).
const ALLOWED_PREFIXES = ['/json/scoreboard/', '/media/squads/'];

// Cache TTLs (seconds) by URL pattern — live data short, static data longer.
function cacheTTL(pathname) {
  if (/\/rounds\.json$/.test(pathname))    return 20;   // live scores
  if (/\/checksums\.json$/.test(pathname)) return 15;   // change-poll
  if (/\/squads\.json$/.test(pathname))    return 120;  // records
  if (/\/media\/squads\//.test(pathname))  return 86400; // logos
  return 60;
}

// Pad a date part to 2 digits
const p2 = n => String(n).padStart(2, '0');

// Key for today's KV counter — resets each UTC day automatically via expirationTtl
function todayKey() {
  const d = new Date();
  return `req:${d.getUTCFullYear()}-${p2(d.getUTCMonth()+1)}-${p2(d.getUTCDate())}`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Health / root
    if (url.pathname === '/' || url.pathname === '') {
      return new Response(JSON.stringify({ status: 'ok', service: 'elks-score-proxy' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Only proxy GET requests
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Path allow-list
    if (!ALLOWED_PREFIXES.some(p => url.pathname.startsWith(p))) {
      return new Response(JSON.stringify({ error: 'Path not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const dailyCap = parseInt(env.DAILY_CAP ?? '50000', 10);
    const key = todayKey();

    // ── Edge cache lookup ────────────────────────────────────────────────────
    const cflUrl = `${CFL_BASE}${url.pathname}${url.search}`;
    const cacheKey = new Request(cflUrl, { method: 'GET' });
    const cache = caches.default;

    const cached = await cache.match(cacheKey);
    if (cached) {
      // Cache hits don't count against the daily cap and aren't billed as
      // upstream fetches.
      const res = new Response(cached.body, cached);
      res.headers.set('Access-Control-Allow-Origin', '*');
      res.headers.set('X-Cache', 'HIT');
      return res;
    }

    // Cache miss — check daily cap before going upstream
    let currentCount = 0;
    if (env.RATE_KV) {
      const raw = await env.RATE_KV.get(key);
      currentCount = raw ? parseInt(raw, 10) : 0;
      if (currentCount >= dailyCap) {
        return new Response(
          JSON.stringify({ error: 'Daily request limit reached. Try again tomorrow.' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Retry-After': '3600',
            },
          }
        );
      }
    }

    // ── Fetch from CFL scoreboard feed ───────────────────────────────────────
    let cflRes;
    try {
      cflRes = await fetch(cflUrl, {
        headers: { Accept: 'application/json', 'User-Agent': 'elks-score/1.0' },
        redirect: 'follow',
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: `Upstream fetch failed: ${err.message}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (!cflRes.ok) {
      return new Response(JSON.stringify({ error: `CFL feed returned ${cflRes.status}` }), {
        status: cflRes.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // ── Increment daily counter (background, non-blocking) ──────────────────
    if (env.RATE_KV) {
      ctx.waitUntil(
        env.RATE_KV.put(key, String(currentCount + 1), { expirationTtl: 86400 })
      );
    }

    // ── Build cacheable response ─────────────────────────────────────────────
    // fetch() transparently decompresses the upstream gzip; we re-serve plain
    // bytes and let Cloudflare re-compress to the client.
    const ttl = cacheTTL(url.pathname);
    const contentType = cflRes.headers.get('content-type') ||
      (url.pathname.endsWith('.png') ? 'image/png' : 'application/json; charset=utf-8');
    const body = await cflRes.arrayBuffer();

    const response = new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=${ttl}, s-maxage=${ttl}`,
        'Access-Control-Allow-Origin': '*',
        'X-Cache': 'MISS',
        'X-Cache-TTL': String(ttl),
      },
    });

    // Store in edge cache (background — don't block the response)
    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  },
};

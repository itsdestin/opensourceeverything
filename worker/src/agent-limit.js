// Slows down anyone asking the AI connector / JSON API too fast: 120 questions per network address per minute.
//
// WHY kept in the server's memory and not in the database like voting is (src/index.js slowDown, src/search.js): the AI
// connector answers every question from files, so it needs no database. Writing a database row per question would let
// a busy assistant use up the free database's daily write allowance, and that allowance is what voting and notes depend on.
// The trade-off: each running copy of the server counts on its own, so the limit is a best-effort guard, not a hard cap.
// The hard stops are the free plan's daily request cap and (if ever needed) one Cloudflare rate-limit rule on /mcp and /v1/.
// WHY a roomy 120: Claude's and ChatGPT's connectors call from the companies' shared addresses, so many people can
// share one address.
const PER_MINUTE = 120;
const seen = new Map(); // "address:minute" -> count

export async function agentLimit(req, env) {
  if (env.DEV_LOGIN === '1') return false; // local testing: every test shares one address
  const minute = Math.floor(Date.now() / 60e3);
  const key = `${req.headers.get('CF-Connecting-IP') ?? 'unknown'}:${minute}`;
  const n = (seen.get(key) ?? 0) + 1; seen.set(key, n);
  if (seen.size > 2000) for (const k of seen.keys()) { if (!k.endsWith(`:${minute}`)) seen.delete(k); } // forget old minutes
  return n > PER_MINUTE;
}

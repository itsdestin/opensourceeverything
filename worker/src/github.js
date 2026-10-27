// Reading GitHub's public pages for the server: suggestion issues and ownership-proof files. Read-only, no one's login.
// WHY a cache: GitHub allows 60 unsigned calls an hour per address, and every visitor shares the server's address.
// Answers are kept 5 minutes (2 for a person's own list). An optional read-only token (GITHUB_READ_TOKEN) lifts the
// limit; see docs/tokens-and-secrets.md. Nothing here ever writes to GitHub.
import { suggestionStatus, suggestionKind, suggestionName } from './rules.js';

const cache = new Map(); // url → { at, data }
const TTL = 5 * 60e3;
export async function ghJson(env, path, ttl = TTL) {
  const base = env.GITHUB_API ?? 'https://api.github.com';
  // WHY an override: tests set GH_CACHE_SECONDS=0 so each check sees the stand-in's current answer; production leaves it unset.
  if (env.GH_CACHE_SECONDS !== undefined) ttl = Number(env.GH_CACHE_SECONDS) * 1000;
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < ttl) return hit.data;
  const r = await fetch(`${base}${path}`, { headers: { 'User-Agent': 'opensourceeverything-api', Accept: 'application/vnd.github+json', ...(env.GITHUB_READ_TOKEN ? { Authorization: `Bearer ${env.GITHUB_READ_TOKEN}` } : {}) } });
  if (!r.ok) { if (hit) return hit.data; throw Object.assign(new Error(`GitHub answered ${r.status}`), { github: r.status }); }
  const data = await r.json();
  cache.set(path, { at: Date.now(), data });
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  return data;
}
export const clearGithubCache = () => cache.clear();

export const suggestionRepo = (env) => env.SUGGESTIONS_REPO ?? 'itsdestin/opensourceeverything';
const onlyIssues = (list) => list.filter((i) => !i.pull_request);
// Every open suggestion, newest first (one call).
export const openSuggestions = async (env) => onlyIssues(await ghJson(env, `/repos/${suggestionRepo(env)}/issues?state=open&labels=suggestion&per_page=100`));
// One person's suggestions, any state (one call). GitHub's own `creator` filter, so it is exactly their issues.
export const suggestionsBy = async (env, login) => onlyIssues(await ghJson(env, `/repos/${suggestionRepo(env)}/issues?state=all&labels=suggestion&creator=${encodeURIComponent(login)}&per_page=50`, 2 * 60e3));

// What a mod or the robot said last on a closed suggestion: the reason it was turned down, or the live link the robot posted.
export async function closingNote(env, number, siteOrigin) {
  const list = await ghJson(env, `/repos/${suggestionRepo(env)}/issues/${number}/comments?per_page=100`);
  let live = null; let reason = null;
  for (const c of list) {
    const m = String(c.body ?? '').match(/<!-- live: (\S+) -->/);
    if (m && m[1].startsWith(siteOrigin)) live = m[1];
    // The robot's own check comment isn't a reason; a person's last comment is.
    else if (c.user?.type !== 'Bot' && !String(c.body ?? '').startsWith('<!-- suggestion-robot -->')) reason = String(c.body).trim().slice(0, 400);
  }
  return { live, reason };
}

// One suggestion as the page sees it.
export const suggestionView = (i, extra = {}) => ({
  number: i.number, name: suggestionName(i), kind: suggestionKind(i), url: i.html_url, author: i.user?.login, created: Date.parse(i.created_at),
  status: suggestionStatus(i), ...extra,
});

// The proof file's text from a project's own public repository; null when it isn't there.
export async function proofFile(env, r, file) {
  const raw = {
    'github.com': `https://raw.githubusercontent.com/${r.owner}/${r.name}/HEAD/${file}`,
    'codeberg.org': `https://codeberg.org/${r.owner}/${r.name}/raw/HEAD/${file}`,
    'gitlab.com': `https://gitlab.com/${r.owner}/${r.name}/-/raw/HEAD/${file}`,
  }[r.host];
  // WHY an override: tests point this at a stand-in; production never sets it.
  const url = env.PROOF_RAW ? `${env.PROOF_RAW}/${r.host}/${r.owner}/${r.name}/${file}` : raw;
  const res = await fetch(url, { headers: { 'User-Agent': 'opensourceeverything-api' }, redirect: 'follow' });
  if (res.status === 404) return null;
  if (!res.ok) throw Object.assign(new Error(`${r.host} answered ${res.status}`), { github: res.status });
  return (await res.text()).slice(0, 2000);
}

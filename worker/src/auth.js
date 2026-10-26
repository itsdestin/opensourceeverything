// Signing in with GitHub, and the session cookie. Security choices: docs/server-rules.md → "Security".
// WHY no permissions asked of GitHub: we only need the public username, id and account age; GitHub's access key is
// thrown away (and revoked) as soon as those are read, so nothing here can touch anyone's GitHub account.
import { safeReturn } from './rules.js';

const SESSION_DAYS = 30;
const COOKIE = 'ose_session';
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export const sha256 = async (s) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));

function cookie(env, value, maxAge) {
  // httpOnly: the page's own code can't read it. SameSite=Lax: other websites can't send it along with their requests.
  // Secure everywhere except plain-http local testing.
  const secure = env.API_ORIGIN.startsWith('https:') ? '; Secure' : '';
  return `${COOKIE}=${value}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export async function currentUser(req, env) {
  const m = (req.headers.get('Cookie') ?? '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{64})`));
  if (!m) return null;
  return env.DB.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires > ?')
    .bind(await sha256(m[1]), Date.now()).first();
}

async function startSession(env, userId, returnTo) {
  const token = randomToken();
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires) VALUES (?, ?, ?)').bind(await sha256(token), userId, Date.now() + SESSION_DAYS * 864e5).run();
  return new Response(null, { status: 302, headers: { Location: returnTo, 'Set-Cookie': cookie(env, token, SESSION_DAYS * 86400), 'Cache-Control': 'no-store' } });
}

export async function login(url, env) {
  const state = randomToken();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM oauth_states WHERE expires < ?').bind(Date.now()),
    env.DB.prepare('INSERT INTO oauth_states (state, return_to, expires) VALUES (?, ?, ?)').bind(state, safeReturn(url.searchParams.get('return'), env.SITE_ORIGIN), Date.now() + 10 * 60e3),
  ]);
  const gh = new URL('https://github.com/login/oauth/authorize');
  gh.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: `${env.API_ORIGIN}/auth/callback`, state, scope: '', allow_signup: 'true' });
  return Response.redirect(gh.href, 302);
}

export async function callback(url, env) {
  const state = url.searchParams.get('state'); const code = url.searchParams.get('code');
  // One-time check: the sign-in must have started here, in the last 10 minutes, and can't be replayed.
  const row = state && await env.DB.prepare('DELETE FROM oauth_states WHERE state = ? AND expires > ? RETURNING return_to').bind(state, Date.now()).first();
  if (!row || !code) return new Response('This sign-in link expired. Go back and try again.', { status: 400 });
  const tok = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: `${env.API_ORIGIN}/auth/callback` }),
  }).then((r) => r.json());
  if (!tok.access_token) return new Response("GitHub didn't confirm the sign-in. Go back and try again.", { status: 400 });
  const gh = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${tok.access_token}`, 'User-Agent': 'opensourceeverything', Accept: 'application/vnd.github+json' } }).then((r) => r.json());
  // WHY revoke right away: we keep nothing that could act on the person's GitHub account.
  await fetch(`https://api.github.com/applications/${env.GITHUB_CLIENT_ID}/token`, {
    method: 'DELETE', headers: { Authorization: `Basic ${btoa(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`)}`, 'User-Agent': 'opensourceeverything', Accept: 'application/vnd.github+json' },
    body: JSON.stringify({ access_token: tok.access_token }),
  }).catch(() => {});
  if (!gh.id || !gh.login) return new Response("Couldn't read your GitHub profile. Go back and try again.", { status: 502 });
  await upsertUser(env, gh.id, gh.login, Date.parse(gh.created_at));
  return startSession(env, gh.id, row.return_to);
}

async function upsertUser(env, id, login, created) {
  await env.DB.prepare(`INSERT INTO users (id, login, github_created, trusted, joined) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET login = excluded.login`).bind(id, login, created, Date.now() - created >= 14 * 864e5 ? 1 : 0, Date.now()).run();
}

// Local testing only: sign in as a made-up account without GitHub. Refused unless DEV_LOGIN is set (never in production).
export async function devLogin(url, env) {
  if (env.DEV_LOGIN !== '1') return new Response('Not found', { status: 404 });
  const login = (url.searchParams.get('login') ?? 'dev').replace(/[^a-z0-9-]/gi, '').slice(0, 39) || 'dev';
  const days = Number(url.searchParams.get('days') ?? 400);
  const id = 1e9 + [...login].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 1e8, 7);
  await upsertUser(env, id, login, Date.now() - days * 864e5);
  return startSession(env, id, safeReturn(url.searchParams.get('return'), env.SITE_ORIGIN));
}

export async function logout(req, env) {
  const m = (req.headers.get('Cookie') ?? '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{64})`));
  if (m) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(m[1])).run();
  return { cookie: cookie(env, '', 0) };
}

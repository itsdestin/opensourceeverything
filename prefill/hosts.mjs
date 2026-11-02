// Facts about a project from the website that hosts its code: stars, archived, last change, license, fork-of.
// Free, public data only, no secrets. Used by prefill/fetch-host-facts.mjs (and so by the weekly refresh).
//
// WHY this file exists (review Oct 26, section 6): the checker and the weekly refresh could only read GitHub,
// so projects on Codeberg, GitLab and the many self-run code sites (KDE, GNOME, Blender, Tor...) kept whatever
// they had on the day they were added. This asks each site's own public API instead.
//
// Three kinds of code site are understood:
//   github   github.com (answered in one batch by GraphQL, needs a token; see githubFacts)
//   gitlab   gitlab.com and any self-run GitLab (GNOME, KDE Invent, Tor, Briar...): /api/v4/projects/<path>
//   forgejo  codeberg.org and any self-run Forgejo or Gitea (Blender, ...): /api/v1/repos/<owner>/<name>
// A site we have never seen is probed: ask the GitLab address, then the Forgejo/Gitea one, and remember which answered.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE = join(HERE, '.cache', 'hosts');
const YEAR = 365 * 24 * 3600 * 1000;
// WHY 6 hours: re-running while testing costs nothing; the weekly robot always starts with an empty cache.
const CACHE_MS = 6 * 3600 * 1000;
const UA = { 'User-Agent': 'opensourceeverything (facts refresh; https://opensourceeverything.org)' };

// Common names the hosts use for licenses -> the SPDX ids the site shows.
const SPDX = { 'gpl-3.0': 'GPL-3.0', 'gpl-2.0': 'GPL-2.0', 'agpl-3.0': 'AGPL-3.0', 'lgpl-3.0': 'LGPL-3.0', 'lgpl-2.1': 'LGPL-2.1', mit: 'MIT',
  'apache-2.0': 'Apache-2.0', 'mpl-2.0': 'MPL-2.0', 'bsd-3-clause': 'BSD-3-Clause', 'bsd-2-clause': 'BSD-2-Clause', isc: 'ISC' };
// WHY 'other'/'no-license' become null: GitLab says "other" when it can't match a known license; that is "unknown", not a license name.
const spdx = (s) => (!s || /^(other|no-license|unknown)$/i.test(s) ? null : SPDX[s.toLowerCase().replace(/-only|-or-later|\+$/g, '')] ?? s);

// Reading a license file when the site's API doesn't report one (Forgejo/Gitea never do).
const LICENSE_TEXTS = [
  [/GNU AFFERO GENERAL PUBLIC LICENSE\s+Version 3/i, 'AGPL-3.0'], [/GNU LESSER GENERAL PUBLIC LICENSE\s+Version 3/i, 'LGPL-3.0'],
  [/GNU LESSER GENERAL PUBLIC LICENSE\s+Version 2\.1/i, 'LGPL-2.1'], [/GNU GENERAL PUBLIC LICENSE\s+Version 3/i, 'GPL-3.0'],
  [/GNU GENERAL PUBLIC LICENSE\s+Version 2/i, 'GPL-2.0'], [/Mozilla Public License,?\s+(Version|v\.?)\s*2\.0/i, 'MPL-2.0'],
  [/Apache License,?\s+Version 2\.0/i, 'Apache-2.0'], [/\bMIT License\b|Permission is hereby granted, free of charge/i, 'MIT'],
  [/BSD 3-Clause|Redistributions of source code must retain[\s\S]{0,600}Neither the name/i, 'BSD-3-Clause'],
];

// Split a stored code link ("codeberg.org/forgejo/forgejo" or "https://invent.kde.org/graphics/krita") into host + path.
export function parseCode(code) {
  if (!code) return null;
  const m = String(code).replace(/^https?:\/\//, '').replace(/\/+$/, '').split('/');
  const host = m.shift().toLowerCase();
  if (!host || !m.length) return null;
  return { host, path: m.join('/') };
}

// ── polite fetching: one place so every request is cached, spaced out and gives up cleanly ──
const lastHit = new Map();
async function politeFetch(url) {
  const f = join(CACHE, createHash('sha1').update(url).digest('hex') + '.json');
  if (existsSync(f)) {
    try { const c = JSON.parse(readFileSync(f, 'utf8')); if (Date.now() - c.at < CACHE_MS) return c; } catch { /* stale or broken: ask again */ }
  }
  // WHY 400 ms between requests to one site: these are volunteers' servers; we are a guest.
  const host = new URL(url).host;
  const wait = 400 - (Date.now() - (lastHit.get(host) ?? 0));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  let out = { at: Date.now(), status: 0, body: null, text: null, headers: {} };
  for (let attempt = 0; attempt < 3; attempt++) {
    lastHit.set(host, Date.now());
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20_000) });
      if (r.status === 429 || r.status === 503) {
        // WHY honour Retry-After (capped): the site is asking us to slow down.
        const s = Math.min(Number(r.headers.get('retry-after')) || 5, 30);
        await new Promise((x) => setTimeout(x, s * 1000));
        continue;
      }
      const text = await r.text();
      let body = null; try { body = JSON.parse(text); } catch { /* not JSON, e.g. a login page */ }
      out = { at: Date.now(), status: r.status, body, text: body ? null : text.slice(0, 20000), headers: { link: r.headers.get('link'), total: r.headers.get('x-total') } };
      break;
    } catch { out.status = 0; }
  }
  // Only keep answers worth keeping: a network failure must not be remembered for 6 hours.
  if (out.status) { mkdirSync(CACHE, { recursive: true }); writeFileSync(f, JSON.stringify(out)); }
  return out;
}

const kindOfHost = new Map([['gitlab.com', 'gitlab'], ['codeberg.org', 'forgejo'], ['github.com', 'github']]);

async function viaGitLab(host, path) {
  const r = await politeFetch(`https://${host}/api/v4/projects/${encodeURIComponent(path)}?license=true`);
  const d = r.body;
  if (r.status !== 200 || !d || typeof d.id !== 'number' || d.path_with_namespace === undefined) return null;
  const rel = await politeFetch(`https://${host}/api/v4/projects/${d.id}/releases?per_page=1`);
  const lr = Array.isArray(rel.body) ? rel.body[0] : null;
  return {
    host, kind: 'gitlab', found: true, stars: d.star_count ?? null, archived: !!d.archived, lastActivity: d.last_activity_at ?? null,
    license: spdx(d.license?.key), licenseHow: d.license?.key ? 'reported by the site' : null, forks: d.forks_count ?? null,
    // WHY forked_from_project: it is the host's own record of "this is a copy of that", the strongest family evidence.
    forkOf: d.forked_from_project?.path_with_namespace ? `https://${host}/${d.forked_from_project.path_with_namespace}` : null,
    latest: lr ? { name: lr.name || lr.tag_name, date: lr.released_at ?? null } : null,
    description: d.description ?? null,
  };
}

async function viaForgejo(host, path) {
  const [owner, name] = path.split('/');
  if (!owner || !name) return null;
  const base = `https://${host}/api/v1/repos/${owner}/${name}`;
  const r = await politeFetch(base);
  const d = r.body;
  if (r.status !== 200 || !d || typeof d.id !== 'number' || d.full_name === undefined) return null;
  // WHY the newest commit, not updated_at: updated_at moves when someone stars, renames or edits settings.
  const c = await politeFetch(`${base}/commits?limit=1&stat=false&verification=false&files=false`);
  const last = Array.isArray(c.body) ? (c.body[0]?.commit?.committer?.date ?? c.body[0]?.created ?? null) : null;
  const rel = await politeFetch(`${base}/releases?limit=1&draft=false&pre-release=false`);
  const lr = Array.isArray(rel.body) ? rel.body[0] : null;
  // The site doesn't report a license, so read the license file itself (same approach as the starter check).
  let license = null;
  for (const file of ['LICENSE', 'LICENSE.md', 'COPYING', 'LICENSE.txt', 'COPYING.md', 'LICENCE']) {
    const t = await politeFetch(`${base}/raw/${file}`);
    const text = t.text ?? (typeof t.body === 'string' ? t.body : null);
    if (t.status === 200 && text) { license = LICENSE_TEXTS.find(([re]) => re.test(text))?.[1] ?? null; if (license) break; }
  }
  return {
    host, kind: 'forgejo', found: true, stars: d.stars_count ?? null, archived: !!d.archived, lastActivity: last ?? d.updated_at ?? null,
    license, licenseHow: license ? 'read from its license file' : null, forks: d.forks_count ?? null,
    // WHY two: a real fork has `parent`; a project moved here from elsewhere keeps `original_url` (Forgejo's page says "migrated from").
    forkOf: d.parent?.html_url ?? null, migratedFrom: d.original_url || null,
    latest: lr ? { name: lr.name || lr.tag_name, date: lr.published_at ?? lr.created_at ?? null } : null,
    description: d.description ?? null,
  };
}

// Ask the right API for one stored code link. Returns { found:false } when nothing answers.
export async function hostFacts(code) {
  const pc = parseCode(code);
  if (!pc || pc.host === 'github.com') return null;
  const known = kindOfHost.get(pc.host);
  const order = known ? [known] : ['gitlab', 'forgejo'];
  for (const k of order) {
    const res = await (k === 'gitlab' ? viaGitLab(pc.host, pc.path) : viaForgejo(pc.host, pc.path));
    if (res) { kindOfHost.set(pc.host, k); return finish(res); }
  }
  // WHY a plain "not found": a git site with no public API (cgit, Gerrit) is normal, not an error.
  return { host: pc.host, kind: 'unknown', found: false };
}

function finish(r) {
  const t = r.lastActivity ? new Date(r.lastActivity).getTime() : NaN;
  return { ...r, quietForAYear: Number.isFinite(t) ? Date.now() - t > YEAR : null };
}

// ── GitHub (only for the few projects added by hand that no other step looks up) ──
export async function githubFacts(list, token) {
  const out = new Map();
  for (let i = 0; i < list.length; i += 50) {
    const part = list.slice(i, i + 50);
    const q = `query { ${part.map((p, k) => { const pc = parseCode(p.code); const [o, n] = pc.path.split('/'); return `r${k}: repository(owner: ${JSON.stringify(o)}, name: ${JSON.stringify(n)}) { nameWithOwner stargazerCount isArchived isFork forkCount pushedAt licenseInfo { spdxId } parent { nameWithOwner url } latestRelease { name tagName publishedAt } }`; }).join('\n')} }`;
    const res = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { ...UA, Authorization: `Bearer ${token}` }, body: JSON.stringify({ query: q }) });
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const body = await res.json();
    part.forEach((p, k) => {
      const d = body.data?.[`r${k}`];
      out.set(p.id, d ? finish({
        host: 'github.com', kind: 'github', found: true, stars: d.stargazerCount, archived: d.isArchived, lastActivity: d.pushedAt,
        license: d.licenseInfo?.spdxId && d.licenseInfo.spdxId !== 'NOASSERTION' ? d.licenseInfo.spdxId : null, licenseHow: d.licenseInfo?.spdxId ? 'reported by the site' : null,
        forks: d.forkCount, forkOf: d.parent?.url ?? null, latest: d.latestRelease ? { name: d.latestRelease.name || d.latestRelease.tagName, date: d.latestRelease.publishedAt } : null,
      }) : { host: 'github.com', kind: 'github', found: false });
    });
  }
  return out;
}

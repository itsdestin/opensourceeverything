// Step 1 of filling the 194 new groups (free, no AI): for every candidate project named in prefill/taxonomy.json, find its
// code, look up its facts on the code site and judge its license with the mod bot's own rule. Writes prefill/out/new-group-facts.json.
// Run: GH_TOKEN=$(gh auth token) node prefill/new-group-facts.mjs
//
// WHY a separate step (Destin, taxonomy-v2 deck "fill the new groups the same way as before": licenses checked with the checker
// first): the "only real open source" promise means a candidate with no open license never reaches the AI step or the site.
// WHY the bot's licenseVerdict: the site and r/TrueOpenSource must agree on what counts as open source.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { licenseVerdict } from '../checker/dist/from-bot/rules.js';
import { hostFacts, githubFacts, parseCode } from './hosts.mjs';
import { repoOf } from './import-lists.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) { console.error('Set GH_TOKEN (e.g. GH_TOKEN=$(gh auth token)).'); process.exit(1); }
const read = (f) => JSON.parse(readFileSync(f, 'utf8'));
const taxonomy = read(join(HERE, 'taxonomy.json'));
const key = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const onMap = new Map(read(join(ROOT, 'data/projects.json')).projects.map((p) => [key(p.name), p]));

// One entry per distinct project (by name), with every new group it was proposed for.
// WHY (Destin: "categories overlap, so let a project appear in several groups"): a project named in two groups is checked once, listed in both.
const byName = new Map();
for (const g of taxonomy.newGroups) for (const c of g.candidates) {
  const e = byName.get(key(c.name)) ?? { name: c.name, url: c.url, groups: [] };
  e.groups.push(g.id); byName.set(key(c.name), e);
}

async function page(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12_000), headers: { 'User-Agent': 'opensourceeverything' }, redirect: 'follow' });
    return r.ok ? (await r.text()).slice(0, 2_000_000) : '';
  } catch { return ''; }
}
// WHY only accept a code link that resembles the project's name (same rule as find-code-links.mjs): homepages also link dependencies.
function pickRepo(html, name) {
  const counts = new Map();
  for (const m of html.matchAll(/https?:\/\/(?:www\.)?(?:github\.com|gitlab\.com|codeberg\.org)\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/gi)) {
    const r = repoOf(m[0].replace(/[.,]+$/, '')); if (r) counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  const k = key(name);
  const ranked = [...counts].sort((a, b) => (key(b[0]).includes(k) ? 1 : 0) - (key(a[0]).includes(k) ? 1 : 0) || b[1] - a[1]);
  const best = ranked[0]?.[0];
  return best && (key(best).includes(k) || k.includes(key(best.split('/')[2] ?? ''))) ? best : null;
}

// WHY more than the three big code sites: many well-known projects keep their code on their own GitLab or Forgejo
// (KDE, GNOME, VideoLAN, freedesktop, Framasoft); hosts.mjs already knows how to ask those.
const SELF_HOSTED = /https?:\/\/(invent\.kde\.org|gitlab\.gnome\.org|code\.videolan\.org|gitlab\.freedesktop\.org|framagit\.org|gitlab\.torproject\.org|git\.sr\.ht|salsa\.debian\.org|gitlab\.xfce\.org|projects\.blender\.org)\/[A-Za-z0-9_.\-/~]+/gi;
function pickSelfHosted(html, name) {
  const k = key(name);
  const hit = [...html.matchAll(SELF_HOSTED)].map((m) => m[0].replace(/[.,)"']+$/, '').replace(/\/(-\/.*|tree\/.*|blob\/.*|issues.*|merge_requests.*)$/, ''))
    .find((u) => key(u.split('/').slice(3).join('')).includes(k) || k.includes(key(u.split('/').pop() ?? 'x')));
  return hit ? hit.replace(/^https?:\/\//, '') : null;
}
// WHY GitHub search by homepage: a project's website often doesn't link its code, but its GitHub page names the website.
// Accept only a repository whose stated homepage is on the same site as the candidate's address, so a namesake can't slip in.
const hostOf = (u) => { try { return new URL(u.startsWith('http') ? u : `https://${u}`).host.replace(/^www\./, ''); } catch { return ''; } };
async function searchGitHub(name, website) {
  const r = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(`${name} in:name`)}&per_page=10`, { headers: { Authorization: `Bearer ${TOKEN}`, 'User-Agent': 'opensourceeverything' } });
  if (r.status === 403 || r.status === 429) { await new Promise((x) => setTimeout(x, 20_000)); return searchGitHub(name, website); }
  if (!r.ok) return null;
  const site = hostOf(website);
  const hit = (await r.json()).items?.find((x) => x.homepage && (hostOf(x.homepage) === site || hostOf(x.homepage).endsWith(`.${site}`) || site.endsWith(`.${hostOf(x.homepage)}`)));
  return hit ? `github.com/${hit.full_name}` : null;
}

// 1. Code links: from the candidate's own address, from the map (already listed elsewhere), or from its website.
const list = [...byName.values()];
const queue = [...list];
await Promise.all(Array.from({ length: 8 }, async () => {
  for (let e = queue.shift(); e; e = queue.shift()) {
    const existing = onMap.get(key(e.name));
    if (existing) { e.existing = existing.id; e.code = existing.code; continue; }
    e.code = repoOf(e.url) ?? (/^https?:\/\/(gitlab\.gnome\.org|invent\.kde\.org)\//.test(e.url) ? e.url.replace(/^https?:\/\//, '') : null);
    if (!e.code) {
      e.website = e.url; const html = await page(e.url);
      e.code = pickRepo(html, e.name) ?? pickSelfHosted(html, e.name); if (e.code) e.codeFoundOn = e.url;
    }
  }
}));
// GitHub's search allows about 30 requests a minute, so this runs one at a time for what is still missing.
for (const e of list.filter((x) => !x.existing && !x.code)) {
  e.code = await searchGitHub(e.name, e.url); if (e.code) e.codeFoundBy = 'GitHub search, homepage matches';
  await new Promise((x) => setTimeout(x, 2_100));
}

// 2. Facts: GitHub in batches of 50 (one request each), other code sites through their own public APIs.
const gh = list.filter((e) => !e.existing && parseCode(e.code)?.host === 'github.com').map((e) => ({ id: key(e.name), code: e.code }));
const ghFacts = await githubFacts(gh, TOKEN);
for (const e of list) {
  if (e.existing || !e.code) continue;
  const f = parseCode(e.code).host === 'github.com' ? ghFacts.get(key(e.name)) : await hostFacts(e.code);
  e.facts = f ?? { found: false };
}

// 3. Verdict. "open" goes on; "unclear" or "missing" waits for the AI step to read the license file; not found is dropped.
for (const e of list) {
  if (e.existing) { e.verdict = 'on-map'; continue; }
  if (!e.code) { e.verdict = 'no-code'; continue; }
  if (!e.facts.found) { e.verdict = 'not-found'; continue; }
  if (e.facts.archived) { e.verdict = 'archived'; continue; }
  e.verdict = licenseVerdict(e.facts.license ?? undefined); // open | unclear | missing
}
writeFileSync(join(HERE, 'out/new-group-facts.json'), JSON.stringify(list, null, 1));
const count = (v) => list.filter((e) => e.verdict === v).length;
console.log(`${list.length} candidates: ${count('on-map')} already on the map, ${count('open')} open, ${count('unclear')} unclear license, ${count('missing')} no license file, ${count('archived')} archived, ${count('not-found')} code not found on its site, ${count('no-code')} no code link found`);

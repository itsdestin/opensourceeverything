// Checks every code link in data/starter.json: does the project exist, what license does its host
// report, is it archived or quiet. Writes data/starter-checked.json and docs/starter-review.md for
// Destin and esk to review. Free. Run: GH_TOKEN=$(gh auth token) node prefill/check-starter.mjs
//
// WHY: the starter set is drafted from general knowledge, so every link and license is verified here
// before anyone relies on it. Same open-source license list as the mod bot.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { licenseVerdict } from '../checker/dist/from-bot/rules.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const starter = JSON.parse(readFileSync(join(ROOT, 'data/starter.json'), 'utf8'));
const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) { console.error('Set GH_TOKEN (e.g. GH_TOKEN=$(gh auth token)).'); process.exit(1); }
const YEAR = 365 * 24 * 3600 * 1000;

const links = new Set();
for (const c of starter.categories) for (const g of c.groups) for (const [, link] of g.alts) links.add(link);

// GitLab and Forgejo report license names their own way; map the common ones to SPDX ids.
const SPDX = { 'gpl-3.0': 'GPL-3.0', 'gpl-2.0': 'GPL-2.0', 'agpl-3.0': 'AGPL-3.0', 'lgpl-3.0': 'LGPL-3.0', 'lgpl-2.1': 'LGPL-2.1', 'mit': 'MIT',
  'apache-2.0': 'Apache-2.0', 'mpl-2.0': 'MPL-2.0', 'bsd-3-clause': 'BSD-3-Clause', 'bsd-2-clause': 'BSD-2-Clause', 'isc': 'ISC' };
const spdx = (s) => (s ? SPDX[s.toLowerCase().replace(/-only|-or-later|\+$/g, '')] ?? s : undefined);

const result = {};
async function githubBatch(list) {
  const q = `query { ${list.map((l, i) => { const [, o, n] = l.split('/'); return `r${i}: repository(owner: ${JSON.stringify(o)}, name: ${JSON.stringify(n)}) { nameWithOwner stargazerCount isArchived pushedAt licenseInfo { spdxId } }`; }).join('\n')} }`;
  const res = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'User-Agent': 'opensourceeverything' }, body: JSON.stringify({ query: q }) });
  const body = await res.json();
  list.forEach((l, i) => {
    const d = body.data?.[`r${i}`];
    result[l] = d ? { found: true, license: d.licenseInfo?.spdxId ?? null, archived: d.isArchived, lastChange: d.pushedAt, stars: d.stargazerCount, movedTo: d.nameWithOwner.toLowerCase() !== l.slice('github.com/'.length).toLowerCase() ? d.nameWithOwner : undefined }
      : { found: false };
  });
}
async function json(url) { try { const r = await fetch(url, { headers: { 'User-Agent': 'opensourceeverything' }, signal: AbortSignal.timeout(15_000) }); return r.ok ? r.json() : null; } catch { return null; } }

const all = [...links];
const gh = all.filter((l) => l.startsWith('github.com/'));
for (let i = 0; i < gh.length; i += 50) await githubBatch(gh.slice(i, i + 50));
for (const l of all.filter((l) => l.startsWith('gitlab.com/'))) {
  const d = await json(`https://gitlab.com/api/v4/projects/${encodeURIComponent(l.slice('gitlab.com/'.length))}?license=true`);
  result[l] = d ? { found: true, license: spdx(d.license?.key) ?? null, archived: d.archived, lastChange: d.last_activity_at, stars: d.star_count } : { found: false };
}
for (const l of all.filter((l) => l.startsWith('codeberg.org/'))) {
  const d = await json(`https://codeberg.org/api/v1/repos/${l.slice('codeberg.org/'.length)}`);
  // WHY byHand: Codeberg's API doesn't report a project's license, so a person reads it.
  result[l] = d ? { found: true, byHand: true, archived: d.archived, lastChange: d.updated_at, stars: d.stars_count } : { found: false };
}
for (const l of all.filter((l) => l.startsWith('https://'))) {
  let ok = false;
  try { ok = (await fetch(l, { method: 'GET', signal: AbortSignal.timeout(15_000), headers: { 'User-Agent': 'opensourceeverything' } })).ok; } catch { /* stays false */ }
  result[l] = { found: ok, byHand: true };
}

// WHY read the license file: GitHub says "NOASSERTION" whenever a project has several license files or
// extra wording, which covers many big projects (Firefox, WordPress) and most "open core" ones.
const LICENSE_TEXTS = [
  [/GNU AFFERO GENERAL PUBLIC LICENSE\s+Version 3/i, 'AGPL-3.0'], [/GNU LESSER GENERAL PUBLIC LICENSE\s+Version 3/i, 'LGPL-3.0'],
  [/GNU LESSER GENERAL PUBLIC LICENSE\s+Version 2\.1/i, 'LGPL-2.1'], [/GNU GENERAL PUBLIC LICENSE\s+Version 3/i, 'GPL-3.0'],
  [/GNU GENERAL PUBLIC LICENSE\s+Version 2/i, 'GPL-2.0'], [/Mozilla Public License,?\s+(Version|v\.?)\s*2\.0/i, 'MPL-2.0'],
  [/Apache License,?\s+Version 2\.0/i, 'Apache-2.0'], [/\bMIT License\b|Permission is hereby granted, free of charge/i, 'MIT'],
  [/BSD 3-Clause|Redistributions of source code must retain[\s\S]{0,600}Neither the name/i, 'BSD-3-Clause'],
];
const NOT_OPEN = [[/Sustainable Use License/i, 'Sustainable Use License'], [/Business Source License/i, 'Business Source License'],
  [/Anti-Capitalist/i, 'Anti-Capitalist Software License'], [/Elastic License/i, 'Elastic License'], [/Server Side Public License/i, 'SSPL'],
  [/Functional Source License/i, 'Functional Source License'], [/Commons Clause/i, 'Commons Clause'], [/Open WebUI License/i, 'Open WebUI License'],
  [/Any Source Available License/i, 'Any Source Available License'], [/Fair Use License/i, 'Fair Use License']];
async function sniff(link) {
  const [, o, n] = link.split('/');
  const lic = await fetch(`https://api.github.com/repos/${o}/${n}/license`, { headers: { Authorization: `Bearer ${TOKEN}`, 'User-Agent': 'opensourceeverything' } });
  const text = lic.ok ? Buffer.from((await lic.json()).content ?? '', 'base64').toString('utf8') : '';
  const root = await fetch(`https://api.github.com/repos/${o}/${n}/contents`, { headers: { Authorization: `Bearer ${TOKEN}`, 'User-Agent': 'opensourceeverything' } });
  const names = root.ok ? (await root.json()).map((f) => f.name.toLowerCase()) : [];
  const notOpen = NOT_OPEN.find(([re]) => re.test(text))?.[1];
  const found = LICENSE_TEXTS.find(([re]) => re.test(text))?.[1];
  // WHY: an "ee" or "enterprise" folder, or a second license file, is how open-core projects keep paid parts apart.
  const openCore = names.some((x) => ['ee', 'enterprise', 'license_ee', 'license-ee', 'ee_license'].includes(x)) || /enterprise edition|\/ee\//i.test(text);
  return { notOpen, found, openCore, licenseFiles: names.filter((x) => /^(license|copying)/.test(x)) };
}
for (const [l, r] of Object.entries(result)) {
  if (l.startsWith('github.com/') && r.found && licenseVerdict(r.license ?? undefined) !== 'open') r.sniffed = await sniff(r.movedTo ? `github.com/${r.movedTo}` : l);
}

// One line per alternative for the review page.
function status(r) {
  if (!r.found) return r.byHand ? '🔍 website didn\'t answer our check; check by hand' : '❌ not found';
  if (r.byHand) return '🔍 check the license by hand (its host doesn\'t report it)';
  const sn = r.sniffed;
  const v = licenseVerdict(r.license ?? undefined);
  // WHY: an open license plus a restrictive one usually means open code with restricted parts (assets, a paid edition).
  // WHY only these two can be "mixed": the others are whole licenses that merely reuse MIT/BSD wording (Open WebUI, the Anti-Capitalist license).
  const mixable = ['Fair Use License', 'Commons Clause'].includes(sn?.notOpen ?? '');
  const parts = sn?.notOpen && sn?.found && mixable ? [`⚠️ ${sn.found} plus ${sn.notOpen}: a person checks which parts are open`]
    : sn?.notOpen ? [`❌ ${sn.notOpen}: not open source`]
    : sn?.found ? [`✅ ${sn.found} (read from its license file)${sn.openCore ? ' · 🔒 open core: some parts paid' : ''}`]
    : [v === 'open' ? `✅ ${r.license}` : v === 'missing' ? '❌ no license found' : `⚠️ ${r.license === 'NOASSERTION' ? 'license unclear to GitHub' : r.license}: a person checks`];
  if (sn && !sn.notOpen && !sn.found && sn.licenseFiles.length > 1) parts.push(`several license files (${sn.licenseFiles.join(', ')})`);
  if (r.archived) parts.push('🗄️ archived');
  else if (r.lastChange && Date.now() - new Date(r.lastChange).getTime() > YEAR) parts.push('💤 no changes in a year');
  if (r.movedTo) parts.push(`↪️ moved to ${r.movedTo}`);
  return parts.join(' · ');
}
let md = `# Starter set: for review\n\nDrafted Oct 27, 2026, then every link checked automatically (${new Date().toISOString().slice(0, 10)}).\n` +
  `✅ open-source license confirmed · ⚠️ needs a person to check the license · ❌ problem · 🔍 not on a host we can read; check by hand · 🗄️ archived · 💤 quiet for a year\n\n` +
  `"Full" = replaces the main job; "partly" = covers part of it.\n`;
const counts = { groups: 0, closed: new Set(), alts: 0, ok: 0, warn: 0, bad: 0, hand: 0 };
for (const c of starter.categories) {
  md += `\n## ${c.name}\n`;
  for (const g of c.groups) {
    counts.groups++; g.closed.forEach((x) => counts.closed.add(x));
    md += `\n### ${g.name}\n*${g.job}.* Replaces: ${g.closed.join(', ')}\n\n`;
    if (!g.alts.length) { md += `No open alternative yet. **A gap.**\n`; continue; }
    md += `| Alternative | Fit | Check | Note |\n|---|---|---|---|\n`;
    for (const [name, link, fit, note] of g.alts) {
      const r = result[link]; const s = status(r); counts.alts++;
      if (s.startsWith('✅')) counts.ok++; else if (s.startsWith('⚠️')) counts.warn++; else if (s.startsWith('🔍')) counts.hand++; else counts.bad++;
      md += `| ${name} | ${fit === 'full' ? 'Full' : 'Partly'} | ${s} | ${note ?? ''} |\n`;
    }
  }
}
md = md.replace('\n"Full"', `\n**${starter.categories.length} categories, ${counts.groups} groups, ${counts.closed.size} closed apps, ${counts.alts} listings.** ` +
  `${counts.ok} confirmed open source, ${counts.warn} need a license check, ${counts.hand} to check by hand, ${counts.bad} problems.\n\n"Full"`);
writeFileSync(join(ROOT, 'data/starter-checked.json'), JSON.stringify(result, null, 1));
writeFileSync(join(ROOT, 'docs/starter-review.md'), md);
console.log(md.split('\n').slice(0, 8).join('\n'));

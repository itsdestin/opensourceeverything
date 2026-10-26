// Step 5 of the pre-fill (free): combine the starter set, the AI-reviewed long tail and the merged new
// groups into the map's data files: data/categories.json, data/groups.json, data/projects.json.
// Run: node prefill/assemble.mjs
//
// WHY three plain JSON files: the map is published as open data people and AI agents can read directly
// (plan §1); the site is built from these, and edits are reviewable as ordinary diffs.

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { licenseVerdict } from '../checker/dist/from-bot/rules.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(HERE, 'out');
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const starter = read(join(ROOT, 'data/starter.json'));
const checked = read(join(ROOT, 'data/starter-checked.json'));
const starterAI = new Map(read(join(OUT, 'ai-review-starter.json')).filter((r) => r.answer).map((r) => [r.name, r.answer]));
const tail = read(join(OUT, 'ai-review.json')).filter((r) => r.answer);
const facts = new Map(read(join(OUT, 'facts.json')).map((f) => [f.id, f]));
const candidates = new Map(read(join(OUT, 'candidates.json')).projects.map((p) => [p.id, p]));
const merged = read(join(OUT, 'new-groups.json'));

const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const key = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const YEAR = 365 * 24 * 3600 * 1000;
const codeHost = (l) => /^(github\.com|gitlab\.com|codeberg\.org)\//.test(l);

// ── Categories and groups ──
const categories = starter.categories.map((c) => ({ id: c.id, name: c.name }));
for (const c of merged.newCategories) if (!categories.some((x) => x.id === c.id)) categories.push({ id: c.id, name: c.name });
const groups = new Map();
for (const c of starter.categories) for (const g of c.groups) groups.set(g.id, { id: g.id, name: g.name, category: c.id, job: g.job, closed: [...g.closed], source: 'starter', alternatives: [] });
const proposalToGroup = new Map();
for (const g of merged.groups) {
  const id = groups.has(g.id) ? `${g.id}-2` : g.id;
  groups.set(id, { id, name: g.name, category: g.category, job: g.job, closed: [...new Set(g.closed)], source: 'lists', alternatives: [] });
  for (const m of g.merges) proposalToGroup.set(m, id);
}

// ── Projects ──
const projects = new Map();
function addProject(p) {
  const id = projects.has(p.id) ? `${p.id}-${slug(p.code ?? p.website ?? 'x').slice(-12)}` : p.id;
  projects.set(id, { ...p, id });
  return id;
}

// Starter projects: group, fit and license were set by hand and checked; the AI wrote the summary.
const starterIds = new Map();
for (const c of starter.categories) for (const g of c.groups) for (const [name, link, fit, note, extra] of g.alts) {
  if (!starterIds.has(name)) {
    const r = checked[link] ?? {}; const ai = starterAI.get(name);
    const lic = r.sniffed?.found ?? (licenseVerdict(r.license ?? undefined) === 'open' ? r.license : null);
    starterIds.set(name, addProject({
      // WHY a disclosure sentence (Destin, Oct 27): a project made by a mod says so in its description, not with a badge.
      id: slug(name), name, summary: [ai?.summary, extra?.disclosure].filter(Boolean).join(' '), kind: ai?.kind ?? 'app',
      // WHY extra: projects on their own code hosts (GIMP, KDE apps, LibreOffice) get their website, download page
      // and code link by hand in starter.json, because no API reports them.
      code: codeHost(link) ? link : (extra?.code ?? (extra?.website ? link : null)), website: extra?.website ?? (codeHost(link) ? null : link),
      download: extra?.download ?? null,
      license: lic, licenseClass: r.sniffed?.openCore ? 'open_core' : 'open',
      // WHY: byHand = its host doesn't report a license (LibreOffice, GIMP, the Linux distributions…); a mod confirms before launch.
      licenseNeedsCheck: !!(r.byHand || (!lic && !r.sniffed?.notOpen)),
      stars: r.stars ?? null, archived: !!r.archived, inactive: !!(r.lastChange && Date.now() - new Date(r.lastChange).getTime() > YEAR),
      unconfirmed: ai?.unconfirmed ?? [], source: 'starter', verified: false,
    }));
  }
  groups.get(g.id).alternatives.push({ project: starterIds.get(name), fit, note: note ?? null });
}

// Long tail: keep open / open-core projects, drop pairings the AI judged wrong, place them by the AI's group choice.
const drop = { notOpen: 0, wrongOnly: 0, archived: 0, noGroup: 0 };
const unplaced = [];
for (const r of tail) {
  const a = r.answer; const f = facts.get(r.id) ?? {}; const cand = candidates.get(r.id);
  if (!['open', 'open_core'].includes(a.license.verdict)) { drop.notOpen++; continue; }
  const good = a.replaces.filter((x) => x.fit !== 'no');
  if (!good.length) { drop.wrongOnly++; continue; }
  if (f.archived) { drop.archived++; continue; }
  // WHY the closed-app match (found Oct 27: a notification tool landed under LinkedIn): an AI-chosen starter group
  // only counts if one of the closed apps this project really replaces is one that group covers.
  const covers = (gid) => groups.get(gid).closed.some((c) => good.some((x) => key(x.closedApp) === key(c)));
  // Plus: any group (starter or merged) whose closed apps include one this project replaces.
  const byClosed = [...groups.keys()].filter(covers);
  const gids = [...new Set([...byClosed, ...a.groups.filter((g) => groups.has(g) && groups.get(g).source === 'starter' && covers(g)), ...(a.newGroup && proposalToGroup.has(a.newGroup) ? [proposalToGroup.get(a.newGroup)] : [])])];
  if (!gids.length) { drop.noGroup++; unplaced.push({ name: r.name, code: r.repo, replaces: good.map((x) => x.closedApp), aiGroups: a.groups, summary: a.summary }); continue; }
  // WHY: GitHub follows moved repositories, so two list entries (old and new owner) can be one project; f.repo is where it lives now.
  const code = f.repo ? `github.com/${f.repo}` : r.repo;
  const same = [...projects.values()].find((x) => x.code?.toLowerCase() === code.toLowerCase() || key(x.name) === key(r.name));
  const id = same ? same.id : addProject({
    id: slug(r.name), name: r.name, summary: a.summary, kind: a.kind,
    code, website: cand?.urls.find((u) => !codeHost(u.replace(/^https?:\/\/(www\.)?/, ''))) ?? null,
    license: f.license && f.license !== 'NOASSERTION' ? f.license : null, licenseClass: a.license.verdict,
    licenseNeedsCheck: !f.license || f.license === 'NOASSERTION',
    stars: f.stars ?? null, archived: false, inactive: !!f.quietForAYear,
    unconfirmed: a.unconfirmed, source: 'lists', sourceLists: cand?.sources ?? [], verified: false,
  });
  const fit = good.some((x) => x.fit === 'full') ? 'full' : 'partial';
  for (const gid of gids) {
    const g = groups.get(gid);
    if (!g.alternatives.some((x) => x.project === id)) g.alternatives.push({ project: id, fit, note: null });
    // WHY no longer adding the project's other closed apps to the group (Opus check, Oct 27): one project that
    // replaced both Figma and Contentful put "Contentful" on the Figma group, which then pulled in CMS tools.
    // Group closed-app lists stay as set by hand (starter) or by the group merge.
  }
}

// ── Opus corrections (prefill/opus-fix.mjs), applied last so they survive a rebuild ──
const fixFile = join(OUT, 'opus-fix.json');
const fixes = { removed: 0, fit: 0, summary: 0 };
if (existsSync(fixFile)) {
  const rewritten = new Set();
  for (const r of read(fixFile)) {
    const g = groups.get(r.group); const v = r.verdict;
    const alt = g?.alternatives.find((x) => x.project === r.project);
    if (!alt || !v) continue;
    if (!v.keep) { g.alternatives = g.alternatives.filter((x) => x !== alt); fixes.removed++; continue; }
    // WHY keep the reason on the listing: a mod can see what the correction pass changed and why.
    if (v.fit !== alt.fit) { alt.fit = v.fit; fixes.fit++; }
    if (v.reason) alt.review = { by: 'claude-opus-5-5', reason: v.reason };
    const proj = projects.get(r.project);
    if (v.summary && proj && !rewritten.has(r.project)) { proj.summary = v.summary; rewritten.add(r.project); fixes.summary++; }
  }
  // A project whose every listing was removed leaves the map.
  const listed = new Set([...groups.values()].flatMap((g) => g.alternatives.map((a) => a.project)));
  for (const id of [...projects.keys()]) if (!listed.has(id)) projects.delete(id);
}

// ── Website and download links (prefill/fetch-links.mjs) ──
// WHY: pages link "Website" and "Download" next to "Source code" (Destin, Oct 27). A project's own site wins over
// one a list gave; "release" is its latest downloadable release page.
const linksFile = join(OUT, 'links.json');
if (existsSync(linksFile)) {
  const links = read(linksFile);
  for (const p of projects.values()) { const l = p.code && links[p.code]; if (l) { if (l.website) p.website = l.website; p.release = l.release ?? null; } }
}

// ── Screenshots (prefill/fetch-screenshots.mjs + check-screenshots.mjs): up to 4 real interface shots each ──
const shotsFile = join(OUT, 'screenshots.json');
if (existsSync(shotsFile)) { const shots = read(shotsFile); for (const p of projects.values()) p.screenshots = shots[p.id] ?? []; }

// ── Devices (prefill/fetch-platforms.mjs + check-platforms.mjs, then hand fixes in prefill/platform-fixes.json) ──
// WHY (Destin, Oct 27): "can I just install this on my laptop or phone?" is a newcomer's first question.
const platFile = join(OUT, 'platforms.json');
if (existsSync(platFile)) {
  const plat = read(platFile); const fixes = read(join(HERE, 'platform-fixes.json')).fixes;
  const ORDER = ['windows', 'mac', 'linux', 'android', 'ios', 'web', 'server'];
  for (const p of projects.values()) p.platforms = (fixes[p.id] ?? plat[p.id]?.platforms ?? []).slice().sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
}

// ── Hand corrections and approved suggestions, applied last so nothing automatic overwrites them ──
// WHY in this order: researched fixes first (licenses, screenshots, the expert review), then mods' approved
// suggestions (data/edits.json), so a later human decision always wins over an earlier one.
const optional = (f) => (existsSync(f) ? read(f) : null);
const dropProject = (id) => { projects.delete(id); for (const g of groups.values()) g.alternatives = g.alternatives.filter((a) => a.project !== id); };
const alt = (gid, pid) => groups.get(gid)?.alternatives.find((a) => a.project === pid);

// Licenses researched from each project's own LICENSE file (prefill/license-fixes.json). A mod still confirms
// them (licenseNeedsCheck stays on) until data/license-confirmed.json lists the project.
const confirmed = new Set(optional(join(ROOT, 'data/license-confirmed.json'))?.projects ?? []);
for (const [id, f] of Object.entries(optional(join(HERE, 'license-fixes.json'))?.fixes ?? {})) {
  const p = projects.get(id); if (!p) continue;
  if (f.verdict === 'not_open') { dropProject(id); continue; }
  if (f.verdict === 'open' || f.verdict === 'open_core') { p.license = f.license; p.licenseClass = f.verdict; p.licenseSource = f.evidence; }
}
for (const p of projects.values()) if (confirmed.has(p.id)) p.licenseNeedsCheck = false;

// Screenshots picked by hand from official sources (Flathub, project sites, Wikimedia Commons) for projects with none.
for (const [id, urls] of Object.entries(optional(join(HERE, 'screenshot-fixes.json'))?.fixes ?? {})) {
  const p = projects.get(id); if (p && !p.screenshots?.length) p.screenshots = urls.slice(0, 4);
}

// The expert review of the most-visited groups (prefill/review-edits.json, written by Opus).
const review = optional(join(HERE, 'review-edits.json'));
if (review) {
  for (const [k, fit] of Object.entries(review.fit ?? {})) { const [g, p] = k.split('/'); const a = alt(g, p); if (a) a.fit = fit; }
  for (const [k, note] of Object.entries(review.note_text ?? {})) { const [g, p] = k.split('/'); const a = alt(g, p); if (a) a.note = note; }
  for (const [id, s] of Object.entries(review.summary ?? {})) { const p = projects.get(id); if (p) p.summary = s; }
  for (const [id, pl] of Object.entries(review.platforms ?? {})) { const p = projects.get(id); if (p) p.platforms = pl; }
  for (const k of review.remove ?? []) { const [g, p] = k.split('/'); const gr = groups.get(g); if (gr) gr.alternatives = gr.alternatives.filter((a) => a.project !== p); }
}

// Mods' approved suggestions (data/edits.json, written by .github/robot/suggestion.mjs).
for (const e of optional(join(ROOT, 'data/edits.json'))?.edits ?? []) {
  if (e.type === 'add-project' && groups.has(e.group)) {
    const id = projects.has(slug(e.name)) ? projects.get(slug(e.name)).id : addProject({
      id: slug(e.name), name: e.name, summary: e.byTeam ? `${e.summary} Listed by the project's own team.` : e.summary,
      kind: e.platforms?.length === 1 && e.platforms[0] === 'server' ? 'self_hosted' : 'app', code: e.code, website: e.website, download: null,
      license: e.license ?? null, licenseClass: 'open', licenseNeedsCheck: !e.license, stars: null, archived: false, inactive: false,
      unconfirmed: [], source: `suggestion #${e.issue}`, verified: false, screenshots: [], platforms: e.platforms ?? [] });
    if (!alt(e.group, id)) groups.get(e.group).alternatives.push({ project: id, fit: e.fit, note: e.note });
    for (const c of e.replaces ?? []) if (![...groups.values()].some((g) => g.closed.includes(c))) groups.get(e.group).closed.push(c);
  } else if (e.type === 'fix') {
    const p = projects.get(e.project); if (!p) continue;
    if (e.field === 'platforms') p.platforms = e.value;
    else if (e.field === 'summary') p.summary = e.value;
    else if (e.field === 'license') { p.license = e.value; p.licenseNeedsCheck = false; }
    else if (e.field === 'link') p.website = e.value;
    else if (e.field === 'fit' && alt(e.group, e.project)) alt(e.group, e.project).fit = e.value;
    else if (e.field === 'note' && alt(e.group, e.project)) alt(e.group, e.project).note = e.value;
  } else if (e.type === 'add-closed-app' && groups.has(e.group) && !groups.get(e.group).closed.includes(e.app)) {
    groups.get(e.group).closed.push(e.app);
  } else if (e.type === 'new-group' && !groups.has(e.id)) {
    groups.set(e.id, { id: e.id, name: e.name, category: e.category, job: e.job, closed: e.closed, source: `suggestion #${e.issue}`, alternatives: [] });
  } else if (e.type === 'remove-project') {
    dropProject(e.project);
  }
}

// ── Write ──
const groupList = [...groups.values()].sort((a, b) => categories.findIndex((c) => c.id === a.category) - categories.findIndex((c) => c.id === b.category));
const unknownCat = groupList.filter((g) => !categories.some((c) => c.id === g.category));
if (unknownCat.length) throw new Error(`groups in unknown categories: ${unknownCat.map((g) => g.id).join(', ')}`);
const meta = { license: 'CC BY-SA 4.0', generated: new Date().toISOString().slice(0, 10), credits: 'See data/CREDITS.md' };
writeFileSync(join(ROOT, 'data/categories.json'), JSON.stringify({ ...meta, categories }, null, 1));
writeFileSync(join(ROOT, 'data/groups.json'), JSON.stringify({ ...meta, groups: groupList }, null, 1));
writeFileSync(join(ROOT, 'data/projects.json'), JSON.stringify({ ...meta, projects: [...projects.values()].sort((a, b) => a.name.localeCompare(b.name)) }, null, 1));

const listings = groupList.reduce((s, g) => s + g.alternatives.length, 0);
const empty = groupList.filter((g) => !g.alternatives.length).map((g) => g.name);
const perCat = categories.map((c) => `${c.name} ${groupList.filter((g) => g.category === c.id).length} groups / ${groupList.filter((g) => g.category === c.id).reduce((s, g) => s + g.alternatives.length, 0)} listings`).join(' · ');
const msg = `
## Step 5: the map's data files (${meta.generated}, free)

- **${categories.length} categories, ${groupList.length} groups, ${groupList.reduce((s, g) => s + g.closed.length, 0)} closed apps, ${projects.size} projects, ${listings} listings.**
- From the long tail, left out: ${drop.notOpen} not open source or unclear, ${drop.wrongOnly} wrongly listed, ${drop.archived} archived, ${drop.noGroup} with no matching group (listed in prefill/out/unplaced.json for a person to place).
- Licenses a mod confirms before launch: ${[...projects.values()].filter((p) => p.licenseNeedsCheck).length}. Inactive (no change in a year): ${[...projects.values()].filter((p) => p.inactive).length}.
- Opus corrections applied: ${fixes.removed} listings removed, ${fixes.fit} fits changed, ${fixes.summary} descriptions rewritten.
- Groups with no alternative yet (gaps): ${empty.join(', ') || 'none'}.
- By category: ${perCat}.
`;
writeFileSync(join(OUT, 'unplaced.json'), JSON.stringify(unplaced, null, 1));
appendFileSync(join(OUT, 'summary.md'), msg);
console.log(msg);

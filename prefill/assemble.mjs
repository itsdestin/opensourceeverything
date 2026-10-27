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

// Hand placements (prefill/placements.json) for projects the import couldn't sort: new groups and extra closed apps
// let them match, aliases fix list spellings ("AirTable"), and skip leaves some out on purpose.
const placements = existsSync(join(HERE, 'placements.json')) ? read(join(HERE, 'placements.json')) : { newGroups: [], addClosed: {}, aliases: {}, skip: {} };
for (const g of placements.newGroups) if (!groups.has(g.id)) groups.set(g.id, { ...g, closed: [...g.closed], source: 'placement', alternatives: [] });
for (const [gid, apps] of Object.entries(placements.addClosed)) for (const a of apps) if (groups.has(gid) && !groups.get(gid).closed.includes(a)) groups.get(gid).closed.push(a);
const alias = (s) => placements.aliases[s] ?? s;

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
  if (placements.skip[r.name]) { drop.skipped = (drop.skipped ?? 0) + 1; continue; }
  // WHY the closed-app match (found Oct 27: a notification tool landed under LinkedIn): an AI-chosen starter group
  // only counts if one of the closed apps this project really replaces is one that group covers.
  const covers = (gid) => groups.get(gid).closed.some((c) => good.some((x) => key(alias(x.closedApp)) === key(c)));
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

// ── Hand-added family projects (prefill/family-projects.json) ──
// WHY (forks stream, review Oct 26 section 5): well-known relatives were missing (Apache OpenOffice, VSCodium, Valkey,
// OpenTofu, Floorp...), so a fork and its original could not be shown side by side. Each is added with a license read
// from its own files (licenseSource) and placed in a group. Skipped quietly if the map already has that project.
const familyAdded = [];
const famFile = join(HERE, 'family-projects.json');
if (existsSync(famFile)) {
  const fam = read(famFile);
  for (const g of fam.newGroups ?? []) if (!groups.has(g.id)) groups.set(g.id, { ...g, closed: [...g.closed], source: 'family', alternatives: [] });
  for (const { groups: placed, ...f } of fam.projects) {
    const code = f.code?.replace(/^https?:\/\//, '').toLowerCase();
    if (projects.has(f.id) || [...projects.values()].some((x) => code && x.code?.replace(/^https?:\/\//, '').toLowerCase() === code)) continue;
    projects.set(f.id, { ...f }); familyAdded.push(f.id);
    for (const a of placed) groups.get(a.group)?.alternatives.push({ project: f.id, fit: a.fit, note: a.note });
  }
  for (const a of fam.extraAlts ?? []) {
    const g = groups.get(a.group);
    if (g && projects.has(a.project) && !g.alternatives.some((x) => x.project === a.project)) g.alternatives.push({ project: a.project, fit: a.fit, note: a.note });
  }
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
  // WHY `?? p.platforms` below (forks stream): hand-added family projects carry their own devices and have no scan result.
  const plat = read(platFile); const fixes = read(join(HERE, 'platform-fixes.json')).fixes;
  const ORDER = ['windows', 'mac', 'linux', 'android', 'ios', 'web', 'server'];
  for (const p of projects.values()) p.platforms = (fixes[p.id] ?? plat[p.id]?.platforms ?? p.platforms ?? []).slice().sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
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
  // WHY confirmed here (Destin, Oct 27: "i dont wanna deal with this many things"): a license read from the
  // project's own LICENSE file, with the link kept, counts as checked. Mods only see the unclear ones.
  if (f.verdict === 'open' || f.verdict === 'open_core') { p.license = f.license; p.licenseClass = f.verdict; p.licenseSource = f.evidence; p.licenseNeedsCheck = false; }
}
for (const p of projects.values()) if (confirmed.has(p.id)) p.licenseNeedsCheck = false;
// Verified tags: chosen by r/TrueOpenSource mods (data/verified.json): open-source license, maintained, really does the job.
const verifiedIds = new Set(optional(join(ROOT, 'data/verified.json'))?.projects ?? []);
for (const p of projects.values()) p.verified = verifiedIds.has(p.id);

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

// ── Data fixes (prefill/data-fixes.json): wrong closed apps, duplicate names, groups that were split, big missing apps ──
// WHY here, after the expert review and before mods' suggestions: a rebuild keeps these fixes, and a mod's later
// decision (data/edits.json) still wins over them. Every entry in that file carries its own "why".
const redirects = {}; const appRedirects = {}; // old group id -> new group ids, written to data/redirects.json so old links keep working
const df = optional(join(HERE, 'data-fixes.json'));
if (df) {
  const need = (cond, msg) => { if (!cond) throw new Error(`data-fixes.json: ${msg}`); };
  const clean = ({ why, ...rest }) => rest; // "why" is documentation, not data
  for (const r of df.closedRemove ?? []) { const g = groups.get(r.group); need(g?.closed.includes(r.app), `closedRemove: ${r.app} not in ${r.group}`); g.closed = g.closed.filter((c) => c !== r.app); }
  for (const r of df.closedRename ?? []) { const g = groups.get(r.group); need(g?.closed.includes(r.from), `closedRename: ${r.from} not in ${r.group}`); g.closed = g.closed.map((c) => (c === r.from ? r.to : c)); }
  for (const r of df.closedAdd ?? []) for (const gid of [].concat(r.group)) { const g = groups.get(gid); need(g, `closedAdd: no group ${gid}`); if (!g.closed.some((c) => key(c) === key(r.app))) g.closed.push(r.app); }
  for (const p of df.addProjects ?? []) {
    need(!projects.has(p.id), `addProjects: ${p.id} already exists`);
    projects.set(p.id, { archived: false, inactive: false, download: null, licenseClass: 'open', licenseNeedsCheck: false, unconfirmed: [], source: 'data-fixes', verified: false, screenshots: [], ...clean(p) });
  }
  for (const [id, patch] of Object.entries(df.projectPatch ?? {})) { need(projects.has(id), `projectPatch: no project ${id}`); Object.assign(projects.get(id), clean(patch)); }
  for (const [k, patch] of Object.entries(df.altPatch ?? {})) { const [g, p] = k.split('/'); need(alt(g, p), `altPatch: ${k} not listed`); Object.assign(alt(g, p), clean(patch)); }
  // A group's alternatives from a spec: a bare project id keeps the old fit and note; an object sets them.
  // WHY the old "review" is dropped: it explained a fit chosen for the old, mixed-up group and no longer applies.
  const build = (spec, from) => spec.alts.map((a) => {
    const o = typeof a === 'string' ? { project: a } : a;
    need(projects.has(o.project), `${spec.id}: no project ${o.project}`);
    const old = from?.alternatives.find((x) => x.project === o.project);
    need(old || (o.fit !== undefined), `${spec.id}: ${o.project} is not in ${from?.id} and has no fit`);
    return { project: o.project, fit: o.fit ?? old.fit, note: o.note !== undefined ? o.note : (old?.note ?? null) };
  });
  const make = (spec, from) => groups.set(spec.id, { id: spec.id, name: spec.name, category: spec.category, job: spec.job, closed: [...spec.closed], source: 'data-fixes', alternatives: build(spec, from) });
  for (const s of df.splits ?? []) {
    const from = groups.get(s.from); need(from, `split: no group ${s.from}`);
    for (const spec of s.into) { need(!groups.has(spec.id), `split: ${spec.id} already exists`); make(spec, from); }
    groups.delete(s.from); redirects[s.from] = s.into.map((x) => x.id);
  }
  Object.assign(appRedirects, df.appRedirects ?? {});
  for (const spec of df.newGroups ?? []) { need(!groups.has(spec.id), `newGroups: ${spec.id} already exists`); make(spec, null); }
  for (const r of df.addAlts ?? []) { const g = groups.get(r.group); need(g && projects.has(r.project), `addAlts: ${r.group}/${r.project}`); if (!alt(r.group, r.project)) g.alternatives.push({ project: r.project, fit: r.fit, note: r.note ?? null }); }
}

// Facts from each project's own code site (prefill/fetch-host-facts.mjs: Codeberg, GitLab, KDE, GNOME, Blender, Tor...)
// plus fork count and latest release (GitHub: prefill/out/links.json; others: the same host facts).
// WHY after the hand fixes, before mods' suggestions: stars, "archived" and "quiet for a year" are plain measurements and
// should be fresh; a license is only FILLED IN when we had none (a license a person already checked is never overwritten).
const hostFile = join(OUT, 'host-facts.json');
const hostNotes = { applied: 0, licenseFilled: 0 };
if (existsSync(hostFile)) {
  for (const [id, f] of Object.entries(read(hostFile))) {
    const p = projects.get(id); if (!p || !f.found) continue;
    hostNotes.applied++;
    // WHY stars only from the big public hosts (or when we already had a number): a small self-run site's star count (Krita 91 on KDE Invent,
    // while its fans star the GitHub mirror) would make well-loved projects look unpopular in sorting and search.
    if (f.stars != null && (p.stars != null || ['github.com', 'gitlab.com', 'codeberg.org'].includes(f.host))) p.stars = f.stars;
    p.archived = !!f.archived;
    if (f.quietForAYear != null) p.inactive = f.quietForAYear;
    if (!p.license && f.license && licenseVerdict(f.license) === 'open') { p.license = f.license; p.licenseSource = f.licenseHow; p.licenseNeedsCheck = false; hostNotes.licenseFilled++; }
    if (f.forks != null) p.forks = f.forks;
    if (f.latest) p.latestRelease = f.latest;
  }
}
if (existsSync(linksFile)) {
  const lk = read(linksFile);
  for (const p of projects.values()) { const l = p.code && lk[p.code]; if (!l) continue; if (l.forkCount != null) p.forks = l.forkCount; if (l.latest) p.latestRelease = l.latest; }
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

// WHY after the hand fixes: hand-picked screenshots need their small copies too.
// Small copies for cards (prefill/make-thumbs.mjs), matched to each screenshot by its address.
const thumbsFile = join(OUT, 'thumbs.json');
if (existsSync(thumbsFile)) {
  const th = read(thumbsFile);
  for (const p of projects.values()) { const t = (p.screenshots ?? []).map((u) => th[p.id]?.find((x) => x?.from === u)?.file ?? null); p.thumbs = t.map((f) => (f ? `assets/shots/${f}` : null)); }
}

// ── Setup rating (prefill/setup-ratings.json): "Easy setup" or "Advanced setup" on every project ──
// WHY (Destin, Oct 26): the old "Runs on your own server" wording meant nothing to newcomers. The rating answers one
// question: can an ordinary person start using this today? Default from what kind of project it is; hand-researched
// exceptions (an installable app hidden behind a server-software kind, a project that is itself a website, or an OS install) override it, each with its reason.
const setupFile = optional(join(HERE, 'setup-ratings.json')) ?? { easy: {}, advanced: {} };
for (const p of projects.values()) {
  const onlyServer = p.platforms?.length === 1 && p.platforms[0] === 'server';
  // A "self-hosted" entry with no server in its list is a website you simply visit (OpenStreetMap), so it is easy.
  const easyByDefault = p.kind === 'app' ? !onlyServer : p.kind === 'self_hosted' && p.platforms?.length > 0 && !p.platforms.includes('server');
  p.setup = easyByDefault ? 'easy' : 'advanced';
  // WHY setupWhy only for hand overrides: the everyday reason follows from the kind and is worded in site/src/lib.mjs,
  // so the data file doesn't repeat the same sentence 400 times.
  delete p.setupWhy;
  const o = setupFile.easy[p.id] ? ['easy', setupFile.easy[p.id]] : setupFile.advanced[p.id] ? ['advanced', setupFile.advanced[p.id]] : null;
  if (o) { p.setup = o[0]; p.setupWhy = o[1]; }
}
for (const k of ['easy', 'advanced']) for (const id of Object.keys(setupFile[k])) if (!projects.has(id)) console.warn(`setup-ratings.json: unknown project "${id}"`);
// ── Families (data/lineage.json, hand-edited): which project came from which, and how ──
// WHY a hand-edited input file and not a guess (review Oct 26 section 5): fork disputes are personal and the site speaks
// for the subreddit, so every claim needs a sourced, neutral sentence and a person's sign-off. The robot only SUGGESTS.
const RELATIONS = ['fork-keeps-up', 'split', 'continues', 'renamed', 'built-on', 'free-edition', 'unrelated-same-name'];
const lineageNotes = { kept: 0, skipped: [] };
for (const [id, e] of Object.entries(optional(join(ROOT, 'data/lineage.json'))?.lineage ?? {})) {
  const bad = (why) => { throw new Error(`data/lineage.json "${id}": ${why}`); };
  if (!RELATIONS.includes(e.relation)) bad(`relation must be one of ${RELATIONS.join(', ')}`);
  if (!e.of && !e.ofName) bad('needs "of" (a project id) or "ofName" (a project that is not on the map)');
  if (!e.why || e.why.length > 400) bad('"why" is one short neutral sentence');
  if (!/^https:\/\//.test(e.source ?? '')) bad('"source" must be an https link that backs the claim');
  if (!['mod', 'suggested'].includes(e.confirmed)) bad('"confirmed" must be "mod" or "suggested"');
  const p = projects.get(id);
  // WHY skip instead of failing: a project can leave the map (a mod removes it) without the family file being edited first.
  if (!p) { lineageNotes.skipped.push(`${id} (not on the map)`); continue; }
  if (e.of && !projects.has(e.of)) { lineageNotes.skipped.push(`${id} (parent ${e.of} not on the map)`); continue; }
  const { of, ofName, ofUrl, relation, since, why, source, confirmed, label, oldNames, redirectFrom } = e;
  p.lineage = Object.fromEntries(Object.entries({ of, ofName, ofUrl, relation, since, why, source, confirmed, label, oldNames, redirectFrom }).filter(([, v]) => v != null));
  lineageNotes.kept++;
}

// WHY: a project whose last listing was removed (by the review or a mod) has no page to belong to.
const listed = new Set([...groups.values()].flatMap((g) => g.alternatives.map((a) => a.project)));
for (const id of [...projects.keys()]) if (!listed.has(id)) projects.delete(id);

// ── Write ──
const groupList = [...groups.values()].sort((a, b) => categories.findIndex((c) => c.id === a.category) - categories.findIndex((c) => c.id === b.category));
const unknownCat = groupList.filter((g) => !categories.some((c) => c.id === g.category));
if (unknownCat.length) throw new Error(`groups in unknown categories: ${unknownCat.map((g) => g.id).join(', ')}`);
// WHY a hard stop (found Oct 26: "Datadog"/"DataDog", "Power BI"/"PowerBI", and Odoo/Orbit named as both a closed app
// and an open project): a rebuild must not bring these back unnoticed.
for (const g of groupList) {
  const seen = new Set();
  for (const c of g.closed) { if (seen.has(key(c))) throw new Error(`duplicate closed app "${c}" in ${g.id}`); seen.add(key(c)); }
}
const projectKeys = new Set([...projects.values()].map((p) => key(p.name)));
for (const g of groupList) for (const c of g.closed) if (projectKeys.has(key(c))) throw new Error(`"${c}" is listed as a closed app in ${g.id} and is also an open project`);
const meta = { license: 'CC BY-SA 4.0', generated: new Date().toISOString().slice(0, 10), credits: 'See data/CREDITS.md' };
writeFileSync(join(ROOT, 'data/categories.json'), JSON.stringify({ ...meta, categories }, null, 1));
writeFileSync(join(ROOT, 'data/groups.json'), JSON.stringify({ ...meta, groups: groupList }, null, 1));
writeFileSync(join(ROOT, 'data/redirects.json'), JSON.stringify({ ...meta, note: 'Groups that were split: old group id → the groups that replaced it. The site keeps the old address working.', moved: redirects, apps: appRedirects }, null, 1));
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
- Families: ${lineageNotes.kept} lineage entries read from data/lineage.json${lineageNotes.skipped.length ? `; skipped: ${lineageNotes.skipped.join(', ')}` : ''}. Hand-added family projects: ${familyAdded.length}. Facts from code sites applied to ${hostNotes.applied} projects (${hostNotes.licenseFilled} licenses filled in).
`;
writeFileSync(join(OUT, 'unplaced.json'), JSON.stringify(unplaced, null, 1));
appendFileSync(join(OUT, 'summary.md'), msg);
console.log(msg);

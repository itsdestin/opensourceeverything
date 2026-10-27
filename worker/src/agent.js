// What AI assistants can ask the map: the seven tools behind both the AI connector (POST /mcp, src/mcp.js) and the plain
// JSON API (GET /v1/..., src/v1.js). One set of functions, so a question gets the same answer either way.
//
// WHERE THE FACTS COME FROM: the site's own published files, which are the same two files the site serves:
//   /data/catalog.json  everything about every group, project and closed app (built by site/src/catalog.mjs)
//   /search.json        the index the site's search box ranks (site/src/search-index.mjs)
// No database is touched, so the connector costs nothing to run and can never show anything the public site doesn't.
//
// WHY COPIES BUNDLED INTO THE SERVER, not fetched on each cold start (measured Oct 26): turning search.json into the
// search tables takes ~70 ms of computing and reading catalog.json ~5 ms, and a free Cloudflare Worker gets 10 ms per
// request. Done once when the server starts (outside any request) it costs requests nothing, so `npm run snapshot`
// (scripts/snapshot.mjs, run automatically by deploy and test) copies both files in at deploy time. The price: the
// connector shows the map as of the last deploy; every answer says its `generated` date. Setting AGENT_DATA=live in
// wrangler.toml switches to fetching the site's current files instead (fresher, but over 10 ms on a cold start: needs a
// paid Workers plan).
// WHY the SAME search as the site: the ranking code below is the site's own file (site/assets/search-core.js), imported,
// not copied. Fix the search once and the website and every AI assistant get the fix. worker/test/agent.test.mjs checks
// the two give identical top results for all the search test sets.
import '../../site/assets/search-core.js'; // sets globalThis.OISearch (the same file the browser loads)

export const SITE = 'https://opensourceeverything.org';
const REPO = 'https://github.com/itsdestin/opensourceeverything';

// Said once per answer so an assistant that forwards the answer also forwards the rules for using it.
const SOURCE = (D) => ({ license: 'CC BY-SA 4.0', generated: D.catalog.generated, cite: 'Cite the page links. Listings were drafted with AI assistance and are managed by r/TrueOpenSource moderators.' });

export const appSlug = (name) => String(name ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ── Loading and indexing the site's files ──
import catalogSnap from './generated/catalog.json' with { type: 'json' };
import searchSnap from './generated/search.json' with { type: 'json' };

export function indexData(catalog, searchJson) {
  const projects = new Map(catalog.projects.map((p) => [p.id, p]));
  const groups = new Map(catalog.groups.map((g) => [g.id, g]));
  const apps = new Map(catalog.apps.map((a) => [a.slug, a]));
  // Other spellings ("DataDog") and loose names ("ms word") resolve through this.
  const appByName = new Map();
  for (const a of catalog.apps) for (const n of [a.name, ...a.otherSpellings]) appByName.set(appSlug(n), a);
  const projectsByName = new Map(catalog.projects.map((p) => [appSlug(p.name), p]));
  const groupsByName = new Map(catalog.groups.map((g) => [appSlug(g.name), g]));
  const items = globalThis.OISearch.prepare(searchJson); // the one-time cost of building the search tables
  return { catalog, projects, groups, apps, appByName, projectsByName, groupsByName, items };
}

// Built when the server starts, not during a request (see the note at the top).
let bundled = indexData(catalogSnap, searchSnap);
// WHY a few throwaway searches now: the first search in a fresh server is ~7x slower than later ones while the JavaScript
// engine warms up (15 ms vs 2 ms measured). Doing it here, at start-up, keeps that cost out of the first real request.
for (const q of ['photo editor', 'alternatiev to notion', 'password manager for linux', 'keep my family photos private']) globalThis.OISearch.search(bundled.items, q);
export const useData = (D) => { bundled = D; live = { at: 0, D: null, pending: null }; }; // tests swap in small fixture data

let live = { at: 0, D: null, pending: null };
export async function loadData(env) {
  if (env?.AGENT_DATA !== 'live') return bundled;
  if (live.D && Date.now() - live.at < 10 * 60e3) return live.D;
  // WHY one shared in-flight load: two requests arriving together on a cold server should not fetch twice.
  if (!live.pending) {
    live.pending = (async () => {
      const get = async (path) => { const r = await fetch(`${env.SITE_ORIGIN ?? SITE}${path}`, { cf: { cacheTtl: 600 } }); if (!r.ok) throw new Error(`${path} ${r.status}`); return r.json(); };
      const [catalog, searchJson] = await Promise.all([get('/data/catalog.json'), get('/search.json')]);
      live = { at: Date.now(), D: indexData(catalog, searchJson), pending: null };
      return live.D;
    })().catch((e) => { live.pending = null; if (live.D) return live.D; throw e; });
  }
  return live.pending;
}

// ── Small shapes used by several tools ──
// A project as one line in a list: enough to choose, short enough to read many at once.
const short = (p, extra = {}) => ({
  id: p.id, name: p.name, page: p.page, summary: p.summary.length > 170 ? `${p.summary.slice(0, 167).replace(/\s+\S*$/, '')}...` : p.summary,
  setup: p.setup, platforms: p.platforms, license: p.license, licenseClass: p.licenseClass, stars: p.stars, status: p.status, verified: p.verified,
  ...(p.family ? { family: p.family.text } : {}), ...extra,
});
const DEVICES = ['windows', 'mac', 'linux', 'android', 'ios', 'web'];
// The word added to a search so the site's own device handling kicks in ("linux" lifts Linux apps). web has no safe word.
const DEVICE_WORD = { windows: 'windows', mac: 'mac', linux: 'linux', android: 'android', ios: 'iphone' };
const runs = (p, device) => (device ? p.platforms.includes(device) : undefined);
const offer = (list, device, setup, limit) => {
  let out = list;
  if (setup === 'easy' || setup === 'advanced') out = out.filter((x) => x.setup === setup);
  if (device) out = [...out.filter((x) => x.platforms.includes(device)), ...out.filter((x) => !x.platforms.includes(device))]; // lift, never hide
  return out.slice(0, limit);
};
const topOf = (D, alts, n = 3) => alts.slice(0, n).map((a) => ({ id: a.project, name: D.projects.get(a.project).name, fit: a.fit, setup: D.projects.get(a.project).setup }));
const pickEnum = (v, allowed) => (allowed.includes(v) ? v : undefined);

export class ToolError extends Error {}

// Finds a project/group/app the way a person would type it: exact id or name first; failing that, the site's own search,
// but only when it is clearly sure (a "Best match" that beats the runner-up by a margin). So "Photoshop" finds "Adobe
// Photoshop", while a vague word returns "did you mean..." instead of a confident wrong answer.
function findBy(D, kind, text) {
  const key = appSlug(text);
  const exact = kind === 'project' ? D.projects.get(String(text).toLowerCase()) ?? D.projects.get(key) ?? D.projectsByName.get(key)
    : kind === 'group' ? D.groups.get(String(text).toLowerCase()) ?? D.groups.get(key) ?? D.groupsByName.get(key)
    : D.apps.get(key) ?? D.appByName.get(key);
  if (exact || key.length < 2) return exact;
  const sec = globalThis.OISearch.search(D.items, String(text).slice(0, 100)).find((s) => s.kind === (kind === 'app' ? 'closed' : kind));
  const [top, next] = sec?.items ?? [];
  if (!top || top.level < 4 || (next && next.level >= 4 && top.score - next.score < 0.15)) return undefined;
  const id = top.u.replace(/^(alternatives-to|g|p)\//, '').replace(/\/$/, '');
  return kind === 'project' ? D.projects.get(id) : kind === 'group' ? D.groups.get(id) : D.apps.get(id);
}
// Said when the name typed was not the listed name, so the assistant tells the user what it actually looked up.
const matchedAs = (item, text) => (appSlug(item.name) === appSlug(text) || String(item.id ?? item.slug) === String(text).toLowerCase() ? {} : { matchedAs: item.name });
function didYouMean(D, text, kind) {
  const sec = globalThis.OISearch.search(D.items, String(text)).find((s) => s.kind === kind);
  return (sec?.items ?? []).slice(0, 3).map((x) => x.n);
}
const notFound = (D, kind, text, idName) => {
  const maybe = didYouMean(D, text, kind === 'app' ? 'closed' : kind);
  return new ToolError(`No ${kind} matches "${text}".${maybe.length ? ` Did you mean: ${maybe.join(', ')}?` : ''} Use search to find the right ${idName}.`);
};

// ── The tools ──
export const TOOLS = {
  // 1. Search: the site's own ranking.
  search(D, { query, device, setup, limit } = {}) {
    if (typeof query !== 'string' || query.trim().length < 2) throw new ToolError('Give a query of a few words, e.g. "open alternative to Notion" or "private photo backup".');
    device = pickEnum(device, DEVICES); setup = pickEnum(setup, ['easy', 'advanced']);
    // WHY a cap of 20 words: ranking time grows with every word, and the free server plan allows 10 ms. 20 is far past any real
    // question (the longest of the 458 test searches has 13), and a lower cap changed answers: at 12 words a test search
    // gave a different result than the website, which the same-results test caught. So this only stops abuse.
    query = query.trim().split(/\s+/).slice(0, 20).join(' ').slice(0, 200);
    const text = `${query}${device && DEVICE_WORD[device] ? ` ${DEVICE_WORD[device]}` : ''}`;
    const sections = globalThis.OISearch.search(D.items, text);
    const cap = Math.min(Math.max(Number(limit) || 15, 1), 30);
    const results = [];
    for (const sec of sections) for (const x of sec.items) {
      if (sec.kind === 'closed') {
        const a = D.apps.get(x.u.replace(/^alternatives-to\/|\/$/g, ''));
        if (a) results.push({ type: 'closed_app', name: a.name, page: a.page, match: x.strength, next: `alternatives_to("${a.name}")`, bestAlternatives: topOf(D, a.alternatives) });
      } else if (sec.kind === 'group') {
        const g = D.groups.get(x.u.replace(/^g\/|\/$/g, ''));
        if (g) results.push({ type: 'group', id: g.id, name: g.name, page: g.page, job: g.job, replaces: g.closedApps, coverage: g.coverage, match: x.strength, bestAlternatives: topOf(D, g.alternatives) });
      } else {
        const p = D.projects.get(x.u.replace(/^p\/|\/$/g, ''));
        if (p && (!setup || p.setup === setup)) results.push({ type: 'project', ...short(p, { match: x.strength, ...(device ? { runsOnYourDevice: runs(p, device) } : {}) }) });
      }
    }
    return {
      query, ...(device ? { device } : {}), ...(setup ? { setup } : {}),
      // Same order as the site's search box. To pick for a newcomer: prefer fit "full" and setup "easy" (see alternatives_to / get_group).
      results: results.slice(0, cap),
      ...(results.length ? {} : { hint: 'Nothing matched. Try the closed app\'s name ("Notion"), the job ("password manager") or call list_gaps: it may be a job nothing open does yet.' }),
      source: SOURCE(D),
    };
  },

  // 2. Alternatives to one closed app, across all the groups it appears in.
  alternatives_to(D, { app, device, setup, limit } = {}) {
    if (typeof app !== 'string' || !app.trim()) throw new ToolError('Name the closed-source app, e.g. "Photoshop".');
    device = pickEnum(device, DEVICES); setup = pickEnum(setup, ['easy', 'advanced']);
    const a = findBy(D, 'app', app);
    if (!a) throw notFound(D, 'app', app, 'app name');
    const list = a.alternatives.map((r) => { const p = D.projects.get(r.project); const g = D.groups.get(r.group); const alt = g.alternatives.find((x) => x.project === r.project);
      return { ...short(p), fit: r.fit, rank: r.rank, why: alt?.why, note: alt?.note, group: r.group, ...(device ? { runsOnYourDevice: runs(p, device) } : {}) }; });
    const shown = offer(list, device, setup, Math.min(Math.max(Number(limit) || 10, 1), 30));
    const fullCount = list.filter((x) => x.fit === 'full').length;
    return {
      app: a.name, ...matchedAs(a, app), page: a.page, groups: a.groups.map((id) => ({ id, name: D.groups.get(id).name, job: D.groups.get(id).job, coverage: D.groups.get(id).coverage, page: D.groups.get(id).page })),
      totalAlternatives: list.length, fullReplacements: fullCount,
      // Said plainly so an assistant does not oversell a partial fit.
      advice: !list.length ? 'Nothing open does this yet. It is a gap on the map: say so, and link the group page, where people can ask for it.'
        : !fullCount ? 'Nothing open fully replaces this yet; every option covers only part of the job. Say which parts (see note).'
        : 'Best first. For a non-technical person pick fit "full" with setup "easy"; "advanced" means running a server or the command line.',
      alternatives: shown, source: SOURCE(D),
    };
  },

  // 3. One group (one job), every alternative in order.
  get_group(D, { id, device, setup } = {}) {
    if (typeof id !== 'string') throw new ToolError('Give a group id such as "photo-editing" (find ids with search).');
    const g = findBy(D, 'group', id);
    if (!g) throw notFound(D, 'group', id, 'group id');
    device = pickEnum(device, DEVICES); setup = pickEnum(setup, ['easy', 'advanced']);
    const list = g.alternatives.map((r) => { const p = D.projects.get(r.project); return { ...short(p), fit: r.fit, rank: r.rank, why: r.why, note: r.note, ...(device ? { runsOnYourDevice: runs(p, device) } : {}) }; });
    return {
      id: g.id, name: g.name, ...matchedAs(g, id), page: g.page, category: g.categoryName, job: g.job, replaces: g.closedApps, coverage: g.coverage,
      coverageMeaning: { none: 'No open project does this job yet.', partial: 'Only parts of the job are covered; nothing replaces it fully.', 'one-full': 'Exactly one project does the whole job.' }[g.coverage] ?? 'Two or more projects do the whole job.',
      alternatives: offer(list, device, setup, 60), source: SOURCE(D),
    };
  },

  // 4. One project, every fact.
  get_project(D, { id } = {}) {
    if (typeof id !== 'string') throw new ToolError('Give a project id such as "immich" (find ids with search).');
    const p = findBy(D, 'project', id);
    if (!p) throw notFound(D, 'project', id, 'project id');
    const inGroups = D.catalog.groups.filter((g) => g.alternatives.some((a) => a.project === p.id)).map((g) => { const a = g.alternatives.find((x) => x.project === p.id);
      return { id: g.id, name: g.name, page: g.page, replaces: g.closedApps, fit: a.fit, rank: a.rank, note: a.note, why: a.why }; });
    return { ...p, ...matchedAs(p, id), listedIn: inGroups, source: SOURCE(D) };
  },

  // 5. The gaps: jobs open source doesn't do (fully) yet.
  list_gaps(D, { category, coverage, limit } = {}) {
    const want = pickEnum(coverage, ['none', 'partial', 'one-full']);
    const cat = category ? D.catalog.categories.find((c) => c.id === category || appSlug(c.name) === appSlug(category)) : null;
    if (category && !cat) throw new ToolError(`Unknown category "${category}". Categories: ${D.catalog.categories.map((c) => c.id).join(', ')}.`);
    const rows = D.catalog.groups.filter((g) => g.coverage && (!want || g.coverage === want) && (!cat || g.category === cat.id))
      .sort((a, b) => ['none', 'partial', 'one-full'].indexOf(a.coverage) - ['none', 'partial', 'one-full'].indexOf(b.coverage) || a.name.localeCompare(b.name));
    const cap = Math.min(Math.max(Number(limit) || 40, 1), 150);
    return {
      meaning: { none: 'nothing open yet', partial: 'only parts of the job', 'one-full': 'only one project does it all' },
      total: rows.length,
      gaps: rows.slice(0, cap).map((g) => ({ id: g.id, name: g.name, page: g.page, category: g.categoryName, job: g.job, replaces: g.closedApps, coverage: g.coverage, options: topOf(D, g.alternatives, 5) })),
      howToHelp: `People can ask for a gap to be filled with "I want this too" on its page; builders see what is asked for most. Group pages: ${SITE}/gaps/`,
      source: SOURCE(D),
    };
  },

  // 6. Side by side.
  compare(D, { project_ids } = {}) {
    const ids = Array.isArray(project_ids) ? project_ids : typeof project_ids === 'string' ? project_ids.split(',') : [];
    if (ids.length < 2 || ids.length > 6) throw new ToolError('Give between 2 and 6 project ids to compare.');
    const ps = ids.map((i) => { const p = findBy(D, 'project', String(i).trim()); if (!p) throw notFound(D, 'project', i, 'project id'); return p; });
    const set = new Set(ps.map((p) => p.id));
    return {
      projects: ps.map((p) => ({ id: p.id, name: p.name, page: p.page, summary: p.summary, kind: p.kind, setup: p.setup, setupWhy: p.setupWhy, platforms: p.platforms,
        license: p.license, licenseClass: p.licenseClass, stars: p.stars, status: p.status, verified: p.verified, latestRelease: p.latestRelease, family: p.family?.text ?? null })),
      // Forks and renames among the chosen ones, so "which is the original?" is answered.
      relationsBetweenThem: ps.filter((p) => p.family?.of && set.has(p.family.of)).map((p) => `${p.name}: ${p.family.text} (${p.family.why})`),
      sharedGroups: D.catalog.groups.filter((g) => ps.every((p) => g.alternatives.some((a) => a.project === p.id))).map((g) => ({ id: g.id, name: g.name, page: g.page,
        fits: Object.fromEntries(ps.map((p) => [p.id, g.alternatives.find((a) => a.project === p.id).fit])) })),
      source: SOURCE(D),
    };
  },

  // 7. How someone can help a project (and the map).
  how_to_contribute(D, { project_id } = {}) {
    if (typeof project_id !== 'string') throw new ToolError('Give a project id such as "immich".');
    const p = findBy(D, 'project', project_id);
    if (!p) throw notFound(D, 'project', project_id, 'project id');
    const h = p.howToHelp;
    return {
      project: p.name, page: p.page, helpSection: `${p.page}#help`,
      code: p.code, website: p.website,
      contributingGuide: h?.contributingGuide ?? null, goodFirstIssues: h?.goodFirstIssues ?? null, helpWanted: h?.helpWanted ?? null, plugins: h?.plugins ?? null,
      note: h ? 'These links come from the project\'s own GitHub page. Read its contributing guide before opening anything.' : 'No contributing links are on record. Try the code link\'s issues tab, or the project website.',
      fixThisListing: { text: 'Wrong or missing fact on the Open Source Everything listing? Suggest a change via the GitHub form (moderators review it).', url: `${REPO}/issues/new?template=2-fix.yml&project=${encodeURIComponent(p.name)}` },
      source: SOURCE(D),
    };
  },
};

// ── Descriptions agents read. The rules for use are repeated where an agent will see them (Destin: cite, prefer easy). ──
const RULES = ' Data is CC BY-SA 4.0: always cite the page URLs in the result. Listings were drafted with AI assistance and are managed by r/TrueOpenSource moderators, so tell the user to check the project page for anything important. For non-technical users prefer fit "full" and setup "easy" (installs like a normal app or runs in a browser); "advanced" setup means running a server or the command line.';
const DEVICE_PROP = { type: 'string', enum: DEVICES, description: 'The user\'s device. Projects that run there are listed first; others are marked, never hidden.' };
const SETUP_PROP = { type: 'string', enum: ['easy', 'advanced'], description: 'Only show projects with this setup rating. Use "easy" for non-technical users.' };
export const TOOL_DEFS = [
  { name: 'search', title: 'Search the map', description: 'Search Open Source Everything for open-source replacements. Works with an app name ("Notion"), a job ("password manager"), or a plain-words need ("keep my family photos private"). Uses the same ranking as the website search. Returns closed apps, jobs (groups) and projects, best first, each with a page link.' + RULES,
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'What the user wants, in their own words.' }, device: DEVICE_PROP, setup: SETUP_PROP, limit: { type: 'integer', minimum: 1, maximum: 30 } }, required: ['query'] } },
  { name: 'alternatives_to', title: 'Open alternatives to a closed app', description: 'The main question: "what can replace X for me?" Returns open-source alternatives to one closed-source app (e.g. Photoshop, Notion, Spotify) across every job it covers, best first, each with fit (full = does the whole job, partial = some of it), setup, devices, license, activity and the reason it is ranked there.' + RULES,
    inputSchema: { type: 'object', properties: { app: { type: 'string', description: 'The closed-source app\'s name.' }, device: DEVICE_PROP, setup: SETUP_PROP, limit: { type: 'integer', minimum: 1, maximum: 30 } }, required: ['app'] } },
  { name: 'get_group', title: 'One job and everything that does it', description: 'One group (a job such as "Photo editing"): the closed apps it replaces and every open alternative in ranked order, with coverage (none / partial / one-full / several).' + RULES,
    inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Group id from search results, e.g. "photo-editing".' }, device: DEVICE_PROP, setup: SETUP_PROP }, required: ['id'] } },
  { name: 'get_project', title: 'Everything about one project', description: 'Every fact on file for one open-source project: summary, setup rating and why, devices, license and class, stars, active/inactive/archived, Verified, latest release, family (fork/rename/continuation), links, the jobs it is listed under and how well it fits each.' + RULES,
    inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Project id from search results, e.g. "immich". A project name also works.' } }, required: ['id'] } },
  { name: 'list_gaps', title: 'Jobs open source does not do yet', description: 'The gaps: jobs where no open-source project (or only parts, or only one) replaces the closed apps. Useful for "is there anything open for X?" when search finds nothing, and for people deciding what to build.' + RULES,
    inputSchema: { type: 'object', properties: { category: { type: 'string', description: 'Optional category id or name to narrow to.' }, coverage: { type: 'string', enum: ['none', 'partial', 'one-full'], description: 'none = nothing open yet; partial = only parts of the job; one-full = a single project does it all.' }, limit: { type: 'integer', minimum: 1, maximum: 150 } } } },
  { name: 'compare', title: 'Compare projects side by side', description: 'Side-by-side facts for 2 to 6 projects (setup, devices, license, activity, Verified, family), plus how they are related (for example which one is a fork of another) and the jobs they share.' + RULES,
    inputSchema: { type: 'object', properties: { project_ids: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 6, description: 'Project ids from search results.' } }, required: ['project_ids'] } },
  { name: 'how_to_contribute', title: 'How to help a project', description: 'Where someone who wants to help a project goes next: its contributing guide, "good first issue" and "help wanted" links, plugin docs, and the form for fixing a wrong listing on Open Source Everything. Links come from the project\'s own pages.' + RULES,
    inputSchema: { type: 'object', properties: { project_id: { type: 'string', description: 'Project id from search results.' } }, required: ['project_id'] } },
].map((t) => ({ ...t, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false, title: t.title } }));

export const SERVER_INSTRUCTIONS = 'Open Source Everything maps open-source replacements for closed-source apps, grouped by the job they do, and the jobs nothing open does yet. To answer "what can replace X?" call alternatives_to. If the user describes a need instead of an app, call search first. ' + RULES.trim();

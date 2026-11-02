// The open data for AI assistants and scripts: one complete, stable catalog plus one file per project, per closed app
// and per group. Built by site/build.mjs into site/dist/data/. The Worker's AI connector (worker/src/agent.js) and
// the plain JSON API read these same files, so a person's agent, the connector and the site all see the same facts.
//
// WHY one module that builds all of it: the facts (which setup, which family, why this one is first) must be worded
// the same in every file. Everything here is picked field by field from the data (an allow-list), so a new internal
// field added to data/ later can never leak into the public files by accident; site/check.mjs checks it again.
//
// WHY the order is the site's default order: rank.mjs, the same function the pages use. Without community votes
// (the static files cannot know them), so it is the order a new visitor sees. Each alternative says why in plain words.
import { SITE_URL, setupOf, setupWhy, codeUrl } from './lib.mjs';
import { sortAlts, whyLine, appSlug } from './cards.mjs';
import { familyIndex, shown, ownText, status } from './family.mjs';

// Bump when a field is renamed, removed or changes meaning (adding a field does not need a bump).
export const SCHEMA_VERSION = 1;
export const NOTICE = 'Data from Open Source Everything (https://opensourceeverything.org), licensed CC BY-SA 4.0: use it freely, credit the site, link to the page, and share changes under the same license. '
  + 'Listings were drafted with AI assistance and are managed by the r/TrueOpenSource moderators; check a project\'s own page before relying on a fact.';

const page = (path) => `${SITE_URL}${path}`;
export const pageOf = { project: (id) => page(`p/${id}/`), group: (id) => page(`g/${id}/`), app: (name) => page(`alternatives-to/${appSlug(name)}/`) };

// ── One project, in the words an assistant needs to choose ──
function projectFacts(p, fam) {
  const lin = shown(p);
  const help = p.help ? {
    contributingGuide: p.help.contributing ?? null,
    goodFirstIssues: p.help.good ? { count: p.help.good.n, url: p.help.good.url } : null,
    helpWanted: p.help.wanted ? { count: p.help.wanted.n, url: p.help.wanted.url } : null,
    plugins: p.help.plugins ? { label: p.help.plugins.label, url: p.help.plugins.url } : null,
  } : null;
  return {
    id: p.id, name: p.name, page: pageOf.project(p.id), summary: p.summary,
    kind: p.kind,                              // app | self_hosted | developer_tool | library
    setup: setupOf(p),                         // easy | advanced
    setupWhy: setupWhy(p),
    platforms: p.platforms ?? [],              // windows mac linux android ios web server
    license: p.license ?? null, licenseClass: p.licenseClass ?? null, licenseNeedsCheck: !!p.licenseNeedsCheck,
    stars: p.stars ?? null, forks: p.forks ?? null,
    status: status(p).key,                     // active | inactive | archived
    verified: !!p.verified,
    latestRelease: p.latestRelease ?? null,
    code: codeUrl(p), website: p.website ?? null, download: p.download ?? null, release: p.release ?? null,
    // The family, only when a moderator confirmed it (same rule as the site).
    family: lin ? { relation: lin.relation, of: lin.of ?? null, ofName: lin.of ? fam.d.projById.get(lin.of)?.name ?? null : lin.ofName ?? null, ofUrl: lin.ofUrl ?? null,
      since: lin.since ?? null, text: ownText(p, fam), why: lin.why, sourceUrl: lin.source ?? null } : null,
    // What other listed projects say they are made from this one (forks, continuations, renames).
    familyChildren: (fam.kids.get(p.id) ?? []).map((k) => ({ id: k.id, name: k.name, relation: shown(k).relation })).sort((a, b) => a.id.localeCompare(b.id)),
    howToHelp: help,
  };
}

// A group's alternatives in ranked order. `rank` is 1-based; `why` is the short reason line shown on the site.
function rankedAlts(d, g) {
  return sortAlts(g.alternatives.map((a) => ({ a, p: d.projById.get(a.project) })).filter((x) => x.p))
    .map((x, i) => ({ project: x.p.id, rank: i + 1, fit: x.a.fit, note: x.a.note ?? null, why: whyLine(x.why), score: Math.round(x.score * 10) / 10 }));
}

// How well a group is covered: none (nothing open yet), partial (only parts of the job), one-full (one project does it all),
// or null (two or more full replacements). Same tiers as the site's Gaps page.
export function coverage(g) {
  const full = g.alternatives.filter((a) => a.fit === 'full').length;
  return g.alternatives.length === 0 ? 'none' : full === 0 ? 'partial' : full === 1 ? 'one-full' : null;
}

export function buildAgentData(d, generated) {
  const fam = familyIndex(d);
  // WHY `dataLicense` as well as `license`: a project file's own `license` is the PROJECT's license (MIT, GPL...), which must not
  // overwrite the license of the data itself. `dataLicense` is always CC BY-SA 4.0; `license` is too, except on project files.
  const envelope = (extra) => ({ schemaVersion: SCHEMA_VERSION, generated, dataLicense: 'CC BY-SA 4.0', license: 'CC BY-SA 4.0', notice: NOTICE, ...extra });
  const facts = new Map(d.projects.map((p) => [p.id, projectFacts(p, fam)]));
  const catName = (id) => d.catById.get(id)?.name ?? null;

  // Closed apps by address (Datadog and DataDog are one app), named by the first spelling, as the site does.
  const appMap = new Map();
  for (const g of d.groups) for (const c of g.closed) {
    const e = appMap.get(appSlug(c)) ?? appMap.set(appSlug(c), { name: c, groups: [], aka: new Set() }).get(appSlug(c));
    if (!e.groups.includes(g)) e.groups.push(g);
    e.aka.add(c);
  }

  const groupRanked = new Map(d.groups.map((g) => [g.id, rankedAlts(d, g)]));
  const groupRow = (g) => ({
    id: g.id, name: g.name, page: pageOf.group(g.id), category: g.category, categoryName: catName(g.category), job: g.job,
    closedApps: g.closed, coverage: coverage(g), alternatives: groupRanked.get(g.id),
  });

  // An app's alternatives across all its groups, best first, one row per project (its best fit, then best score, wins).
  const appAlts = (e) => {
    const best = new Map();
    for (const g of e.groups) for (const r of groupRanked.get(g.id)) {
      const cur = best.get(r.project);
      if (!cur || (r.fit === 'full' && cur.fit !== 'full') || (r.fit === cur.fit && r.score > cur.score)) best.set(r.project, { ...r, group: g.id });
    }
    return [...best.values()].sort((a, b) => (b.fit === 'full') - (a.fit === 'full') || b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }));
  };

  // ── catalog.json: everything in one file ──
  const apps = [...appMap.entries()].map(([slug, e]) => ({
    slug, name: e.name, page: pageOf.app(e.name), otherSpellings: [...e.aka].filter((n) => n !== e.name),
    groups: e.groups.map((g) => g.id), alternatives: appAlts(e).map((r) => ({ project: r.project, fit: r.fit, rank: r.rank, group: r.group })),
  }));
  const catalog = envelope({
    page: SITE_URL,
    about: 'Open-source replacements for closed-source apps, grouped by the job they do, plus the jobs nothing open does yet. Alternatives are listed best first.',
    counts: { groups: d.groups.length, projects: d.projects.length, closedApps: apps.length },
    // WHY areas here too (taxonomy-v2): an agent asked "what's in Hardware?" needs the same top level visitors see.
    areas: d.areas.map((a) => ({ id: a.id, name: a.name, categories: a.categories })),
    categories: d.categories.map((c) => ({ id: c.id, name: c.name, area: d.areaOf.get(c.id)?.id })),
    groups: d.groups.map(groupRow),
    projects: [...facts.values()],
    apps,
  });

  // ── one file per project / app / group ──
  const withFacts = (r) => ({ ...facts.get(r.project), ...r });
  const projectFiles = new Map(d.projects.map((p) => [p.id, envelope({
    ...facts.get(p.id),
    // Where it is listed: the group, how well it fits there and its place in that group's list.
    groups: (d.groupsByProject.get(p.id) ?? []).map(({ group: g }) => {
      const r = groupRanked.get(g.id).find((x) => x.project === p.id);
      return { id: g.id, name: g.name, page: pageOf.group(g.id), job: g.job, closedApps: g.closed, fit: r?.fit, note: r?.note, rank: r?.rank, why: r?.why };
    }),
  })]));
  const appFiles = new Map(apps.map((a) => {
    const e = appMap.get(a.slug);
    return [a.slug, envelope({
      app: a.name, slug: a.slug, page: a.page, otherSpellings: a.otherSpellings,
      note: 'alternatives is merged across the app\'s groups (best first); groups lists each group\'s own ranked list.',
      alternatives: appAlts(e).map(withFacts),
      groups: e.groups.map((g) => ({ id: g.id, name: g.name, page: pageOf.group(g.id), job: g.job, coverage: coverage(g), alternatives: groupRanked.get(g.id).map(withFacts) })),
    })];
  }));
  const groupFiles = new Map(d.groups.map((g) => [g.id, envelope({
    ...groupRow(g), source: pageOf.group(g.id), group: g.name, replaces: g.closed,
    alternatives: groupRanked.get(g.id).map(withFacts),
  })]));
  return { catalog, projectFiles, appFiles, groupFiles };
}

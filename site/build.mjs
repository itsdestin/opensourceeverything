// Builds the Open Source Everything site into site/dist/ from the map's data files. No outside packages.
// Run: node site/build.mjs        Preview: node site/serve.mjs  (then open the address it prints)
//
// WHY pre-built pages: every group and project gets its own fast page search engines can read; the browser
// only adds search and menus on top. Pages come from site/src/pages/*.mjs: each exports a default function
// (data) => [{ path, title, description, body, styles?, scripts?, search?, jsonLd? }].

import { readdirSync, mkdirSync, writeFileSync, rmSync, cpSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadData, url, SITE_URL } from './src/lib.mjs';
import { page } from './src/layout.mjs';
import { searchIndex } from './src/search-index.mjs';
import { familyIndex } from './src/family.mjs';
import { buildAgentData } from './src/catalog.mjs';
import { openApi } from './src/openapi.mjs';
import { llmsTxt } from './src/llms.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const DIST = join(HERE, 'dist');
const d = loadData(ROOT);
familyIndex(d); // families (data/lineage.json): built once so cards and pages share it

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
const write = (rel, text) => { const f = join(DIST, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, text); };

// ── Pages ──
const pages = [];
for (const f of readdirSync(join(HERE, 'src/pages')).filter((f) => f.endsWith('.mjs')).sort()) {
  const mod = await import(pathToFileURL(join(HERE, 'src/pages', f)).href);
  pages.push(...mod.default(d));
}
for (const p of pages) write(p.path.endsWith('/') || p.path === '' ? join(p.path, 'index.html') : p.path, page(p));

// ── Open data: the same files as data/, plus one file per group with its projects inlined (for AI assistants) ──
// WHY a public copy without internal fields (Destin, Oct 26): the AI pre-fill left notes for mods ("what we couldn't
// confirm", "reviewed by claude-…") in the source files. They stay in data/ in the repo, but the files the site serves
// (and llms.txt points to) leave them out. check.mjs fails the build if one slips through.
const INTERNAL_PROJECT = ['unconfirmed', 'source', 'sourceLists'];
const publicGroups = (groups) => groups.map((g) => ({ ...g, source: undefined, alternatives: g.alternatives.map(({ review, ...a }) => a) }));
const publicProjects = (projects) => projects.map((p) => Object.fromEntries(Object.entries(p).filter(([k]) => !INTERNAL_PROJECT.includes(k))));
const readJson = (f) => JSON.parse(readFileSync(join(ROOT, 'data', f), 'utf8'));
for (const f of ['categories.json', 'CREDITS.md', 'README.md', 'redirects.json']) { try { write(join('data', f), readFileSync(join(ROOT, 'data', f), 'utf8')); } catch { /* optional */ } }
write(join('data', 'groups.json'), JSON.stringify({ ...readJson('groups.json'), groups: publicGroups(d.groups) }, null, 1));
write(join('data', 'projects.json'), JSON.stringify({ ...readJson('projects.json'), projects: publicProjects(d.projects) }, null, 1));
// ── Complete files for AI assistants and scripts (site/src/catalog.mjs) ──
// WHY (review Oct 26 section 6, Destin: "improve tooling for agentic access to our database"): one file with everything an
// agent needs to answer "what can replace X for me?" (catalog.json), plus one small file per project, closed app and group,
// each with a version number (schemaVersion), the date (generated), the CC BY-SA notice and the page to cite.
// The per-group files used to leave out the id, stars, devices, Verified and activity; now they carry everything.
const generated = readJson('projects.json').generated ?? new Date().toISOString().slice(0, 10);
const agent = buildAgentData(d, generated);
write(join('data', 'catalog.json'), JSON.stringify(agent.catalog));
for (const [id, f] of agent.projectFiles) write(join('data', 'projects', `${id}.json`), JSON.stringify(f, null, 1));
for (const [slug, f] of agent.appFiles) write(join('data', 'apps', `${slug}.json`), JSON.stringify(f, null, 1));
for (const [id, f] of agent.groupFiles) write(join('data', 'groups', `${id}.json`), JSON.stringify(f, null, 1));
write('openapi.json', JSON.stringify(openApi(), null, 1));

// ── Meaning-search vectors (fetched by the Worker only, never by the browser). Made by site/embed-items.mjs ──
if (existsSync(join(ROOT, 'data', 'search-vectors.json'))) write(join('data', 'search-vectors.json'), readFileSync(join(ROOT, 'data', 'search-vectors.json'), 'utf8'));

const HP = JSON.parse(readFileSync(join(ROOT, 'data', 'high-profile.json'), 'utf8'));
const highProfile = (p) => p.verified || (p.stars ?? 0) >= 10000 || HP.projects.includes(p.id)
  || HP.codePrefixes.some((c) => String(p.code ?? '').replace(/^https?:\/\/(www\.)?/i, '').toLowerCase().startsWith(c.toLowerCase()));
// ── Names for voting and boards (assets/social.js): who's in which group, in one small file ──
write(join('data', 'names.json'), JSON.stringify({
  categories: Object.fromEntries(d.categories.map((c) => [c.id, c.name])),
  // WHY gap: "I want this too" is only for jobs nothing open fully does yet (the server checks it against this).
  groups: Object.fromEntries(d.groups.map((g) => [g.id, { n: g.name, c: g.category, closed: g.closed, alts: g.alternatives.map((a) => a.project), gap: !g.alternatives.some((a) => a.fit === 'full') }])),
  projects: Object.fromEntries(d.projects.map((p) => [p.id, p.name])),
  // WHY: "Tag my project" finds the listed project from the link someone pastes (github.com/owner/name, lower case).
  // WHY hp / stars: claiming a high-profile project needs a mod's confirmation (docs/server-rules.md → Claiming a project). High-profile
  // = Verified, 10,000+ stars, or on the hand-kept list data/high-profile.json. stars lets the server notice a repo that is far smaller than the one listed.
  hp: d.projects.filter((p) => highProfile(p)).map((p) => p.id),
  stars: Object.fromEntries(d.projects.filter((p) => p.stars).map((p) => [p.id, p.stars])),
  codes: Object.fromEntries(d.projects.filter((p) => p.code).map((p) => [p.code.replace(/^https?:\/\/(www\.)?/i, '').replace(/\.git$|\/$/g, '').toLowerCase(), p.id])),
}));

// ── Search index: short keys keep it small (it loads the first time someone types) ──
// WHY more than names (search-core.js): people search for what a thing does or replaces ("video editor",
// "photoshop"), so each entry carries its group's job, the closed apps it stands in for, and a project's summary.
// The file is built once on deploy and fetched on first keypress.
write('search.json', JSON.stringify(searchIndex(d)));
// WHY a separate small file (Oct 30 performance pass): the results page needs a picture, summary, stars, devices and setup per
// project, and a group's closed apps and size; it used to download the whole open-data files for that.
write('search-details.json', JSON.stringify({
  projects: Object.fromEntries(d.projects.map((p) => [p.id, { thumbs: p.thumbs?.[0] ? [p.thumbs[0]] : undefined, summary: p.summary, stars: p.stars ?? undefined, platforms: p.platforms?.length ? p.platforms : undefined, setup: p.setup }])),
  groups: Object.fromEntries(d.groups.map((g) => [g.id, { closed: g.closed, job: g.closed.length ? undefined : g.job, alternatives: { length: g.alternatives.length } }])),
}));

// ── For search engines and AI assistants ──
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.filter((p) => !p.noIndex).map((p) => `<url><loc>${SITE_URL}${p.path}</loc></url>`).join('\n')}\n</urlset>\n`);
write('llms.txt', llmsTxt(d));

// ── "Add to Home screen" on phones: name, colours and icon for the installed app ──
write('manifest.webmanifest', JSON.stringify({
  name: 'Open Source Everything', short_name: 'Open Source', description: 'Open-source replacements for the apps you use.',
  start_url: url(), scope: url(), display: 'standalone', background_color: '#F7F0FB', theme_color: '#8B47B8',
  icons: [192, 512].map((s) => ({ src: url(`assets/icon-${s}.png`), sizes: `${s}x${s}`, type: 'image/png', purpose: 'any maskable' })),
}));

// ── Assets ──
cpSync(join(HERE, 'assets'), join(DIST, 'assets'), { recursive: true });
// WHY: GitHub Pages runs files through Jekyll unless told not to; this keeps the folders exactly as built.
write('.nojekyll', '');

console.log(`built ${pages.length} pages, ${d.groups.length} group data files → site/dist (base ${url()})`);

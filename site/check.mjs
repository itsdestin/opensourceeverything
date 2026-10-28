// Checks the built site (run after build.mjs): every internal link and asset points at a file that exists,
// every group and project has a page, and every page has a title and description. Exits 1 on any problem.
// Run: node site/check.mjs
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE, loadData } from './src/lib.mjs';
import { stale } from '../prefill/sync-forms.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, 'dist');
const d = loadData(join(HERE, '..'));
const problems = [];
const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const html = walk(DIST).filter((f) => f.endsWith('.html'));

const resolve = (href) => {
  const path = decodeURIComponent(href.split('#')[0].split('?')[0]);
  if (!path.startsWith(BASE)) return true; // outside links are not checked here
  const f = join(DIST, path.slice(BASE.length));
  return existsSync(f) && (statSync(f).isFile() || existsSync(join(f, 'index.html')));
};
for (const f of html) {
  const text = readFileSync(f, 'utf8'); const rel = f.slice(DIST.length + 1);
  for (const m of text.matchAll(/(?:href|src)="([^"]+)"/g)) if (m[1].startsWith('/') && !resolve(m[1])) problems.push(`${rel}: broken link ${m[1]}`);
  if (!/<title>[^<]+<\/title>/.test(text)) problems.push(`${rel}: no title`);
  if (!/<meta name="description" content="[^"]+"/.test(text)) problems.push(`${rel}: no description`);
}
const pages = new Set(html.map((f) => f.slice(DIST.length + 1)));
if (pages.size > 1) { // WHY: skip until the page modules exist, so the core can be checked on its own
  for (const g of d.groups) if (!pages.has(`g/${g.id}/index.html`)) problems.push(`no page for group ${g.id}`);
  for (const p of d.projects) if (!pages.has(`p/${p.id}/index.html`)) problems.push(`no page for project ${p.id}`);
}
// Internal AI-check notes must not reach visitors: not on pages, not in the public data files (see build.mjs).
for (const f of walk(join(DIST, 'data')).filter((f) => f.endsWith('.json'))) {
  const t = readFileSync(f, 'utf8'); const rel = f.slice(DIST.length + 1);
  if (/"unconfirmed"|"review"|"sourceLists"|claude-(opus|sonnet|haiku)/.test(t)) problems.push(`${rel}: contains internal AI-check fields`);
}
// The AI-agent files (catalog.json, projects/, apps/, groups/): same guard, plus the promises agents rely on.
// WHY (agent-access): an assistant trusts these files, so each must say which format version it is, when it was made, the
// license, and which page to cite; and the internal fields must be absent as KEYS (the pre-fill's "source": "starter" too).
const agentFiles = walk(join(DIST, 'data')).filter((f) => /data\/(catalog\.json|(projects|apps|groups)\/[^/]+\.json)$/.test(f.replaceAll('\\', '/')));
if (agentFiles.length < 2) problems.push('data/catalog.json and the per-project/app/group files are missing');
for (const f of agentFiles) {
  const rel = f.slice(DIST.length + 1); const j = JSON.parse(readFileSync(f, 'utf8'));
  for (const k of ['schemaVersion', 'generated', 'dataLicense', 'notice']) if (j[k] == null) problems.push(`${rel}: missing ${k}`);
  if (j.dataLicense !== 'CC BY-SA 4.0') problems.push(`${rel}: dataLicense is not CC BY-SA 4.0`);
  if (!(j.page ?? j.source)) problems.push(`${rel}: no page to cite`);
  const bad = (v, path = '') => (Array.isArray(v) ? v.flatMap((x, i) => bad(x, path)) : v && typeof v === 'object'
    ? Object.entries(v).flatMap(([k, x]) => (['unconfirmed', 'review', 'sourceLists', 'screenshots', 'thumbs', 'licenseSource'].includes(k) || (k === 'source' && typeof x === 'string' && !/^https?:/.test(x)) ? [path + k] : bad(x, path + k + '.'))) : []);
  for (const b of new Set(bad(j))) problems.push(`${rel}: internal field "${b}"`);
}
for (const x of ['openapi.json', 'ai/index.html', 'llms.txt']) if (!existsSync(join(DIST, x))) problems.push(`${x} missing`);
for (const f of html) if (/couldn.t confirm|checked by AI/i.test(readFileSync(f, 'utf8'))) problems.push(`${f.slice(DIST.length + 1)}: shows an AI-check note`);
// New inputs (feature checklists, switch guides, AI-contribution labels): an unknown project, group, tag or app address fails the build.
{
  const opt = (f, empty) => { try { return JSON.parse(readFileSync(join(HERE, '..', 'data', f), 'utf8')); } catch { return empty; } };
  const feat = opt('features.json', { tags: {}, groups: {}, answers: {} }); const guides = opt('switch-guides.json', { guides: {} }).guides; const ai = opt('ai-contribution.json', { projects: {} }).projects;
  // WHY the full data files, not the shown ones (Oct 28): groups with fewer than 3 projects are hidden from the site but keep their
  // checklists for when they fill. This check is for typos, so it asks "does it exist at all", not "is it shown".
  const allGroups = opt('groups.json', { groups: [] }).groups;
  const groupIds = new Set(allGroups.map((g) => g.id));
  const allProjects = new Set(opt('projects.json', { projects: [] }).projects.map((p) => p.id));
  const slug = (n) => n.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const apps = new Set(d.groups.flatMap((g) => g.closed.map(slug)));
  for (const [g, list] of Object.entries(feat.groups)) { if (!groupIds.has(g)) problems.push(`features: unknown group ${g}`); for (const t of list) if (!feat.tags[t]) problems.push(`features: group ${g} uses unknown tag ${t}`); }
  for (const [p, a] of Object.entries(feat.answers)) { if (!allProjects.has(p)) problems.push(`features: unknown project ${p}`); for (const [t, v] of Object.entries(a)) { if (!feat.tags[t]) problems.push(`features: ${p} answers unknown tag ${t}`); if (!['yes', 'partly', 'no'].includes(v.v)) problems.push(`features: ${p}/${t} has answer "${v.v}"`); } }
  for (const [s, g] of Object.entries(guides)) { if (!apps.has(s)) problems.push(`switch guide for unknown closed app ${s}`); for (const o of g.opensIn ?? []) if (!d.projById.has(o.project)) problems.push(`switch guide ${s}: unknown project ${o.project}`); }
  const LABELS = ['non-developers-welcome', 'traditional-developers-only', 'not-accepted', 'see-policy', null];
  for (const [p, a] of Object.entries(ai)) { if (!d.projById.has(p)) problems.push(`ai-contribution: unknown project ${p}`); if (!LABELS.includes(a.label)) problems.push(`ai-contribution: ${p} has label "${a.label}"`); if (a.label && !a.description) problems.push(`ai-contribution: ${p} has a label but no description`); }
}
// Old group addresses that were split must still answer (data/redirects.json).
for (const old of Object.keys(d.moved)) if (!pages.has(`g/${old}/index.html`)) problems.push(`no redirect page for split group ${old}`);
for (const slug of Object.keys(d.movedApps)) if (!pages.has(`alternatives-to/${slug}/index.html`)) problems.push(`no redirect page for moved app ${slug}`);
// WHY (review Oct 26): the GitHub forms' group and category pick lists are written from the data; fail if they fell behind.
for (const x of stale()) problems.push(`GitHub form ${x.file}: pick list out of date. Run: node prefill/sync-forms.mjs`);
if (problems.length) { console.error(problems.slice(0, 50).join('\n') + (problems.length > 50 ? `\n…and ${problems.length - 50} more` : '')); process.exit(1); }
console.log(`site check: ${html.length} pages, all links and pages present`);

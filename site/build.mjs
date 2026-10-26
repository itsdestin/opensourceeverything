// Builds the Open Source Everything site into site/dist/ from the map's data files. No outside packages.
// Run: node site/build.mjs        Preview: node site/serve.mjs  (then open the address it prints)
//
// WHY pre-built pages: every group and project gets its own fast page search engines can read; the browser
// only adds search and menus on top. Pages come from site/src/pages/*.mjs: each exports a default function
// (data) => [{ path, title, description, body, styles?, scripts?, search?, jsonLd? }].

import { readdirSync, mkdirSync, writeFileSync, rmSync, cpSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadData, url, SITE_URL } from './src/lib.mjs';
import { page } from './src/layout.mjs';
import { appSlug } from './src/cards.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const DIST = join(HERE, 'dist');
const d = loadData(ROOT);

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
for (const f of ['categories.json', 'groups.json', 'projects.json', 'CREDITS.md', 'README.md']) write(join('data', f), readFileSync(join(ROOT, 'data', f), 'utf8'));
for (const g of d.groups) {
  write(join('data', 'groups', `${g.id}.json`), JSON.stringify({
    license: 'CC BY-SA 4.0', source: `${SITE_URL}g/${g.id}/`, group: g.name, job: g.job, category: d.catById.get(g.category)?.name, replaces: g.closed,
    alternatives: g.alternatives.map((a) => { const p = d.projById.get(a.project); return { name: p.name, fit: a.fit, note: a.note, summary: p.summary, license: p.license, licenseClass: p.licenseClass, kind: p.kind, code: p.code, website: p.website, page: `${SITE_URL}p/${p.id}/` }; }),
  }, null, 1));
}

// ── Search index: short keys keep it small (it loads the first time someone types) ──
const firstGroup = (pid) => d.groupsByProject.get(pid)?.[0]?.group;
write('search.json', JSON.stringify({
  // WHY one entry per closed app, pointing at its own page: an app in two groups (Photoshop) appears once.
  closed: [...new Map(d.groups.flatMap((g) => g.closed.map((c) => [appSlug(c), { n: c, g: g.name, u: `alternatives-to/${appSlug(c)}/` }]))).values()],
  groups: d.groups.map((g) => ({ n: g.name, c: d.catById.get(g.category)?.name ?? '', u: `g/${g.id}/` })),
  projects: d.projects.map((p) => ({ n: p.name, g: firstGroup(p.id)?.name ?? '', u: `p/${p.id}/` })),
}));

// ── For search engines and AI assistants ──
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.filter((p) => !p.noIndex).map((p) => `<url><loc>${SITE_URL}${p.path}</loc></url>`).join('\n')}\n</urlset>\n`);
write('llms.txt', `# Open Source Everything\n\n> Open-source replacements for closed-source apps, grouped by the job they do, with where no good replacement exists yet. Made with r/TrueOpenSource. Data: CC BY-SA 4.0.\n\n` +
  `## Data\n\n- [All groups](${SITE_URL}data/groups.json): every group, the closed apps it replaces and its alternatives (by project id)\n- [All projects](${SITE_URL}data/projects.json): every open-source project with summary, license and links\n- [Categories](${SITE_URL}data/categories.json)\n- One file per group, projects included: ${SITE_URL}data/groups/<group-id>.json\n\n` +
  `## Groups\n\n${d.groups.map((g) => `- [${g.name}](${SITE_URL}data/groups/${g.id}.json): replaces ${g.closed.join(', ')}`).join('\n')}\n`);

// ── Assets ──
cpSync(join(HERE, 'assets'), join(DIST, 'assets'), { recursive: true });
// WHY: GitHub Pages runs files through Jekyll unless told not to; this keeps the folders exactly as built.
write('.nojekyll', '');

console.log(`built ${pages.length} pages, ${d.groups.length} group data files → site/dist (base ${url()})`);

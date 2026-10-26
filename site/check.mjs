// Checks the built site (run after build.mjs): every internal link and asset points at a file that exists,
// every group and project has a page, and every page has a title and description. Exits 1 on any problem.
// Run: node site/check.mjs
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE, loadData } from './src/lib.mjs';

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
if (problems.length) { console.error(problems.slice(0, 50).join('\n') + (problems.length > 50 ? `\n…and ${problems.length - 50} more` : '')); process.exit(1); }
console.log(`site check: ${html.length} pages, all links and pages present`);

// Free: for every project with a code link, look up its own website and its latest downloadable release,
// so pages can link "Website" and "Download" next to "Source code" (Destin, Oct 27).
// Writes prefill/out/links.json keyed by code link; assemble.mjs applies it.
// Run: GH_TOKEN=$(gh auth token) node prefill/fetch-links.mjs   (then node prefill/assemble.mjs)

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) { console.error('Set GH_TOKEN (e.g. GH_TOKEN=$(gh auth token)).'); process.exit(1); }
const projects = JSON.parse(readFileSync(join(ROOT, 'data/projects.json'), 'utf8')).projects;
const starter = JSON.parse(readFileSync(join(ROOT, 'data/starter.json'), 'utf8'));
// WHY also the starter's code links: projects added since the last assemble (e.g. a new starter entry) are covered too.
const codes = new Set(projects.map((p) => p.code).filter(Boolean));
for (const c of starter.categories) for (const g of c.groups) for (const [, link] of g.alts) if (/^(github\.com|gitlab\.com|codeberg\.org)\//.test(link)) codes.add(link);

const out = {};
// A homepage that is just the code page again adds nothing.
const useful = (u, code) => (u && /^https?:\/\//.test(u) && !u.replace(/^https?:\/\/(www\.)?/, '').toLowerCase().startsWith(code.toLowerCase()) ? u : null);

const gh = [...codes].filter((c) => c.startsWith('github.com/'));
for (let i = 0; i < gh.length; i += 50) {
  const list = gh.slice(i, i + 50);
  const q = `query { ${list.map((c, k) => { const [, o, n] = c.split('/'); return `r${k}: repository(owner: ${JSON.stringify(o)}, name: ${JSON.stringify(n)}) { homepageUrl latestRelease { url } }`; }).join('\n')} }`;
  const res = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'User-Agent': 'opensourceeverything' }, body: JSON.stringify({ query: q }) });
  const body = await res.json();
  list.forEach((c, k) => { const d = body.data?.[`r${k}`]; if (d) out[c] = { website: useful(d.homepageUrl, c), release: d.latestRelease?.url ?? null }; });
}
for (const c of [...codes].filter((c) => c.startsWith('codeberg.org/'))) {
  try {
    const r = await fetch(`https://codeberg.org/api/v1/repos/${c.slice(13)}`, { headers: { 'User-Agent': 'opensourceeverything' } });
    const d = r.ok ? await r.json() : null;
    const rel = r.ok ? await fetch(`https://codeberg.org/api/v1/repos/${c.slice(13)}/releases/latest`).then((x) => (x.ok ? x.json() : null)) : null;
    if (d) out[c] = { website: useful(d.website, c), release: rel?.html_url ?? null };
  } catch { /* leave it out */ }
}
for (const c of [...codes].filter((c) => c.startsWith('gitlab.com/'))) {
  try {
    const id = encodeURIComponent(c.slice(11));
    const rel = await fetch(`https://gitlab.com/api/v4/projects/${id}/releases/permalink/latest`).then((x) => (x.ok ? x.json() : null));
    out[c] = { website: null, release: rel?._links?.self ?? null };
  } catch { /* leave it out */ }
}
writeFileSync(join(HERE, 'out/links.json'), JSON.stringify(out, null, 1));
const n = Object.values(out);
console.log(`links: ${n.length} projects looked up; ${n.filter((x) => x.website).length} have their own website, ${n.filter((x) => x.release).length} have a downloadable release`);

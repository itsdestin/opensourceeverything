// Looks up facts for every project whose code is NOT on GitHub (Codeberg, GitLab, KDE, GNOME, Blender, Tor...),
// plus the few GitHub projects added by hand in prefill/family-projects.json that no other step looks up.
// Writes prefill/out/host-facts.json (keyed by project id); assemble.mjs applies it.
// Run: GH_TOKEN=$(gh auth token) node prefill/fetch-host-facts.mjs   (GH_TOKEN only needed for the hand-added GitHub ones)
//
// WHY free and secret-free: every call is a public, unauthenticated read of a site's own API (see hosts.mjs).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hostFacts, githubFacts, parseCode } from './hosts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const read = (f) => JSON.parse(readFileSync(f, 'utf8'));
const projects = read(join(ROOT, 'data/projects.json')).projects;
const extra = existsSync(join(HERE, 'family-projects.json')) ? read(join(HERE, 'family-projects.json')).projects : [];
const all = new Map([...projects, ...extra].map((p) => [p.id, p]));

const out = {};
const looked = new Map(); // one lookup per code link: LibreOffice's three apps share one repository
for (const p of all.values()) {
  const pc = parseCode(p.code);
  if (!pc || pc.host === 'github.com') continue;
  if (!looked.has(p.code)) looked.set(p.code, await hostFacts(p.code));
  out[p.id] = { ...looked.get(p.code), checkedAt: new Date().toISOString().slice(0, 10) };
}
// Hand-added GitHub projects (not in any other step's list): one batched request.
const ghExtra = extra.filter((p) => parseCode(p.code)?.host === 'github.com');
if (ghExtra.length && process.env.GH_TOKEN) {
  for (const [id, f] of await githubFacts(ghExtra, process.env.GH_TOKEN)) out[id] = { ...f, checkedAt: new Date().toISOString().slice(0, 10) };
} else if (ghExtra.length) console.warn(`No GH_TOKEN: skipped ${ghExtra.length} hand-added GitHub projects.`);

writeFileSync(join(HERE, 'out/host-facts.json'), JSON.stringify(out, null, 1) + '\n');
const rows = Object.entries(out);
const ok = rows.filter(([, f]) => f.found);
const line = (id, f) => `${id.padEnd(26)} ${f.found ? `${f.kind.padEnd(8)} stars ${String(f.stars ?? '-').padEnd(6)} ${f.archived ? 'ARCHIVED ' : ''}${f.quietForAYear ? 'quiet ' : ''}last ${(f.lastActivity ?? '?').slice(0, 10)} license ${f.license ?? '-'}` : `no public API answer (${f.host})`}`;
console.log(rows.map(([id, f]) => line(id, f)).join('\n'));
console.log(`\nhost facts: ${rows.length} projects, ${ok.length} answered (${rows.length - ok.length} on sites with no public API), ${ok.filter(([, f]) => f.license).length} with a license, ${ok.filter(([, f]) => f.stars != null).length} with stars`);

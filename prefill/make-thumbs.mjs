// Free: small copies of every project screenshot for cards and the project page's picture row.
// Writes site/assets/shots/<project id>-<n>.webp (800px wide) and prefill/out/thumbs.json; assemble.mjs adds
// them to data/projects.json as `thumbs`. Already-made files are skipped, so re-running only does new pictures.
// Run: node prefill/make-thumbs.mjs   (needs ImageMagick's `magick`)
//
// WHY (Destin, Oct 27: "premium… for newcomers"): some READMEs ship 2 MB screenshots, so cards filled in slowly.
// A card only needs a small picture; clicking one still opens the project's original, full size.

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const DIR = join(ROOT, 'site/assets/shots');
mkdirSync(DIR, { recursive: true });
const projects = JSON.parse(readFileSync(join(ROOT, 'data/projects.json'), 'utf8')).projects;
const outFile = join(HERE, 'out/thumbs.json');
const out = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : {};

const jobs = projects.flatMap((p) => (p.screenshots ?? []).map((u, n) => ({ id: p.id, u, n, file: `${p.id}-${n}.webp` })));
let made = 0, failed = 0;
const queue = [...jobs];
await Promise.all(Array.from({ length: 8 }, async () => {
  for (let j = queue.shift(); j; j = queue.shift()) {
    const dest = join(DIR, j.file);
    // WHY keyed by the source address: if a project's screenshot changes, its small copy is remade.
    if (existsSync(dest) && out[j.id]?.[j.n]?.from === j.u) continue;
    try {
      const r = await fetch(j.u, { headers: { 'User-Agent': 'Mozilla/5.0 opensourceeverything' }, signal: AbortSignal.timeout(30_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const tmp = join(tmpdir(), `ose-${j.file}.src`);
      writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
      // [0] = first frame of an animated picture; -resize '800x>' only ever shrinks.
      execFileSync('magick', [`${tmp}[0]`, '-resize', '800x>', '-strip', '-quality', '72', dest]);
      (out[j.id] ??= [])[j.n] = { from: j.u, file: j.file, kb: Math.round(statSync(dest).size / 1024) };
      made++;
    } catch (e) { failed++; console.log(`skip ${j.id} #${j.n}: ${String(e).slice(0, 80)}`); }
  }
}));
writeFileSync(outFile, JSON.stringify(out, null, 1));
const all = Object.values(out).flat().filter(Boolean);
console.log(`thumbs: made ${made}, failed ${failed}; ${all.length} in total, ${Math.round(all.reduce((s, x) => s + x.kb, 0) / 1024)} MB`);
process.exit(0);

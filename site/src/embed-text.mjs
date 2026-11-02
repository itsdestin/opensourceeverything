// The text we hand to the meaning-search model for each thing on the site (one entry per search item).
// WHY its own file: the build step (writes the vectors) and the offline test both need EXACTLY the same text, and
// the ids must match what the browser's search items use ("c:", "g:", "p:" + slug, as in search-eval.mjs).
// WHY the summary is included here although search.json drops it for most projects: the model reads meaning, so the
// plain-English summary is the best thing it can see; search.json only drops it to keep the page download small.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const idOf = (u) => u.replace(/^alternatives-to\/(.*)\/$/, 'c:$1').replace(/^g\/(.*)\/$/, 'g:$1').replace(/^p\/(.*)\/$/, 'p:$1');

export function embedTexts(raw, projectsById, mode = 'full') {
  const out = [];
  const cut = (s, n) => (s || '').slice(0, n);
  for (const x of raw.closed) out.push({ id: idOf(x.u), text: `${x.n}: a closed app for ${x.j.toLowerCase()} (${x.g}). Open-source alternatives to ${x.n}.` });
  for (const x of raw.groups) out.push({ id: idOf(x.u), text: `${x.n}: ${x.j}. Replaces ${(x.x || []).join(', ')}. ${mode === 'nophrases' ? '' : (x.k || []).slice(0, 12).join('; ')}` });
  for (const x of raw.projects) {
    const gs = (x.gi || []).map((i) => raw.groups[i]).filter(Boolean);
    const id = idOf(x.u);
    const summary = projectsById?.get(id.slice(2))?.summary ?? x.s ?? '';
    out.push({ id, text: `${x.n}: ${cut(summary, 300)} Open-source alternative to ${[...new Set(gs.flatMap((g) => g.x || []))].slice(0, 8).join(', ')} (${gs.map((g) => g.n).join(', ')}). ${mode === 'nophrases' ? '' : (x.k || []).slice(0, 8).join('; ')}` });
  }
  return out;
}

// Device words in a search ("photo editor for linux", "notes app on my chromebook"): do the projects shown actually run there?
// NOTE: written by the person who wrote the device ranking, so it is a regression check, not a held-out measure.
// Run: node site/test/search-device-eval.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadData } from '../src/lib.mjs';
import { searchIndex } from '../src/search-index.mjs';
const HERE = dirname(fileURLToPath(import.meta.url));
const ctx = { globalThis: {} };
vm.runInNewContext(readFileSync(join(HERE, '..', 'assets', 'search-core.js'), 'utf8'), ctx);
const { prepare, search } = ctx.globalThis.OISearch;
const d = loadData(join(HERE, '..', '..'));
const items = prepare(searchIndex(d));
const runs = (id) => d.projById.get(id)?.platforms ?? [];
// [query, codes that count as "runs there"]. Web and server-only tools are not counted as running on a desktop/phone.
const CHROME = ['web', 'android', 'linux'];
const Q = [
  ['photo editor for linux', ['linux']], ['video editor for mac', ['mac']], ['password manager for android', ['android']],
  ['notes app for windows', ['windows']], ['edit photos on my chromebook', CHROME], ['note taking on my chromebook', CHROME],
  ['music player for iphone', ['ios']], ['pdf reader for android', ['android']], ['screen recorder for linux', ['linux']],
  ['office suite for windows', ['windows']], ['email client for mac', ['mac']], ['browser for android', ['android']],
  ['keyboard for iphone', ['ios']], ['podcast app for android', ['android']], ['file manager for windows', ['windows']],
  ['drawing app for ipad', ['ios']], ['video player for linux', ['linux']], ['calendar for iphone', ['ios']],
  ['task manager on my mac', ['mac']], ['writing app for chromebook', CHROME],
];
let shown = 0, ok = 0, top1 = 0;
for (const [q, codes] of Q) {
  const ps = search(items, q, { all: true }).filter((r) => r.kind === 'project').slice(0, 5);
  const good = ps.map((r) => runs(r.u.split('/')[1]).some((p) => codes.includes(p)));
  shown += ps.length; ok += good.filter(Boolean).length; top1 += good[0] ? 1 : 0;
  if (process.argv.includes('--all')) console.log(`${good.every(Boolean) ? 'ok  ' : 'MISS'} ${q} → ${ps.map((r, i) => r.n + (good[i] ? '' : '✗')).join(', ')}`);
}
console.log(`device searches: ${Q.length}. Top project runs there: ${top1}/${Q.length}. Of the top 5 projects, run there: ${ok}/${shown} (${Math.round(100 * ok / shown)}%)`);

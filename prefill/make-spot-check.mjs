// Builds mockups/spot-check.html: 30 random listings (20 from the AI-reviewed lists, 10 starter descriptions)
// for Destin and esk to mark right or wrong before launch. Free. Run: node prefill/make-spot-check.mjs
// WHY a fixed seed: both reviewers see the same 30, so their answers can be compared.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const projects = new Map(read('data/projects.json').projects.map((p) => [p.id, p]));
const groups = read('data/groups.json').groups;
const cats = new Map(read('data/categories.json').categories.map((c) => [c.id, c.name]));

let seed = 20261027;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const listings = groups.flatMap((g) => g.alternatives.map((a) => ({ g, a, p: projects.get(a.project) })));
const pick = (list, n) => { const l = [...list]; const out = []; while (out.length < n && l.length) out.push(l.splice(Math.floor(rand() * l.length), 1)[0]); return out; };
const sample = [...pick(listings.filter((x) => x.p.source === 'lists'), 20), ...pick(listings.filter((x) => x.p.source === 'starter'), 10)]
  .map((x, i) => ({
    n: i + 1, group: x.g.name, category: cats.get(x.g.category), closed: x.g.closed.slice(0, 5).join(', '), name: x.p.name,
    summary: x.p.summary, fit: x.a.fit, license: x.p.license ?? 'not reported', licenseClass: x.p.licenseClass,
    kind: { app: 'App', self_hosted: 'Runs on your own server', developer_tool: 'Developer tool', library: 'Code library' }[x.p.kind],
    link: x.p.code ? `https://${x.p.code}` : x.p.website, source: x.p.source === 'lists' ? 'From the free lists, reviewed by AI' : 'Hand-picked; AI wrote the description',
    unconfirmed: x.p.unconfirmed.slice(0, 3),
  }));

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Spot check</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&display=swap">
<link rel="stylesheet" href="demo.css">
<style>
.page { padding-top:12px; max-width:900px; }
.item { padding:16px; display:flex; flex-direction:column; gap:8px; cursor:default; }
.item:hover { transform:none; }
.where { font-size:12px; color:var(--fg-muted); }
.verdict { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.verdict .btn.on { box-shadow:0 0 0 2px var(--accent); color:var(--fg); }
.note { flex:1; min-width:200px; }
.unc { font-size:12px; color:var(--fg-muted); margin:0; padding-left:18px; }
.bar2 { position:sticky; bottom:12px; padding:12px 16px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
</style></head><body>
<div class="page">
  <div class="surface sec">
    <h1 class="h-large">Spot check: 30 listings</h1>
    <p class="small2">Is each one right? Check three things: does it really do that group's job, is the description fair, and does "Replaces fully / partly" fit. Click the name to open its project page. Your answers stay in this browser; press <b class="num">Copy my answers</b> at the bottom and paste them in chat.</p>
  </div>
  <section class="surface sec"><div class="queue stack" id="list"></div></section>
</div>
<div class="page"><div class="surface bar2"><span class="small2" id="count"></span><button class="btn md primary" id="copy">Copy my answers</button></div></div>
<div class="toast" id="toast"></div>
<script>
const ITEMS = ${JSON.stringify(sample)};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let answers = {};
try { answers = JSON.parse(localStorage.getItem('spotCheck') || '{}'); } catch (e) {}
const save = () => { try { localStorage.setItem('spotCheck', JSON.stringify(answers)); } catch (e) {} };
function render() {
  document.getElementById('list').innerHTML = ITEMS.map((x) => {
    const a = answers[x.n] || {};
    return \`<div class="card item">
      <div class="where">\${x.n}. \${esc(x.category)} › \${esc(x.group)} · replaces \${esc(x.closed)}</div>
      <div class="head"><h3><a href="\${esc(x.link)}" target="_blank" rel="noopener" style="color:inherit">\${esc(x.name)}</a></h3>
        <span class="pill \${x.fit === 'full' ? 'ok' : 'info'}">\${x.fit === 'full' ? '<i></i>Replaces fully' : 'Replaces partly'}</span></div>
      <div class="chiprow"><span class="chip">\${esc(x.license)}</span>\${x.licenseClass === 'open_core' ? '<span class="chip">Open core</span>' : ''}<span class="chip">\${esc(x.kind)}</span><span class="chip">\${esc(x.source)}</span></div>
      <p class="body2">\${esc(x.summary)}</p>
      \${x.unconfirmed.length ? '<ul class="unc">' + x.unconfirmed.map((u) => '<li>Not confirmed: ' + esc(u) + '</li>').join('') + '</ul>' : ''}
      <div class="verdict">
        <button class="btn sm secondary \${a.v === 'right' ? 'on' : ''}" data-n="\${x.n}" data-v="right">✓ Right</button>
        <button class="btn sm secondary \${a.v === 'wrong' ? 'on' : ''}" data-n="\${x.n}" data-v="wrong">✗ Wrong</button>
        <input class="field note" data-note="\${x.n}" placeholder="What's wrong? (optional)" value="\${esc(a.note || '')}">
      </div></div>\`;
  }).join('');
  const done = Object.values(answers).filter((a) => a.v).length;
  document.getElementById('count').textContent = done + ' of 30 checked · ' + Object.values(answers).filter((a) => a.v === 'wrong').length + ' marked wrong';
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-v]'); if (!b) return;
  const n = b.dataset.n; answers[n] = { ...(answers[n] || {}), v: answers[n]?.v === b.dataset.v ? undefined : b.dataset.v }; save(); render();
});
document.addEventListener('input', (e) => { const n = e.target.dataset.note; if (!n) return; answers[n] = { ...(answers[n] || {}), note: e.target.value }; save(); });
document.getElementById('copy').addEventListener('click', () => {
  const text = 'Spot check answers:\\n' + ITEMS.map((x) => { const a = answers[x.n] || {}; return x.n + '. ' + x.name + ' (' + x.group + '): ' + (a.v === 'right' ? 'right' : a.v === 'wrong' ? 'WRONG' : 'not checked') + (a.note ? ' — ' + a.note : ''); }).join('\\n');
  const t = document.getElementById('toast');
  (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => { t.textContent = 'Copied. Paste it in chat.'; }, () => { t.textContent = 'Copying needs the page open in a browser tab.'; });
  t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600);
});
render();
</script></body></html>`;
writeFileSync(join(ROOT, 'mockups/spot-check.html'), html);
console.log(`wrote mockups/spot-check.html with ${sample.length} listings`);

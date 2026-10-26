// Builds mockups/card-options.html: three ways to show a project's Download / Website / Source code links and its
// screenshots, drawn with real projects, so Destin can pick by looking (his preference: build options, don't describe).
// Run: node prefill/make-card-options.mjs   (needs prefill/out/screenshots.json)
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const projects = new Map(read('data/projects.json').projects.map((p) => [p.id, p]));
const shots = read('prefill/out/screenshots.json');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const codeUrl = (p) => (p.code ? (/^https?:/.test(p.code) ? p.code : `https://${p.code}`) : null);
const links = (p) => {
  const l = []; const dl = p.download ?? (p.release && p.kind === 'app' ? p.release : null);
  if (dl) l.push(['Download', dl]); if (p.website) l.push(['Website', p.website]);
  if (p.release && !dl) l.push(['Latest release', p.release]); if (codeUrl(p)) l.push(['Source code', codeUrl(p)]);
  return l;
};
const pick = ['darktable', 'penpot', 'joplin', 'shotcut', 'logseq', 'organic-maps'].map((id) => projects.get(id)).filter(Boolean);
const chips = (p) => `<span class="chip">${esc(p.license ?? 'License being checked')}</span>${p.stars ? `<span class="chip">★ ${p.stars >= 1000 ? Math.round(p.stars / 100) / 10 + 'k' : p.stars} on GitHub</span>` : ''}`;
const DL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
const CHEV = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>';
const preview = (p) => shots[p.id]?.[0] ? `<div class="preview"><img src="${esc(shots[p.id][0])}" alt="" loading="lazy"></div>` : `<div class="preview empty">No screenshot yet</div>`;

// A: a picture on every card (like the app's Marketplace theme cards) and one download icon in the corner.
const cardA = (p) => { const dl = links(p).find((l) => l[0] === 'Download' || l[0] === 'Website');
  return `<div class="card pic">${preview(p)}<div class="inner"><div class="head"><h3>${esc(p.name)}</h3>${dl ? `<a class="icon-btn" href="${esc(dl[1])}" title="${dl[0]}" aria-label="${dl[0]}">${DL}</a>` : ''}</div><div class="chiprow">${chips(p)}</div><p class="blurb">${esc(p.summary)}</p></div></div>`; };
// B: a picture on every card and one "Get it" menu holding all the links.
const cardB = (p, i) => `<div class="card pic">${preview(p)}<div class="inner"><div class="head"><h3>${esc(p.name)}</h3></div><div class="chiprow">${chips(p)}</div><p class="blurb">${esc(p.summary)}</p>
  <div class="dd getit"><button class="btn sm primary" data-menu="gm${i}">Get it ${CHEV}</button><div class="menu left" id="gm${i}">${links(p).map(([l, h]) => `<a class="mi" href="${esc(h)}">${l}</a>`).join('')}</div></div></div></div>`;
// C: no picture on cards (they stay short); links only on the project page, where the gallery lives.
const cardC = (p) => `<div class="card"><div class="head"><h3>${esc(p.name)}</h3></div><div class="chiprow">${chips(p)}</div><p class="blurb">${esc(p.summary)}</p><div class="foot">Opens its page, with screenshots and download links</div></div>`;

const gp = projects.get('penpot') ?? pick[0];
const gallery = (p) => { const s = shots[p.id] ?? [];
  return `<div class="surface sec gallery-demo">
  <div class="identity2"><div><h2 class="h-subject">${esc(p.name)}</h2><div class="chiprow">${chips(p)}</div><p class="body2">${esc(p.summary)}</p></div>
  <div class="cta">${links(p).map(([l, h], i) => `<a class="btn md ${i ? 'secondary' : 'primary'}" href="${esc(h)}">${l}</a>`).join('')}</div></div>
  ${s.length ? `<div class="shots"><img class="big" src="${esc(s[0])}" alt="${esc(p.name)} screenshot" loading="lazy">${s.length > 1 ? `<div class="thumbs">${s.slice(1).map((u) => `<img src="${esc(u)}" alt="" loading="lazy">`).join('')}</div>` : ''}</div><p class="muted11">Screenshots from ${esc(p.name)}'s own page.</p>` : ''}
</div>`; };

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Card options</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&display=swap">
<link rel="stylesheet" href="../site/assets/site.css">
<style>
.page { padding-top:12px; }
.grid3 { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; }
.sec .card { cursor:default; }
.card.pic { padding:0; gap:0; overflow:hidden; }
.card.pic .inner { padding:12px 16px 16px; display:flex; flex-direction:column; gap:8px; }
/* WHY this frame: the Marketplace's theme cards set the picture inside the card, 4px in, with its own corners. */
.preview { margin:4px 4px 0; aspect-ratio:16/10; border-radius:calc(var(--radius-xl) - 4px) calc(var(--radius-xl) - 4px) var(--radius-sm) var(--radius-sm); overflow:hidden; background:var(--inset); border:1px solid var(--edge-dim); }
.preview img { width:100%; height:100%; object-fit:cover; object-position:top; display:block; }
.preview.empty { display:flex; align-items:center; justify-content:center; font-size:12px; color:var(--fg-muted); }
.getit { align-self:flex-start; }
.opt-label { display:flex; align-items:baseline; gap:12px; }
.opt-label b { font-size:16px; }
.identity2 { display:flex; gap:16px; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; }
.identity2 > div:first-child { flex:1; min-width:260px; display:flex; flex-direction:column; gap:8px; }
.cta { display:flex; gap:8px; flex-wrap:wrap; }
.shots { display:grid; grid-template-columns:2fr 1fr; gap:8px; }
.shots .big { width:100%; border-radius:var(--radius-lg); border:1px solid var(--edge-card); display:block; }
.thumbs { display:flex; flex-direction:column; gap:8px; }
.thumbs img { width:100%; border-radius:var(--radius-md); border:1px solid var(--edge-card); display:block; }
@media (max-width:640px) { .shots { grid-template-columns:1fr; } .thumbs { flex-direction:row; overflow-x:auto; } .thumbs img { width:60%; flex:none; } }
</style></head><body><main class="page">
<div class="surface sec"><h1 class="h-large">Three ways to show downloads and screenshots</h1>
<p class="small2">Same six real projects each time. Pick A, B or C for the cards on group pages. The bottom card shows the project page with its screenshot gallery, which comes with any of them.</p></div>
<section class="surface sec"><div class="opt-label"><b>A</b><span class="small2">Screenshot on every card, one download button in the corner (like the Marketplace). Website and source code are on the project page.</span></div><div class="grid3">${pick.map(cardA).join('')}</div></section>
<section class="surface sec"><div class="opt-label"><b>B</b><span class="small2">Screenshot on every card, and one "Get it" menu with Download, Website and Source code.</span></div><div class="grid3">${pick.map(cardB).join('')}</div></section>
<section class="surface sec"><div class="opt-label"><b>C</b><span class="small2">Short cards with no picture or links. Everything is on the project page.</span></div><div class="grid3">${pick.map(cardC).join('')}</div></section>
<section><div class="surface sec"><div class="opt-label"><b>Project page</b><span class="small2">Download first, then Website and Source code, with the screenshots underneath.</span></div></div></section>
${gallery(gp)}
</main><div class="toast" id="toast"></div><script>window.OI={base:'/'};</script><script src="../site/assets/site.js"></script></body></html>`;
writeFileSync(join(ROOT, 'mockups/card-options.html'), html);
console.log('wrote mockups/card-options.html with', pick.map((p) => `${p.name}(${shots[p.id]?.length ?? 0})`).join(', '));

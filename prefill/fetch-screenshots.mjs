// Free: find up to 4 screenshots per project, from the pictures in its own README (GitHub, GitLab, Codeberg)
// or, failing that, its website's preview image. Writes prefill/out/screenshots.json keyed by project id;
// prefill/check-screenshots.mjs then keeps the real interface shots (links to the project's own files, credited on the page).
// Run: GH_TOKEN=$(gh auth token) node prefill/fetch-screenshots.mjs
//
// WHY READMEs: nearly every app shows its interface there, and the pictures are the project's own.
// WHY the filters: READMEs also hold badges, logos, sponsor walls and star charts, which aren't the interface.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const GH = process.env.GH_TOKEN;
if (!GH) { console.error('Set GH_TOKEN (e.g. GH_TOKEN=$(gh auth token)).'); process.exit(1); }
// --only "id1,id2": look up just these projects and merge them into the existing candidates (used when adding a few).
const oi = process.argv.indexOf('--only'); const ONLY = oi > 0 ? new Set(process.argv[oi + 1].split(',')) : null;
const projects = JSON.parse(readFileSync(join(ROOT, 'data/projects.json'), 'utf8')).projects.filter((p) => !ONLY || ONLY.has(p.id));

const NOT_UI = /shields\.io|badge|badgen|\.svg(\?|$)|logo|icon|avatar|favicon|banner|sponsor|opencollective|contrib\.rocks|star-history|starchart|repobeats|codecov|buymeacoffee|ko-fi|patreon|liberapay|deploy|button|github-readme-stats|vercel\.com\/button|flathub|get-it-on|google-play|app-store|f-droid|weblate|translate|crowdin|discord|matrix\.to|reddit|mastodon|twitter|qr/i;
const IMG_EXT = /\.(png|jpe?g|gif|webp)(\?|#|$)/i;

async function text(u, raw) {
  try {
    const r = await fetch(u, { headers: raw ? { Authorization: `Bearer ${GH}`, Accept: 'application/vnd.github.raw+json', 'User-Agent': 'opensourceeverything' } : { 'User-Agent': 'Mozilla/5.0 opensourceeverything' }, signal: AbortSignal.timeout(15_000) });
    return r.ok ? r.text() : '';
  } catch { return ''; }
}
// The size of a picture without downloading it all; tiny files are icons, not screenshots.
async function size(u) {
  try {
    const r = await fetch(u, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(10_000) });
    return r.ok && /^image\//.test(r.headers.get('content-type') ?? '') ? Number(r.headers.get('content-length') ?? 0) : -1;
  } catch { return -1; }
}

function readmeImages(md, base) {
  const urls = [...md.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)>?[^)]*\)|<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1] ?? m[2]);
  return urls.map((u) => {
    if (/^https?:\/\//.test(u)) return u.replace('github.com/', 'github.com/').replace(/\/blob\//, '/raw/');
    return base ? base + u.replace(/^\.?\//, '') : null;
  }).filter(Boolean);
}

async function shotsFor(p) {
  let candidates = [];
  const code = p.code?.replace(/^https?:\/\//, '') ?? '';
  if (code.startsWith('github.com/')) {
    const [, o, n] = code.split('/');
    candidates = readmeImages(await text(`https://api.github.com/repos/${o}/${n}/readme`, true), `https://raw.githubusercontent.com/${o}/${n}/HEAD/`);
  } else if (code.startsWith('codeberg.org/')) {
    const path = code.slice(13);
    candidates = readmeImages(await text(`https://codeberg.org/${path}/raw/branch/main/README.md`), `https://codeberg.org/${path}/raw/branch/main/`);
  } else if (code.startsWith('gitlab.com/')) {
    const path = code.slice(11);
    candidates = readmeImages(await text(`https://gitlab.com/${path}/-/raw/HEAD/README.md`), `https://gitlab.com/${path}/-/raw/HEAD/`);
  }
  // WHY no "token=": some READMEs link pictures through signed addresses; saving those would publish a credential.
  candidates = [...new Set(candidates)].filter((u) => !NOT_UI.test(u) && !/[?&]token=/i.test(u) && (IMG_EXT.test(u) || /user-images|user-attachments|githubusercontent\.com\/.*\/assets\//.test(u)));
  // WHY up to 8 and no size test: prefill/check-screenshots.mjs looks at each picture and keeps real interface shots.
  const out = candidates.slice(0, 8);
  if (p.website) {
    const html = await text(p.website);
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
    if (og && !NOT_UI.test(og)) out.push(new URL(og, p.website).href);
  }
  return out;
}

const result = {}; const queue = [...projects]; let done = 0;
await Promise.all(Array.from({ length: 12 }, async () => {
  for (let p = queue.shift(); p; p = queue.shift()) {
    result[p.id] = await shotsFor(p);
    if (++done % 50 === 0) console.log(`${done}/${projects.length}`);
  }
}));
const candFile = join(HERE, 'out/screenshot-candidates.json');
writeFileSync(candFile, JSON.stringify(ONLY ? { ...JSON.parse(readFileSync(candFile, 'utf8')), ...result } : result, null, 1));
const n = Object.values(result);
console.log(`screenshots: ${n.filter((x) => x.length).length} of ${n.length} projects have at least one (${n.reduce((s, x) => s + x.length, 0)} pictures)`);

// WHY: open network connections can keep Node waiting after the work is saved.
process.exit(0);

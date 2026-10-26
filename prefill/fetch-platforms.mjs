// Free: work out which devices each project runs on (Windows, Mac, Linux, Android, iPhone, in a browser,
// or "you run it on your own server") so cards can show chips and the page can filter (Destin, Oct 27).
// Writes prefill/out/platforms.json keyed by project id: { platforms, evidence, sure }.
// prefill/check-platforms.mjs (paid, optional) then fills in the entries marked sure:false.
// Run: GH_TOKEN=$(gh auth token) node prefill/fetch-platforms.mjs
//
// WHY three sources, in this order of trust: file names of real downloads can't lie; store links in the README
// are the project's own claim; "self_hosted" in our own data is only a hint about the server side.
// WHY sure:false: no download names and no store links means we are guessing from the project's kind alone.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const GH = process.env.GH_TOKEN;
if (!GH) { console.error('Set GH_TOKEN (e.g. GH_TOKEN=$(gh auth token)).'); process.exit(1); }
const projects = JSON.parse(readFileSync(join(ROOT, 'data/projects.json'), 'utf8')).projects;
const ORDER = ['windows', 'mac', 'linux', 'android', 'ios', 'web', 'server'];

// "code" is either "github.com/o/n" or a full https URL; normalise to host/path.
const codeOf = (p) => (p.code ?? '').replace(/^https?:\/\//, '').replace(/\/+$/, '').replace(/\.git$/, '');

// --- 1. release file names -> platforms -------------------------------------------------------------------
// WHY the delimiters: "win" must not match "darwin" or "twin", and "mac" must not match "machine".
const D = (w) => new RegExp(`(^|[^a-z])(${w})([^a-z]|$)`, 'i');
const RULES = [
  ['windows', /\.(exe|msi|msix|appx)$/i], ['windows', D('win|win32|win64|windows|msvc|mingw')],
  ['mac', /\.(dmg|pkg)$/i], ['mac', D('mac|macos|macosx|osx|darwin|apple')],
  ['linux', /\.(appimage|deb|rpm|flatpak|snap|pacman)$/i], ['linux', D('linux|gnu|musl|ubuntu|debian|fedora|amd64\\.deb')],
  ['android', /\.(apk|aab|apks)$/i], ['android', D('android')],
  ['ios', /\.ipa$/i], ['ios', D('ios|iphone')],
];
function fromAssets(names) {
  const found = new Map();
  // WHY skip signatures, checksums and debug symbols: they are named after the real download but are not installable.
  for (const n of names.filter((x) => !/\.(sig|asc|sha\d*|sha256sum|minisig|sbom|json)$|dsyms|symbols|debuginfo/i.test(x))) for (const [pl, re] of RULES) if (re.test(n) && !found.has(pl)) found.set(pl, n);
  return found; // platform -> the first file name that proved it
}

// --- 2. README text -> platforms --------------------------------------------------------------------------
const README_RULES = [
  ['android', /play\.google\.com\/store\/apps/i, 'Google Play link'], ['android', /f-droid\.org/i, 'F-Droid link'],
  ['linux', /flathub\.org/i, 'Flathub link'], ['linux', /snapcraft\.io/i, 'Snap Store link'], ['linux', /aur\.archlinux\.org/i, 'AUR link'],
  ['windows', /apps\.microsoft\.com|microsoft\.com\/(?:\w\w-\w\w\/)?(?:p|store)\/|winget (?:install|add)|chocolatey\.org\/packages|choco(?:latey)? install|scoop (?:install|bucket)/i, 'Microsoft Store / winget / Chocolatey / Scoop'],
  ['mac', /brew (?:install )?--cask|brew install --cask|formulae\.brew\.sh\/cask|macports\.org/i, 'Homebrew cask / MacPorts'],
  // WHY "docker run|compose" and not just "docker": a README that only says "docker build" is for developers.
  ['server', /docker[ -]compose|docker run|ghcr\.io|hub\.docker\.com|docker\.io\/|self[- ]?host/i, 'Docker / self-host mention'],
];
function fromReadme(md) {
  const found = new Map();
  for (const [pl, re, label] of README_RULES) if (re.test(md) && !found.has(pl)) found.set(pl, label);
  // App Store: a /mac/ path or "Mac App Store" is the Mac; otherwise it needs iPhone/iOS/iPad nearby to count.
  for (const m of md.matchAll(/apps\.apple\.com[^\s)"'>]*/gi)) {
    const ctx = md.slice(Math.max(0, m.index - 200), m.index + m[0].length + 100);
    if (/\/mac\/|mac app store|macos/i.test(m[0] + ctx.slice(0, 200)) && !/iphone|ipad|ios/i.test(ctx)) found.set('mac', 'Mac App Store link');
    else if (/iphone|ipad|ios/i.test(ctx)) found.set('ios', 'App Store link (iPhone/iPad)');
  }
  if (/itunes\.apple\.com[^\s)"'>]*/i.test(md) && !found.has('ios') && /iphone|ipad|ios/i.test(md)) found.set('ios', 'iTunes link');
  return found;
}

async function get(u, raw) {
  try {
    const r = await fetch(u, { headers: raw ? { Authorization: `Bearer ${GH}`, Accept: 'application/vnd.github.raw+json', 'User-Agent': 'opensourceeverything' } : { 'User-Agent': 'Mozilla/5.0 opensourceeverything' }, signal: AbortSignal.timeout(15_000) });
    return r.ok ? r : null;
  } catch { return null; }
}
const text = async (u, raw) => (await get(u, raw))?.text() ?? '';
const json = async (u) => (await get(u))?.json() ?? null;

async function readmeFor(code) {
  if (code.startsWith('github.com/')) { const [, o, n] = code.split('/'); return text(`https://api.github.com/repos/${o}/${n}/readme`, true); }
  const m = code.match(/^([^/]+)\/(.+)$/); if (!m) return '';
  const [, host, path] = m;
  if (host === 'codeberg.org') return text(`https://codeberg.org/${path}/raw/branch/main/README.md`);
  if (host === 'gitlab.com') return text(`https://gitlab.com/${path}/-/raw/HEAD/README.md`);
  return '';
}

// Release file names for non-GitHub hosts (GitHub goes through one batched GraphQL call below).
async function otherAssets(code) {
  if (code.startsWith('codeberg.org/')) {
    const rels = await json(`https://codeberg.org/api/v1/repos/${code.slice(13)}/releases?limit=3`);
    return (rels ?? []).flatMap((r) => (r.assets ?? []).map((a) => a.name));
  }
  if (code.startsWith('gitlab.com/')) {
    const rels = await json(`https://gitlab.com/api/v4/projects/${encodeURIComponent(code.slice(11))}/releases?per_page=3`);
    return (rels ?? []).flatMap((r) => (r.assets?.links ?? []).map((a) => a.name + ' ' + (a.url ?? '').split('/').pop()));
  }
  return [];
}

// GitHub: the 3 newest releases (WHY newest: `last` returns the oldest ones first, which have ancient file names), batched GraphQL like fetch-links.mjs. WHY 20, not 50: with 3 releases x 100 files each, 50 repos per query
// times out with a 502 (measured); a failed batch is split in half and retried so no project silently loses its data.
const assets = new Map(); // code -> [file names]
const gh = [...new Set(projects.map(codeOf).filter((c) => c.startsWith('github.com/') && c.split('/').length >= 3))];
async function batch(list) {
  const q = `query { ${list.map((c, k) => { const [, o, n] = c.split('/'); return `r${k}: repository(owner: ${JSON.stringify(o)}, name: ${JSON.stringify(n)}) { releases(first: 3, orderBy: {field: CREATED_AT, direction: DESC}) { nodes { releaseAssets(first: 100) { nodes { name } } } } }`; }).join('\n')} }`;
  let body = {};
  try {
    const res = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { Authorization: `Bearer ${GH}`, 'User-Agent': 'opensourceeverything' }, body: JSON.stringify({ query: q }), signal: AbortSignal.timeout(60_000) });
    body = await res.json();
  } catch { /* handled below */ }
  if (!body.data) {
    if (list.length === 1) { console.warn(`releases: ${list[0]} failed; README evidence only`); return; }
    const h = list.length >> 1; await batch(list.slice(0, h)); await batch(list.slice(h)); return;
  }
  list.forEach((c, k) => { const d = body.data[`r${k}`]; if (d) assets.set(c, d.releases.nodes.flatMap((r) => r.releaseAssets.nodes.map((a) => a.name))); });
}
for (let i = 0; i < gh.length; i += 20) { await batch(gh.slice(i, i + 20)); console.log(`releases: ${Math.min(i + 20, gh.length)}/${gh.length}`); }

async function platformsFor(p) {
  const code = codeOf(p);
  const found = new Map(); // platform -> evidence
  let proven = false;      // true once a download name or store link backs at least one platform
  const names = assets.get(code) ?? (code && !code.startsWith('github.com/') ? await otherAssets(code) : []);
  for (const [pl, file] of fromAssets(names)) { found.set(pl, `release file: ${file}`); proven = true; }
  if (code) for (const [pl, label] of fromReadme(await readmeFor(code))) {
    // WHY server is only a hint, and dropped for installable apps: Ollama or OBS mention Docker, but you just install them.
    if (pl === 'server') { if (!found.has('server') && (p.kind === 'self_hosted' || !found.size)) found.set('server', `README: ${label}`); continue; }
    if (!found.has(pl)) found.set(pl, `README: ${label}`);
    proven = true;
  }
  if (p.kind === 'self_hosted') { if (!found.has('server')) found.set('server', 'kind: self_hosted'); }
  const platforms = ORDER.filter((x) => found.has(x));
  // sure: backed by a download or store link, or a self-hosted project whose README also talks Docker/self-hosting.
  const sure = proven || (p.kind === 'self_hosted' && found.get('server')?.startsWith('README'));
  return { platforms, evidence: platforms.map((x) => `${x}: ${found.get(x)}`), sure: Boolean(sure) };
}

const result = {}; const queue = [...projects]; let done = 0;
await Promise.all(Array.from({ length: 12 }, async () => {
  for (let p = queue.shift(); p; p = queue.shift()) {
    result[p.id] = await platformsFor(p);
    if (++done % 50 === 0) console.log(`${done}/${projects.length}`);
  }
}));
writeFileSync(join(HERE, 'out/platforms.json'), JSON.stringify(result, null, 1));
const all = Object.values(result);
const per = Object.fromEntries(ORDER.map((x) => [x, all.filter((r) => r.platforms.includes(x)).length]));
console.log(`platforms: ${all.filter((r) => r.platforms.length).length} of ${all.length} projects have at least one; ${all.filter((r) => !r.sure).length} are not sure`);
console.log(per);

// WHY: open network connections can keep Node waiting after the work is saved.
process.exit(0);

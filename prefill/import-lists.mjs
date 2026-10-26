// Step 1 of the pre-fill (free, no AI): read the free alternative lists once, pull out
// "closed app → open project" pairs, merge duplicates, and write prefill/out/candidates.json
// plus a plain-language summary. Run: node prefill/import-lists.mjs
//
// WHY one-time: the map is self-contained after launch (Destin, Oct 26). These lists seed it and are
// credited forever (their licenses require it), but are never read again.
// Downloads go to prefill/.cache/<source>/ (ignored by git), each source in its own folder.

import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE = join(HERE, '.cache');
const OUT = join(HERE, 'out');

const SOURCES = {
  'awesome-privacy': { license: 'CC0-1.0', url: 'https://raw.githubusercontent.com/pluja/awesome-privacy/main/README.md' },
  'awesome-foss-alternatives': { license: 'CC-BY-4.0', url: 'https://raw.githubusercontent.com/sfermigier/awesome-foss-alternatives/main/README.md' },
  'awesome-oss-alternatives': { license: 'MIT', url: 'https://raw.githubusercontent.com/RunaCapital/awesome-oss-alternatives/main/README.md' },
  'open-source-alternatives': { license: 'MIT', url: 'https://raw.githubusercontent.com/btw-so/open-source-alternatives/main/README.md' },
  'switching.software': { license: 'CC-BY-SA-4.0', tarball: 'https://codeberg.org/swiso/website/archive/main.tar.gz' },
  'awesome-selfhosted': { license: 'CC-BY-SA-3.0', tarball: 'https://github.com/awesome-selfhosted/awesome-selfhosted-data/archive/refs/heads/master.tar.gz' },
};

// ── Downloading ──
async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.text();
}
async function getReadme(name) {
  const dir = join(CACHE, name); mkdirSync(dir, { recursive: true });
  const file = join(dir, 'README.md');
  if (!existsSync(file)) writeFileSync(file, await fetchText(SOURCES[name].url));
  return readFileSync(file, 'utf8');
}
async function getTarball(name) {
  const dir = join(CACHE, name);
  if (!existsSync(dir) || readdirSync(dir).length === 0) {
    mkdirSync(dir, { recursive: true });
    const res = await fetch(SOURCES[name].tarball);
    if (!res.ok) throw new Error(`${name}: ${res.status}`);
    writeFileSync(join(dir, 'src.tar.gz'), Buffer.from(await res.arrayBuffer()));
    // WHY tar with -C: extract inside this source's own folder only.
    execFileSync('tar', ['xzf', 'src.tar.gz', '-C', dir], { cwd: dir });
  }
  const top = readdirSync(dir).find((f) => f !== 'src.tar.gz');
  return join(dir, top);
}

// ── Normalising ──
const REPO_RE = /https?:\/\/(?:www\.)?(github\.com|gitlab\.com|codeberg\.org)\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i;
export function repoOf(url) {
  const m = url?.match(REPO_RE);
  if (!m) return undefined;
  const name = m[3].replace(/\.git$/i, '');
  if (['orgs', 'sponsors', 'topics', 'apps', 'marketplace'].includes(m[2].toLowerCase())) return undefined;
  return `${m[1].toLowerCase()}/${m[2]}/${name}`;
}
const key = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '');
// Spellings the lists use for the same closed app. Extended by hand as the summary shows splits.
const ALIASES = {
  'msoffice': 'Microsoft Office', 'office365': 'Microsoft Office', 'microsoft365': 'Microsoft Office',
  'googledocs': 'Google Docs', 'gdocs': 'Google Docs', 'gmail': 'Gmail', 'googlemail': 'Gmail',
  'googledrive': 'Google Drive', 'gdrive': 'Google Drive', 'teams': 'Microsoft Teams', 'msteams': 'Microsoft Teams',
  'onenote': 'Microsoft OneNote', 'microsoftonenote': 'Microsoft OneNote', 'photoshop': 'Adobe Photoshop',
  'lightroom': 'Adobe Lightroom', 'premiere': 'Adobe Premiere Pro', 'premierepro': 'Adobe Premiere Pro',
  'illustrator': 'Adobe Illustrator', 'indesign': 'Adobe InDesign', 'aftereffects': 'Adobe After Effects',
  'acrobat': 'Adobe Acrobat', 'githubcopilot': 'GitHub Copilot', 'copilot': 'GitHub Copilot', 'x': 'Twitter / X',
  'twitter': 'Twitter / X', 'twitterx': 'Twitter / X', 'lastpass': 'LastPass', '1password': '1Password',
  'googleanalytics': 'Google Analytics', 'ga': 'Google Analytics', 'chatgpt': 'ChatGPT', 'openai': 'ChatGPT',
  'macos': 'macOS', 'windows': 'Windows', 'googlemaps': 'Google Maps', 'googlekeep': 'Google Keep',
  'googlecalendar': 'Google Calendar', 'googlemeet': 'Google Meet', 'googlechrome': 'Google Chrome', 'chrome': 'Google Chrome',
  'googleforms': 'Google Forms', 'googlesearch': 'Google Search', 'googletranslate': 'Google Translate', 'github': 'GitHub', 'bitly': 'Bitly',
};
export function closedName(raw) {
  // WHY strip images first: awesome-privacy puts logos ("![](logo.png)") beside some names.
  const clean = raw.replace(/!\[[^\]]*\](\([^)]*\))?/g, '').replace(/\[\s*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\.{2,}|…/g, '').replace(/^(the|a|an)\s+/i, '').trim();
  if (!clean || clean.length > 40) return undefined;
  return ALIASES[key(clean)] ?? clean;
}
// "Slack, Discord alternatives" / "Notion alternatives" / "Zoom, Webex, Google Meet, Skype... alternatives"
function closedFromHeading(h) {
  const m = h.match(/\(([^)]*?)\s*alternatives?\)/i);
  if (!m) return [];
  return m[1].split(/,|\/| or | and /i).map(closedName).filter(Boolean);
}
const linkRe = /\[([^\]]+)\]\(([^)]+)\)/;

// ── Parsers: each returns [{ source, closed: [names], name, url, repo, description, category }] ──
function parsePrivacy(md) {
  const out = []; let section = ''; let mode = ''; let avoid = [];
  for (const line of md.split('\n')) {
    const h = line.match(/^#{2,4}\s+(.*)/);
    if (h) { section = h[1].trim(); mode = ''; avoid = []; continue; }
    if (/⛔\s*\*\*Avoid\*\*/.test(line)) { mode = 'avoid'; avoid = []; continue; }
    if (/✅\s*\*\*Instead use\*\*/.test(line)) { mode = 'use'; continue; }
    if (!/^- /.test(line)) continue; // WHY: indented sub-bullets are clients of the entry above, not alternatives
    if (mode === 'avoid') { const n = closedName(line.slice(2)); if (n) avoid.push(n); }
    else if (mode === 'use' && avoid.length) {
      const m = line.match(linkRe); if (!m) continue;
      out.push({ source: 'awesome-privacy', closed: [...avoid], name: m[1].trim(), url: m[2], repo: repoOf(m[2]), description: line.split(/\)\s*[-–]\s*/)[1]?.trim() ?? '', category: section });
    }
  }
  return out;
}
function parseHeadingLists(md, source) {
  const out = []; let closed = []; let category = '';
  for (const line of md.split('\n')) {
    const h = line.match(/^#{2,4}\s+(.*)/);
    if (h) { category = h[1].replace(/\s*\(.*$/, '').replace(/:$/, '').trim(); closed = closedFromHeading(h[1]); continue; }
    if (!closed.length) continue;
    const m = line.match(/^(?:- )?\[([^\]]+)\]\(([^)]+)\)/);
    if (!m) continue;
    const desc = source === 'awesome-foss-alternatives' ? (line.split(/★\d+\s*-\s*/)[1] ?? '').replace(/\s*\[[^\]]*\]\s*$/, '').trim() : '';
    out.push({ source, closed: [...closed], name: m[1].trim(), url: m[2], repo: repoOf(line) ?? repoOf(m[2]), description: desc, category });
  }
  return out;
}
function parseRuna(md) {
  const out = [];
  for (const line of md.split('\n')) {
    const cells = line.split('|');
    if (cells.length < 5 || !linkRe.test(cells[1] ?? '')) continue;
    const name = cells[1].match(linkRe);
    const closed = [...(cells[4] ?? '').matchAll(/\[([^\]]+)\]/g)].map((m) => closedName(m[1])).filter(Boolean);
    if (!closed.length) continue;
    out.push({ source: 'awesome-oss-alternatives', closed, name: name[1].trim(), url: name[2], repo: repoOf(cells[3]) ?? repoOf(name[2]), description: (cells[2] ?? '').trim(), category: cells[0].trim() });
  }
  return out;
}
function parseSwiso(root) {
  const out = []; const content = join(root, 'content');
  const titles = {};
  for (const slug of readdirSync(join(content, 'replaces'))) {
    const f = join(content, 'replaces', slug, '_index.en.md');
    if (existsSync(f)) titles[slug] = readFileSync(f, 'utf8').match(/^title:\s*(.+)$/m)?.[1]?.trim();
  }
  for (const slug of readdirSync(join(content, 'use'))) {
    const f = join(content, 'use', slug, 'index.en.md');
    if (!existsSync(f)) continue;
    const text = readFileSync(f, 'utf8');
    const fm = text.split('---')[1] ?? '';
    const replaces = [...fm.matchAll(/^\s+-\s+([a-z0-9-]+)\s*$/gm)].map((m) => m[1]).filter((s) => titles[s]);
    if (!replaces.length) continue;
    const site = text.match(/\*\*Website:\*\*[\s\S]*?\((https?:[^)]+)\)/)?.[1];
    const code = text.match(/\*\*Source Code:\*\*[\s\S]*?\((https?:[^)]+)\)/)?.[1];
    out.push({ source: 'switching.software', closed: replaces.map((s) => closedName(titles[s])).filter(Boolean), name: fm.match(/^title:\s*(.+)$/m)?.[1]?.trim() ?? slug,
      url: site ?? code ?? '', repo: repoOf(code) ?? repoOf(site), description: '', category: '' });
  }
  return out;
}
// awesome-selfhosted names no closed apps; it's a pool of projects (with code links and licenses) the AI step can match later.
function parseSelfhosted(root) {
  const pool = [];
  for (const f of readdirSync(join(root, 'software'))) {
    const y = readFileSync(join(root, 'software', f), 'utf8');
    const field = (k) => y.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1]?.trim().replace(/^['"]|['"]$/g, '');
    const list = (k) => (y.match(new RegExp(`^${k}:\\n((?:\\s+-.*\\n?)+)`, 'm'))?.[1] ?? '').split('\n').map((s) => s.replace(/^\s+-\s*/, '').trim()).filter(Boolean);
    pool.push({ source: 'awesome-selfhosted', name: field('name'), url: field('website_url') ?? field('source_code_url'), repo: repoOf(field('source_code_url')),
      description: field('description') ?? '', licenses: list('licenses'), tags: list('tags'), archived: /^archived:\s*true/m.test(y) });
  }
  return pool;
}

// ── Merge ──
async function main() {
  const records = [
    ...parsePrivacy(await getReadme('awesome-privacy')),
    ...parseHeadingLists(await getReadme('awesome-foss-alternatives'), 'awesome-foss-alternatives'),
    ...parseHeadingLists(await getReadme('open-source-alternatives'), 'open-source-alternatives'),
    ...parseRuna(await getReadme('awesome-oss-alternatives')),
    ...parseSwiso(await getTarball('switching.software')),
  ];
  const pool = parseSelfhosted(await getTarball('awesome-selfhosted'));

  // WHY identity = code link when there is one, else the name: the same project appears as
  // "AppFlowy" with a github link in one list and a website in another.
  const byName = new Map(); const projects = new Map();
  const idOf = (r) => (r.repo ? r.repo.toLowerCase() : byName.get(key(r.name)) ?? `name:${key(r.name)}`);
  for (const r of [...records].sort((a, b) => !!b.repo - !!a.repo)) {
    const id = idOf(r);
    if (r.repo) byName.set(key(r.name), id);
    const p = projects.get(id) ?? { id, name: r.name, repo: r.repo, urls: new Set(), descriptions: [], sources: new Set(), closed: new Map(), categories: new Set() };
    if (!p.repo && r.repo) p.repo = r.repo;
    if (r.url) p.urls.add(r.url);
    if (r.description) p.descriptions.push({ source: r.source, text: r.description });
    p.sources.add(r.source);
    if (r.category) p.categories.add(r.category);
    for (const c of r.closed) { const k = key(c); const e = p.closed.get(k) ?? { name: c, sources: new Set() }; e.sources.add(r.source); p.closed.set(k, e); }
    projects.set(id, p);
  }
  // Fill code links from the self-hosted pool by name where the lists gave only a website.
  const poolByName = new Map(pool.map((x) => [key(x.name ?? ''), x]));
  let filledFromPool = 0;
  for (const p of projects.values()) {
    const hit = poolByName.get(key(p.name));
    if (!p.repo && hit?.repo) { p.repo = hit.repo; filledFromPool++; }
  }

  const closedApps = new Map();
  for (const p of projects.values()) for (const [k, c] of p.closed) {
    const e = closedApps.get(k) ?? { name: c.name, projects: 0, agreed: 0 };
    e.projects++; if (c.sources.size > 1) e.agreed++;
    closedApps.set(k, e);
  }

  const list = [...projects.values()].map((p) => ({
    id: p.id, name: p.name, repo: p.repo ?? null, urls: [...p.urls], sources: [...p.sources].sort(), categories: [...p.categories],
    descriptions: p.descriptions, replaces: [...p.closed.values()].map((c) => ({ name: c.name, sources: [...c.sources].sort() })),
  })).sort((a, b) => a.name.localeCompare(b.name));

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'candidates.json'), JSON.stringify({ note: 'Generated by prefill/import-lists.mjs. Sources and licenses: see SOURCES in that script.', sources: SOURCES, projects: list,
    closedApps: [...closedApps.values()].sort((a, b) => b.projects - a.projects) }, null, 1));
  writeFileSync(join(OUT, 'pool-selfhosted.json'), JSON.stringify(pool, null, 1));

  const n = list.length, withRepo = list.filter((p) => p.repo).length;
  const pairs = list.reduce((s, p) => s + p.replaces.length, 0);
  const multi = list.reduce((s, p) => s + p.replaces.filter((c) => c.sources.length > 1).length, 0);
  const perSource = Object.keys(SOURCES).map((s) => `| ${s} | ${SOURCES[s].license} | ${s === 'awesome-selfhosted' ? pool.length + ' (pool, no closed apps named)' : records.filter((r) => r.source === s).length} |`).join('\n');
  const top = [...closedApps.values()].sort((a, b) => b.projects - a.projects).slice(0, 40).map((c) => `${c.name} (${c.projects})`).join(', ');
  const summary = `# Pre-fill step 1: what the free lists gave us

Generated ${new Date().toISOString().slice(0, 10)} by \`prefill/import-lists.mjs\`. No AI, no cost.

| Source | License | Entries read |
|---|---|---|
${perSource}

- **${n} distinct open projects** named as replacing at least one closed app.
- **${withRepo}** of them have a code link (GitHub, GitLab or Codeberg); ${filledFromPool} of those were filled in from awesome-selfhosted by name.
  The other **${n - withRepo}** only have a website, so their license can't be checked automatically yet.
- **${closedApps.size} distinct closed apps** named.
- **${pairs} "project replaces closed app" pairs**; **${multi}** of them are named by two or more lists.
- **awesome-selfhosted** adds **${pool.length}** more projects that don't name a closed app; the AI step can match them.

Most-named closed apps (number of open projects): ${top}.
`;
  writeFileSync(join(OUT, 'summary.md'), summary);
  console.log(summary);
}
// WHY: only run when called directly; find-code-links.mjs imports repoOf from here.
if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e); process.exit(1); });

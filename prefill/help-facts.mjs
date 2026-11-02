// "How to help" facts for every GitHub project: its contributing guide, and how many open "good first issue" and
// "help wanted" issues it has. Writes data/help.json. Run: GH_TOKEN=$(gh auth token) node prefill/help-facts.mjs
// (the weekly refresh runs it with the workflow's own token; see .github/workflows/refresh.yml).
//
// WHY GitHub's batch API (GraphQL), 20 projects per request: the one-at-a-time way would need ~8 calls per project and hit
// GitHub's hourly limit (same reasoning as prefill/github-facts.mjs). About 420 GitHub projects = ~21 requests.
// WHY only counts, not the issues: the site links to GitHub's own filtered list, so it can't go stale and stays small.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) { console.error('Set GH_TOKEN (e.g. GH_TOKEN=$(gh auth token)).'); process.exit(1); }
const projects = JSON.parse(readFileSync(join(ROOT, 'data/projects.json'), 'utf8')).projects;
const repoOf = (p) => (p.code ?? '').replace(/^https?:\/\//, '').match(/^github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
const github = projects.map((p) => ({ p, m: repoOf(p) })).filter((x) => x.m);

// The places a contributing guide usually lives, tried in this order.
const GUIDES = ['CONTRIBUTING.md', '.github/CONTRIBUTING.md', 'docs/CONTRIBUTING.md', 'CONTRIBUTING.rst', 'CONTRIBUTING', 'docs/contributing.md'];
const fields = (g) => `defaultBranchRef { name } ${GUIDES.map((f, i) => `g${i}: object(expression: ${JSON.stringify(`HEAD:${f}`)}) { oid }`).join(' ')}
  good: issues(states: OPEN, labels: ["good first issue"]) { totalCount } wanted: issues(states: OPEN, labels: ["help wanted"]) { totalCount }`;
async function batch(list) {
  const q = `query { ${list.map(({ m }, i) => `r${i}: repository(owner: ${JSON.stringify(m[1])}, name: ${JSON.stringify(m[2])}) { ${fields()} }`).join('\n')} }`;
  // WHY retries: GitHub answers 502/504 when a batch is slow (it did at 40 projects); a short wait and a second try works.
  let res;
  for (let attempt = 1; attempt <= 3; attempt++) {
    res = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'User-Agent': 'opensourceeverything' }, body: JSON.stringify({ query: q }) });
    if (res.ok || res.status < 500) break;
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json();
  return list.map((x, i) => ({ ...x, data: body.data?.[`r${i}`] ?? null }));
}

const out = {};
for (let i = 0; i < github.length; i += 20) {
  for (const { p, m, data } of await batch(github.slice(i, i + 20))) {
    if (!data) continue; // renamed or deleted: nothing to say
    const guide = GUIDES.findIndex((_, k) => data[`g${k}`]);
    const entry = {};
    if (guide >= 0) entry.contributing = `https://github.com/${m[1]}/${m[2]}/blob/HEAD/${GUIDES[guide]}`;
    if (data.good.totalCount) entry.good = data.good.totalCount;
    if (data.wanted.totalCount) entry.wanted = data.wanted.totalCount;
    if (Object.keys(entry).length) out[p.id] = entry;
  }
}
// WHY a note and sorted keys: this file is regenerated weekly; a stable order keeps the pull request small.
const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(join(ROOT, 'data/help.json'), JSON.stringify({ _about: 'Written by prefill/help-facts.mjs from GitHub: contributing guide address and counts of open "good first issue" and "help wanted" issues. Do not edit by hand.', updated: new Date().toISOString().slice(0, 10), projects: sorted }, null, 1) + '\n');
console.log(`help facts for ${Object.keys(sorted).length} of ${github.length} GitHub projects`);

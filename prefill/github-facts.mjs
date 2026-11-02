// Step 2 of the pre-fill (free, no AI): look up every GitHub project from step 1 in batches and
// keep only real open-source ones. Writes prefill/out/facts.json and adds to summary.md.
// Run: GH_TOKEN=$(gh auth token) node prefill/github-facts.mjs   (after `npm run build` in checker/)
//
// WHY GitHub's batch API (GraphQL): one request answers 50 projects. The one-at-a-time checker would
// need ~8 requests per project and run into GitHub's hourly limit on a list this size.
// WHY the bot's license list: the site and the subreddit must agree on what counts as open source.

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { licenseVerdict } from '../checker/dist/from-bot/rules.js';
// -- forks stream: "forked from", fork count and latest release, from the same batch (see family-facts.mjs) --
import { FAMILY_FIELDS, familyOf } from './family-facts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) { console.error('Set GH_TOKEN (e.g. GH_TOKEN=$(gh auth token)).'); process.exit(1); }

const { projects } = JSON.parse(readFileSync(join(OUT, 'candidates.json'), 'utf8'));
const github = projects.filter((p) => p.repo?.startsWith('github.com/'));

async function batch(list) {
  const fields = 'nameWithOwner stargazerCount isArchived isFork pushedAt createdAt licenseInfo { spdxId } description ' + FAMILY_FIELDS;
  const q = `query { ${list.map((p, i) => {
    const [, owner, name] = p.repo.split('/');
    return `r${i}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { ${fields} }`;
  }).join('\n')} }`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'User-Agent': 'opensourceeverything' }, body: JSON.stringify({ query: q }),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  const body = await res.json();
  // WHY: a deleted or renamed project comes back as null with an error; that's an answer, not a failure.
  return list.map((p, i) => ({ id: p.id, data: body.data?.[`r${i}`] ?? null }));
}

const results = [];
for (let i = 0; i < github.length; i += 50) results.push(...await batch(github.slice(i, i + 50)));

const YEAR = 365 * 24 * 3600 * 1000;
const facts = results.map(({ id, data }) => {
  if (!data) return { id, found: false };
  const spdx = data.licenseInfo?.spdxId ?? undefined;
  return {
    id, found: true, repo: data.nameWithOwner, stars: data.stargazerCount, archived: data.isArchived, fork: data.isFork,
    createdAt: data.createdAt, pushedAt: data.pushedAt, license: spdx ?? null, licenseVerdict: licenseVerdict(spdx),
    quietForAYear: Date.now() - new Date(data.pushedAt).getTime() > YEAR, githubDescription: data.description,
    ...familyOf(data), // forks stream
  };
});
writeFileSync(join(OUT, 'facts.json'), JSON.stringify(facts, null, 1));

const found = facts.filter((f) => f.found);
const open = found.filter((f) => f.licenseVerdict === 'open');
const count = (fn) => found.filter(fn).length;
const text = `
## Step 2: GitHub facts (${new Date().toISOString().slice(0, 10)}, free)

Looked up **${github.length}** GitHub projects in ${Math.ceil(github.length / 50)} batch requests.

- **${github.length - found.length}** no longer exist (deleted, renamed or private).
- **${open.length}** have an OSI-approved open-source license (the same list the mod bot uses).
- **${count((f) => f.licenseVerdict === 'unclear')}** have a license GitHub can't match to a known open-source one (often "source-available"); a person decides.
- **${count((f) => f.licenseVerdict === 'missing')}** have no license file at all.
- Of the open-source ones: **${open.filter((f) => f.archived).length}** are archived and **${open.filter((f) => !f.archived && f.quietForAYear).length}** more had no changes in a year (they'd show "Inactive").
- GitLab and Codeberg projects (${projects.filter((p) => p.repo && !p.repo.startsWith('github.com/')).length}) and website-only ones (${projects.filter((p) => !p.repo).length}) still need a look.
`;
appendFileSync(join(OUT, 'summary.md'), text);
console.log(text);

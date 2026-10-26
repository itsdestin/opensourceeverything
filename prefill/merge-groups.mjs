// Step 4 of the pre-fill (paid, ~$0.10): the AI review proposed ~170 new group names for projects
// outside the starter set's 58 groups. One Claude Opus 5.5 request merges them into a small set of new
// groups, each placed in an existing category (or a new one). Output: prefill/out/new-groups.json.
// Run: node prefill/merge-groups.mjs
//
// WHY one request with the strongest model: grouping is a judgment call across the whole list at once;
// doing it per project would produce near-duplicates ("Feature flags" vs "Feature flag management").

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const apiKey = process.env.ANTHROPIC_API_KEY ?? readFileSync(join(homedir(), '.config/alternatives-map/anthropic-key'), 'utf8').trim();
const client = new Anthropic({ apiKey, maxRetries: 4 });
const starter = JSON.parse(readFileSync(join(HERE, '..', 'data/starter.json'), 'utf8'));
const reviews = JSON.parse(readFileSync(join(OUT, 'ai-review.json'), 'utf8')).filter((r) => r.answer);

// Only projects worth listing: open (or open core), and not wholly mislisted.
const keep = reviews.filter((r) => ['open', 'open_core'].includes(r.answer.license.verdict) && r.answer.replaces.some((x) => x.fit !== 'no'));
const proposals = {};
for (const r of keep) if (!r.answer.groups.length && r.answer.newGroup) (proposals[r.answer.newGroup] ??= []).push(`${r.name}: replaces ${r.answer.replaces.filter((x) => x.fit !== 'no').map((x) => x.closedApp).join(', ')}`);

const categories = starter.categories.map((c) => `${c.id}: ${c.name} (groups: ${c.groups.map((g) => g.name).join(', ')})`).join('\n');
const list = Object.entries(proposals).map(([g, ps]) => `- "${g}": ${ps.join(' | ')}`).join('\n');

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['groups', 'newCategories'],
  properties: {
    newCategories: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'name'], properties: { id: { type: 'string' }, name: { type: 'string' } } } },
    groups: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'name', 'category', 'job', 'closed', 'merges'],
      properties: {
        id: { type: 'string' }, name: { type: 'string' }, category: { type: 'string' }, job: { type: 'string' },
        closed: { type: 'array', items: { type: 'string' } },
        merges: { type: 'array', items: { type: 'string' } },
      } } },
  },
};

// WHY stream: a long structured answer; the SDK requires streaming for requests that may run past 10 minutes.
const res = await client.messages.stream({
  model: 'claude-opus-5-5', max_tokens: 32000,
  output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
  system: `You organize a public map of open-source alternatives to closed-source apps. A "group" is one job people need done (e.g. "Website analytics"); a "category" is a shelf of groups for browsing.
Existing categories and their groups:
${categories}`,
  messages: [{ role: 'user', content: `These group names were proposed one project at a time, so many overlap. Merge them into as few new groups as make sense (aim for roughly 20 to 40), each one clear job a non-technical reader understands.
- Put each new group in an existing category id where it fits; create a new category only if several groups share a shelf none of the existing ones covers. Avoid creating near-copies of existing groups: if a proposal is really an existing group, leave it out of your groups (it will be matched later).
- name: plain words, sentence case. job: one short phrase. closed: the closed apps it replaces (from the projects listed). merges: every proposed name this group absorbs, spelled exactly as given.
- Every proposed name must appear in exactly one group's merges, unless it duplicates an existing group.

Proposed names, each with its projects and what they replace:
${list}` }],
}).finalMessage();
const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
const out = JSON.parse(text);
const covered = new Set(out.groups.flatMap((g) => g.merges));
const unplaced = Object.keys(proposals).filter((p) => !covered.has(p));
writeFileSync(join(OUT, 'new-groups.json'), JSON.stringify({ ...out, unplaced }, null, 1));
const cost = (res.usage.input_tokens * 4 + res.usage.output_tokens * 20) / 1e6;
const msg = `
## Step 4: merging proposed groups (${new Date().toISOString().slice(0, 10)}, claude-opus-5-5)

- ${Object.keys(proposals).length} proposed names → **${out.groups.length} new groups**${out.newCategories.length ? ` and **${out.newCategories.length} new categories** (${out.newCategories.map((c) => c.name).join(', ')})` : ''}.
- ${unplaced.length} proposals judged to duplicate an existing group (matched later).
- Cost: **$${cost.toFixed(2)}**.
`;
appendFileSync(join(OUT, 'summary.md'), msg);
console.log(msg);
console.log(out.groups.map((g) => `${g.category} / ${g.name} — replaces ${g.closed.slice(0, 4).join(', ')}`).join('\n'));

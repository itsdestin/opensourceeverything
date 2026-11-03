// Evidence map step 1 (docs/evidence-map-design.md §1): the closed apps answer the same checklists the open projects answer,
// so the gaps page can say "no open project does X, but Word and Google Docs do".
// Writes prefill/out/closed-answers.json (one entry per closed app, saved after every app so a stopped run resumes).
//
// Run (from the repo root):
//   node prefill/closed-answers.mjs --count                       free: token count + cost estimate, no answers
//   node prefill/closed-answers.mjs --only "Microsoft Word,Zoom"   paid: just these apps (a pilot)
//   node prefill/closed-answers.mjs --limit 10 --model sonnet     paid: the first 10 apps not done yet
//   node prefill/closed-answers.mjs                               paid: everything not done yet
//
// WHY web search, unlike the open projects' step (which read each README): closed apps have no README; their help pages and
// feature pages are the honest source. Every yes / partly / no must carry a URL and a short quote from that page, so the
// "Source:" label on the site can link to it (design §2), and a later spot-check can test whether the page says it.
// WHY blank ("unknown") when unsure: same rule as the open answers — a wrong "yes" misleads; a blank only says "not checked".
// WHY one request per app covering all of its checklist items: an app in several groups (Microsoft 365) shares one search pass.

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : null; };
// WHY --out: the pilot runs both models on the same apps; separate files keep one model's answers from skipping the other's.
const OUT = join(HERE, arg('out') ?? 'out/closed-answers.json'); mkdirSync(dirname(OUT), { recursive: true });
const read = (f) => JSON.parse(readFileSync(f, 'utf8'));
const features = read(join(ROOT, 'data/features.json'));
const groups = read(join(ROOT, 'data/groups.json')).groups;

// WHY two model choices: Haiku is ~20x cheaper per word read; Sonnet reads pages more carefully and gets the newer search
// that filters pages before reading them. The pilot compares both before Destin picks one for the full run.
const MODELS = {
  haiku: { id: 'claude-haiku-5-5', inPrice: 0.10, outPrice: 0.50, search: 'web_search_20250305', fetch: 'web_fetch_20250910' },
  sonnet: { id: 'claude-sonnet-5-5', inPrice: 2.00, outPrice: 10.00, search: 'web_search_20260209', fetch: 'web_fetch_20260209' },
};
const M = MODELS[arg('model') ?? 'haiku'];
if (!M) { console.error('--model must be haiku or sonnet'); process.exit(1); }
const SEARCH_PRICE = 0.01; // $10 per 1,000 searches; reading fetched pages costs only the words read

// Per closed app: every checklist item from every group that lists it, and those groups' names (context for the model).
const apps = new Map();
for (const g of groups) for (const name of g.closed ?? []) {
  const tags = features.groups[g.id] ?? [];
  if (!tags.length) continue;
  const a = apps.get(name) ?? { name, tags: new Set(), groups: new Set() };
  tags.forEach((t) => a.tags.add(t)); a.groups.add(g.name);
  apps.set(name, a);
}
// WHY skipped (docs/closed-apps-cleanup.md §5, Destin Nov 2): the bundles' answers would only repeat Word, Excel and
// PowerPoint's; the two generic names have no single maker to check. Their pages stay.
const SKIP = new Set(['Microsoft Office', 'Microsoft 365', 'Google Workspace', 'Built-in smart TV software', 'Vendor router firmware']);
for (const n of SKIP) apps.delete(n);
const done = existsSync(OUT) ? read(OUT) : {};
let todo = [...apps.values()].filter((a) => !done[a.name]);
if (arg('only')) { const want = new Set(arg('only').split(',').map((s) => s.trim())); todo = todo.filter((a) => want.has(a.name)); }
if (arg('limit')) todo = todo.slice(0, Number(arg('limit')));

// WHY the source and paid-plan rules (pilot, Nov 2): 1 in 5 Haiku answers cited comparison blogs, and Slack's paid-only
// single sign-on came back "no" while Dropbox's paid-only links came back "partly". One rule for both.
const SYSTEM = `You fill in a feature checklist for one closed (not open-source) app, for a public map read by everyday people.
Always search before answering: an app with no searches has no sources, and every answer then becomes a blank.
Use web search and web fetch to check each item against the app maker's own pages (feature pages, help center, docs, pricing,
system requirements, app store listings) first. When the maker says nothing, an established outlet (a major tech news
site, Wikipedia) is acceptable; never a pricing-comparison, SEO or "alternatives" blog, or a page that looks machine-written.
For each item give:
- v: "yes", "partly" or "no", following the item's meaning; or "unknown" if you could not find a page that clearly says.
  Prefer "unknown" over a guess or over your own memory. Answer "no" only when a page makes it clear.
- note: for "partly" (and optionally "no"), under 70 characters in plain words; otherwise null.
- source: for yes / partly / no, the URL of the page that backs it; null for unknown.
- quote: for yes / partly / no, a short exact phrase from that page; null for unknown.
First check that the app still exists. If it has shut down, or was merged into or replaced by another product, set
status to "discontinued" (or "renamed"), give the page that says so in statusSource, name the replacement in statusNote,
and answer every item "unknown". Otherwise status is "current" and statusSource and statusNote are null.
Answer about the app as offered today, not a discontinued version. If something is only in some paid plans, answer "partly"
and name the plan in the note (e.g. "Business plan and up only").
When finished, reply with only the JSON object described below and nothing else:
{"status":"current|discontinued|renamed","statusNote":null,"statusSource":null,
 "answers":[{"tag":"...","v":"yes|partly|no|unknown","note":null,"source":null,"quote":null}]}`;

const tagDef = (t) => features.tags[t];
const input = (a) => `App: ${a.name}\nListed under: ${[...a.groups].join('; ')}\n\nItems:\n` +
  [...a.tags].map((t) => `- ${t}: ${tagDef(t).name}. ${tagDef(t).question} (${tagDef(t).meaning})`).join('\n');
const tools = [
  // WHY more for Sonnet: its newer search runs several queries per step, so 5 ran out before 8-11 items were checked and it
  // answered the rest "unknown" (pilot, Nov 2).
  { type: M.search, name: 'web_search', max_uses: M.id.includes('sonnet') ? 12 : 5 },
  { type: M.fetch, name: 'web_fetch', max_uses: 5 },
];

const keyFile = join(homedir(), '.config/alternatives-map/anthropic-key');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? readFileSync(keyFile, 'utf8').trim(), maxRetries: 6 });

if (process.argv.includes('--count')) {
  // WHY only the question part is counted: search results are added by the server mid-request, so their size can't be
  // counted in advance. The estimate below assumes a range for them; the paid pilot measures the real figure.
  let base = 0; const sample = todo.slice(0, 40);
  for (const a of sample) base += (await client.messages.countTokens({ model: M.id, system: SYSTEM, messages: [{ role: 'user', content: input(a) }] })).input_tokens;
  base /= sample.length;
  const answers = todo.reduce((s, a) => s + a.tags.size, 0);
  console.log(`${todo.length} apps, ${answers} answers to fill; question part ~${Math.round(base)} tokens per app (${M.id})`);
  for (const [label, searches, pageTokens] of [['light', 3, 15_000], ['typical', 5, 40_000], ['heavy', 8, 90_000]]) {
    // WHY pages are counted ~2x: each search/fetch round re-sends what was read so far to the model.
    const inTok = base * 3 + pageTokens * 2, outTok = 2_500;
    const per = (inTok * M.inPrice + outTok * M.outPrice) / 1e6 + Math.min(searches, 5) * SEARCH_PRICE;
    console.log(`  ${label.padEnd(8)} ${searches} searches, ~${pageTokens / 1000}k words-read tokens: $${per.toFixed(3)}/app → $${(per * todo.length).toFixed(0)} total`);
  }
  process.exit(0);
}

// WHY "pause_turn" handling: with server tools the API may stop mid-research and expect the same turn to be sent back.
async function ask(a) {
  const messages = [{ role: 'user', content: input(a) }];
  const usage = { in: 0, out: 0, searches: 0, fetches: 0 };
  for (let round = 0; round < 6; round++) {
    const res = await client.messages.create({ model: M.id, max_tokens: 16000, system: SYSTEM, tools, messages,
      // WHY medium on Sonnet: at low it often answered every item "unknown" without searching (pilot, Nov 2).
      output_config: { effort: M.id.includes('sonnet') ? 'medium' : 'low' } });
    usage.in += res.usage.input_tokens + (res.usage.cache_read_input_tokens ?? 0) + (res.usage.cache_creation_input_tokens ?? 0);
    usage.out += res.usage.output_tokens;
    usage.searches += res.usage.server_tool_use?.web_search_requests ?? 0;
    usage.fetches += res.usage.server_tool_use?.web_fetch_requests ?? 0;
    if (res.stop_reason === 'pause_turn') { messages.push({ role: 'assistant', content: res.content }); continue; }
    if (res.stop_reason === 'refusal') throw new Error('refused');
    const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const o = JSON.parse(json);
    return { answers: o.answers, status: { is: o.status ?? 'current', note: o.statusNote, source: o.statusSource }, usage };
  }
  throw new Error('still researching after 6 rounds');
}

// WHY 4 at a time: the account's key refuses more concurrent requests (429 on Oct 27).
const queue = [...todo]; let cost = 0, n = 0, failed = 0;
const today = new Date().toISOString().slice(0, 10);
await Promise.all(Array.from({ length: 4 }, async () => {
  for (let a = queue.shift(); a; a = queue.shift()) {
    try {
      const { answers, status, usage } = await ask(a);
      const c = (usage.in * M.inPrice + usage.out * M.outPrice) / 1e6 + usage.searches * SEARCH_PRICE;
      cost += c;
      const want = new Set(a.tags);
      // WHY drop answers without a source: design §2 — every value shows where it came from; an unsourced one is a blank.
      const kept = Object.fromEntries(answers.filter((x) => want.has(x.tag) && x.v !== 'unknown' && x.source)
        .map((x) => [x.tag, { v: x.v, ...(x.note ? { note: x.note } : {}), source: x.source, quote: x.quote, by: 'ai', checked: today }]));
      // WHY keep the dropped ones: shows how many were blank or unsourced, for the quality check and the error rate.
      // WHY status (cleanup §6): shut-down apps stay listed with a "Discontinued" label; this is where the label's facts come from.
      done[a.name] = { status, answers: kept, dropped: answers.filter((x) => !kept[x.tag]), model: M.id, usage, cost: Number(c.toFixed(4)) };
      writeFileSync(OUT, JSON.stringify(done, null, 1) + '\n');
      console.log(`${++n}/${todo.length} ${a.name}: ${status.is === 'current' ? '' : status.is.toUpperCase() + ' '}${Object.keys(kept).length}/${want.size} answered, ${usage.searches} searches, $${c.toFixed(3)}`);
    } catch (e) { failed++; console.error(`${a.name}: ${e.message}`); }
  }
}));
console.log(`done: ${n} apps, ${failed} failed, $${cost.toFixed(2)} spent`);

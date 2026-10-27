// Tests for the AI connector (POST /mcp), the plain JSON API (GET /v1/...) and the seven tools behind them
// (src/agent.js, src/mcp.js, src/v1.js). No network and no database: the tools run on a tiny made-up map (fixture), and
// one block checks the real map's search against the website's search.
// Run: node --test test/agent.test.mjs   (npm test makes the bundled data copy first)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import worker from '../src/index.js';
import { TOOLS, TOOL_DEFS, indexData, useData, loadData } from '../src/agent.js';
import { loadData as loadSite } from '../../site/src/lib.mjs';
import { searchIndex } from '../../site/src/search-index.mjs';
import { openApi } from '../../site/src/openapi.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const real = await loadData({}); // the real map, bundled

// ── A tiny made-up map ──
const proj = (id, name, extra = {}) => ({ id, name, page: `https://x.test/p/${id}/`, summary: `${name} does things. `.repeat(3), kind: 'app', setup: 'easy', setupWhy: 'ok', platforms: ['linux', 'windows'], license: 'MIT', licenseClass: 'open', licenseNeedsCheck: false, stars: 100, forks: 1, status: 'active', verified: false, latestRelease: null, code: `https://github.com/o/${id}`, website: null, download: null, release: null, family: null, familyChildren: [], howToHelp: null, ...extra });
const catalog = {
  schemaVersion: 1, generated: '2026-01-01', license: 'CC BY-SA 4.0', page: 'https://x.test/',
  categories: [{ id: 'creative', name: 'Creative' }, { id: 'office', name: 'Office' }],
  projects: [
    proj('gimpish', 'Gimpish', { verified: true }),
    proj('serverpic', 'ServerPic', { setup: 'advanced', kind: 'self_hosted', platforms: ['server'], howToHelp: { contributingGuide: 'https://github.com/o/serverpic/CONTRIBUTING.md', goodFirstIssues: { count: 3, url: 'https://g/1' }, helpWanted: null, plugins: null } }),
    proj('forkpic', 'ForkPic', { platforms: ['mac'], family: { relation: 'fork-keeps-up', of: 'gimpish', ofName: 'Gimpish', text: 'Copy of Gimpish that keeps up with it', why: 'A fork.', sourceUrl: 'https://s' } }),
    proj('writerx', 'WriterX'),
  ],
  groups: [
    { id: 'photo-editing', name: 'Photo editing', page: 'https://x.test/g/photo-editing/', category: 'creative', categoryName: 'Creative', job: 'Editing photos', closedApps: ['Adobe Photoshop'], coverage: null,
      alternatives: [{ project: 'gimpish', rank: 1, fit: 'full', note: null, why: 'Does the whole job · Verified · Easy setup', score: 80 }, { project: 'forkpic', rank: 2, fit: 'full', note: null, why: 'Does the whole job', score: 60 }, { project: 'serverpic', rank: 3, fit: 'partial', note: 'Server only', why: 'Does part of the job', score: 30 }] },
    { id: 'documents', name: 'Documents', page: 'https://x.test/g/documents/', category: 'office', categoryName: 'Office', job: 'Writing documents', closedApps: ['Microsoft Word'], coverage: 'one-full',
      alternatives: [{ project: 'writerx', rank: 1, fit: 'full', note: null, why: 'Does the whole job', score: 70 }] },
    { id: 'mind-maps', name: 'Mind maps', page: 'https://x.test/g/mind-maps/', category: 'office', categoryName: 'Office', job: 'Drawing mind maps', closedApps: ['MindManager'], coverage: 'none', alternatives: [] },
  ],
  apps: [
    { slug: 'adobe-photoshop', name: 'Adobe Photoshop', page: 'https://x.test/alternatives-to/adobe-photoshop/', otherSpellings: ['PhotoShop'], groups: ['photo-editing'], alternatives: [{ project: 'gimpish', fit: 'full', rank: 1, group: 'photo-editing' }, { project: 'forkpic', fit: 'full', rank: 2, group: 'photo-editing' }, { project: 'serverpic', fit: 'partial', rank: 3, group: 'photo-editing' }] },
    { slug: 'microsoft-word', name: 'Microsoft Word', page: 'https://x.test/alternatives-to/microsoft-word/', otherSpellings: [], groups: ['documents'], alternatives: [{ project: 'writerx', fit: 'full', rank: 1, group: 'documents' }] },
    { slug: 'mindmanager', name: 'MindManager', page: 'https://x.test/alternatives-to/mindmanager/', otherSpellings: [], groups: ['mind-maps'], alternatives: [] },
  ],
};
const searchJson = {
  closed: [{ n: 'Adobe Photoshop', g: 'Photo editing', j: 'Editing photos', u: 'alternatives-to/adobe-photoshop/' }, { n: 'Microsoft Word', g: 'Documents', j: 'Writing documents', u: 'alternatives-to/microsoft-word/' }, { n: 'MindManager', g: 'Mind maps', j: 'Drawing mind maps', u: 'alternatives-to/mindmanager/' }],
  groups: [{ n: 'Photo editing', c: 'Creative', j: 'Editing photos', x: ['Adobe Photoshop'], u: 'g/photo-editing/', k: [] }, { n: 'Documents', c: 'Office', j: 'Writing documents', x: ['Microsoft Word'], u: 'g/documents/', k: [] }, { n: 'Mind maps', c: 'Office', j: 'Drawing mind maps', x: ['MindManager'], u: 'g/mind-maps/', k: [] }],
  projects: [
    { n: 'Gimpish', g: 'Photo editing', u: 'p/gimpish/', gi: [0], r: 0, pl: ['linux', 'windows'], ez: 1, k: [], s: 'Gimpish edits photos.', st: 100 },
    { n: 'ServerPic', g: 'Photo editing', u: 'p/serverpic/', gi: [0], r: 2, pl: ['server'], k: [], s: 'ServerPic stores photos on a server.', st: 50 },
    { n: 'ForkPic', g: 'Photo editing', u: 'p/forkpic/', gi: [0], r: 1, pl: ['mac'], ez: 1, k: [], s: 'ForkPic edits photos too.', st: 20 },
    { n: 'WriterX', g: 'Documents', u: 'p/writerx/', gi: [1], r: 0, pl: ['linux'], ez: 1, k: [], s: 'WriterX writes documents.', st: 10 },
  ],
};
const FX = indexData(catalog, searchJson);
useData(FX);
const D = () => FX;

// ── The tools ──
test('search finds a closed app, its group and projects, with page links and the usage rules', () => {
  const r = TOOLS.search(D(), { query: 'photoshop' });
  assert.equal(r.results[0].type, 'closed_app'); assert.equal(r.results[0].page, 'https://x.test/alternatives-to/adobe-photoshop/');
  assert.equal(r.results[0].bestAlternatives[0].id, 'gimpish');
  assert.ok(r.results.every((x) => x.page)); assert.equal(r.source.license, 'CC BY-SA 4.0'); assert.match(r.source.cite, /AI assistance/);
});
test('search: setup=easy hides advanced projects; device lifts matching projects and marks the rest', () => {
  const all = TOOLS.search(D(), { query: 'edit photos' }).results.filter((x) => x.type === 'project');
  assert.ok(all.some((x) => x.id === 'serverpic'));
  assert.ok(!TOOLS.search(D(), { query: 'edit photos', setup: 'easy' }).results.some((x) => x.id === 'serverpic'));
  const mac = TOOLS.search(D(), { query: 'edit photos', device: 'mac' }).results.filter((x) => x.type === 'project');
  assert.ok(mac.every((x) => typeof x.runsOnYourDevice === 'boolean'));
});
test('search: too short is refused with advice; nonsense gives a hint, not an error', () => {
  assert.throws(() => TOOLS.search(D(), { query: 'a' }), /query/);
  assert.match(TOOLS.search(D(), { query: 'qqqqzzzz' }).hint, /list_gaps/);
});
test('alternatives_to: ranked, with fit/setup/why, understands other spellings and short names', () => {
  const r = TOOLS.alternatives_to(D(), { app: 'photoshop' });
  assert.equal(r.app, 'Adobe Photoshop'); assert.equal(r.matchedAs, 'Adobe Photoshop'); assert.equal(r.fullReplacements, 2);
  assert.deepEqual(r.alternatives.map((a) => a.id), ['gimpish', 'forkpic', 'serverpic']);
  assert.equal(r.alternatives[0].why, 'Does the whole job · Verified · Easy setup'); assert.equal(r.alternatives[2].note, 'Server only');
  assert.equal(TOOLS.alternatives_to(D(), { app: 'Adobe Photoshop' }).matchedAs, undefined);
});
test('alternatives_to: filters, gap advice, and a helpful error for unknown apps', () => {
  assert.deepEqual(TOOLS.alternatives_to(D(), { app: 'Adobe Photoshop', setup: 'easy' }).alternatives.map((a) => a.id), ['gimpish', 'forkpic']);
  assert.deepEqual(TOOLS.alternatives_to(D(), { app: 'Adobe Photoshop', device: 'mac' }).alternatives.map((a) => a.id), ['forkpic', 'gimpish', 'serverpic']);
  assert.match(TOOLS.alternatives_to(D(), { app: 'MindManager' }).advice, /gap/);
  assert.throws(() => TOOLS.alternatives_to(D(), { app: 'Zzyzx Studio' }), /No app matches/);
});
test('get_group, get_project (id or name), compare and how_to_contribute', () => {
  const g = TOOLS.get_group(D(), { id: 'photo-editing' });
  assert.equal(g.alternatives.length, 3); assert.equal(g.replaces[0], 'Adobe Photoshop');
  assert.equal(TOOLS.get_group(D(), { id: 'mind-maps' }).coverageMeaning, 'No open project does this job yet.');
  const p = TOOLS.get_project(D(), { id: 'ServerPic' });
  assert.equal(p.id, 'serverpic'); assert.equal(p.listedIn[0].fit, 'partial'); assert.equal(p.setup, 'advanced');
  const c = TOOLS.compare(D(), { project_ids: ['gimpish', 'forkpic'] });
  assert.equal(c.projects.length, 2); assert.match(c.relationsBetweenThem[0], /ForkPic: Copy of Gimpish/); assert.equal(c.sharedGroups[0].id, 'photo-editing');
  assert.throws(() => TOOLS.compare(D(), { project_ids: ['gimpish'] }), /between 2 and 6/);
  const h = TOOLS.how_to_contribute(D(), { project_id: 'serverpic' });
  assert.equal(h.goodFirstIssues.count, 3); assert.match(h.fixThisListing.url, /template=2-fix\.yml&project=ServerPic/); assert.equal(h.helpSection, 'https://x.test/p/serverpic/#help');
  assert.equal(TOOLS.how_to_contribute(D(), { project_id: 'gimpish' }).contributingGuide, null);
  assert.throws(() => TOOLS.get_project(D(), { id: 'nope-nope' }), /No project matches/);
});
test('list_gaps: nothing-open first, filters work', () => {
  const r = TOOLS.list_gaps(D(), {});
  assert.deepEqual(r.gaps.map((g) => g.id), ['mind-maps', 'documents']);
  assert.deepEqual(TOOLS.list_gaps(D(), { coverage: 'one-full' }).gaps.map((g) => g.id), ['documents']);
  assert.deepEqual(TOOLS.list_gaps(D(), { category: 'Office', coverage: 'none' }).gaps.map((g) => g.id), ['mind-maps']);
  assert.throws(() => TOOLS.list_gaps(D(), { category: 'nonsense' }), /Unknown category/);
});
test('every tool description carries the rules agents must follow', () => {
  assert.equal(TOOL_DEFS.length, 7);
  for (const t of TOOL_DEFS.filter((t) => t.name !== 'list_gaps' || true)) {
    assert.match(t.description, /CC BY-SA 4\.0/, t.name); assert.match(t.description, /cite/i, t.name); assert.match(t.description, /AI assistance/, t.name);
    assert.match(t.description, /"easy"/, t.name); assert.match(t.description, /moderators/, t.name);
    assert.equal(t.annotations.readOnlyHint, true); assert.equal(t.inputSchema.type, 'object');
  }
});

// ── The connector (MCP over HTTP) ──
const envT = { SITE_ORIGIN: 'https://site.test', DEV_LOGIN: '0' };
const post = (body, headers = {}, e = envT) => worker.fetch(new Request('https://api.test/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }), e);
const rpc = (method, params, id = 1) => ({ jsonrpc: '2.0', id, method, params });

test('mcp: initialize negotiates the version and lists the tools capability', async () => {
  const r = await post(rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' } }));
  assert.equal(r.status, 200); assert.equal(r.headers.get('Content-Type'), 'application/json'); assert.equal(r.headers.get('Access-Control-Allow-Origin'), '*');
  const j = await r.json();
  assert.equal(j.result.protocolVersion, '2025-03-26'); assert.ok(j.result.capabilities.tools); assert.match(j.result.instructions, /alternatives_to/);
  assert.equal((await (await post(rpc('initialize', { protocolVersion: '1999-01-01' }))).json()).result.protocolVersion, '2025-06-18');
});
test('mcp: tools/list, tools/call (success, tool error, unknown tool), ping', async () => {
  const list = await (await post(rpc('tools/list'))).json();
  assert.deepEqual(list.result.tools.map((t) => t.name), ['search', 'alternatives_to', 'get_group', 'get_project', 'list_gaps', 'compare', 'how_to_contribute']);
  const call = await (await post(rpc('tools/call', { name: 'alternatives_to', arguments: { app: 'Adobe Photoshop' } }))).json();
  assert.equal(call.result.isError, undefined); assert.equal(JSON.parse(call.result.content[0].text).alternatives[0].id, 'gimpish');
  const bad = await (await post(rpc('tools/call', { name: 'alternatives_to', arguments: { app: 'Zzyzx' } }))).json();
  assert.equal(bad.result.isError, true); assert.match(bad.result.content[0].text, /No app matches/);
  assert.equal((await (await post(rpc('tools/call', { name: 'delete_everything', arguments: {} }))).json()).error.code, -32602);
  assert.deepEqual((await (await post(rpc('ping'))).json()).result, {});
  assert.equal((await (await post(rpc('resources/list'))).json()).error.code, -32601);
});
test('mcp: notifications get 202 and no body; GET/DELETE are 405; bad JSON is 400; CORS preflight works', async () => {
  const n = await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
  assert.equal(n.status, 202); assert.equal(await n.text(), '');
  for (const method of ['GET', 'DELETE']) { const r = await worker.fetch(new Request('https://api.test/mcp', { method }), envT); assert.equal(r.status, 405); assert.match(r.headers.get('Allow'), /POST/); }
  assert.equal((await post('{nope')).status, 400);
  const pre = await worker.fetch(new Request('https://api.test/mcp', { method: 'OPTIONS', headers: { Origin: 'https://evil.test' } }), envT);
  assert.equal(pre.status, 204); assert.equal(pre.headers.get('Access-Control-Allow-Origin'), '*'); assert.match(pre.headers.get('Access-Control-Allow-Headers'), /MCP-Protocol-Version/);
});
test('mcp: a batch is answered as a batch; the connector is rate limited per address', async () => {
  const b = await (await post([rpc('ping', undefined, 1), rpc('tools/list', undefined, 2), { jsonrpc: '2.0', method: 'notifications/initialized' }])).json();
  assert.equal(b.length, 2);
  let last; for (let i = 0; i < 125; i++) last = await post(rpc('ping', undefined, i + 1), { 'CF-Connecting-IP': '9.9.9.9' });
  assert.equal(last.status, 429);
  assert.equal((await post(rpc('ping'), { 'CF-Connecting-IP': '8.8.8.8' })).status, 200, 'a different address is not affected');
});

// ── The plain JSON API ──
const get = (path, headers = {}) => worker.fetch(new Request(`https://api.test${path}`, { headers }), envT);
test('v1: every call answers like its tool, with open CORS and caching', async () => {
  const s = await get('/v1/search?q=photoshop'); assert.equal(s.status, 200);
  assert.equal(s.headers.get('Access-Control-Allow-Origin'), '*'); assert.match(s.headers.get('Cache-Control'), /max-age=300/);
  assert.equal((await s.json()).results[0].type, 'closed_app');
  assert.equal((await (await get('/v1/apps/adobe-photoshop?setup=easy')).json()).alternatives.length, 2);
  assert.equal((await (await get('/v1/apps/Adobe%20Photoshop')).json()).app, 'Adobe Photoshop');
  assert.equal((await (await get('/v1/groups/photo-editing')).json()).id, 'photo-editing');
  assert.equal((await (await get('/v1/projects/gimpish')).json()).id, 'gimpish');
  assert.equal((await (await get('/v1/projects/serverpic/contribute')).json()).goodFirstIssues.count, 3);
  assert.equal((await (await get('/v1/gaps?coverage=none')).json()).gaps[0].id, 'mind-maps');
  assert.equal((await (await get('/v1/compare?ids=gimpish,forkpic')).json()).projects.length, 2);
});
test('v1: errors are plain JSON with the right status; only GET is allowed; preflight works', async () => {
  assert.equal((await get('/v1/projects/nope-nope')).status, 404);
  assert.equal((await get('/v1/search?q=a')).status, 400);
  assert.equal((await get('/v1/unknown')).status, 404);
  assert.equal((await worker.fetch(new Request('https://api.test/v1/gaps', { method: 'POST', body: '{}' }), envT)).status, 405);
  const pre = await worker.fetch(new Request('https://api.test/v1/gaps', { method: 'OPTIONS' }), envT);
  assert.equal(pre.status, 204); assert.equal(pre.headers.get('Access-Control-Allow-Origin'), '*');
});
test('openapi.json describes exactly the calls v1 answers', async () => {
  const spec = openApi(); assert.match(spec.openapi, /^3\.1/);
  const sample = { '/v1/search': '/v1/search?q=photoshop', '/v1/apps/{slug}': '/v1/apps/adobe-photoshop', '/v1/groups/{id}': '/v1/groups/photo-editing', '/v1/projects/{id}': '/v1/projects/gimpish', '/v1/projects/{id}/contribute': '/v1/projects/gimpish/contribute', '/v1/gaps': '/v1/gaps', '/v1/compare': '/v1/compare?ids=gimpish,forkpic' };
  assert.deepEqual(Object.keys(spec.paths).sort(), Object.keys(sample).sort());
  for (const p of Object.values(sample)) assert.equal((await get(p)).status, 200, p);
  const redirect = await worker.fetch(new Request('https://api.test/openapi.json'), envT);
  assert.equal(redirect.status, 302); assert.equal(redirect.headers.get('Location'), 'https://site.test/openapi.json');
});

// ── The real map ──
test('real map: MCP search gives the same results, in the same order, as the website search, for every test search', () => {
  useData(real);
  const ctx = { globalThis: {} }; // the browser file, loaded fresh the way site/test/search-eval.mjs does
  vm.runInNewContext(readFileSync(`${ROOT}site/assets/search-core.js`, 'utf8'), ctx);
  const site = ctx.globalThis.OISearch; const items = site.prepare(searchIndex(loadSite(ROOT)));
  const idOf = (u) => u.replace(/^alternatives-to\/(.*)\/$/, 'c:$1').replace(/^g\/(.*)\/$/, 'g:$1').replace(/^p\/(.*)\/$/, 'p:$1');
  const mine = (x) => (x.type === 'closed_app' ? `c:${x.page.split('/alternatives-to/')[1].replace(/\/$/, '')}` : x.type === 'group' ? `g:${x.id}` : `p:${x.id}`);
  let n = 0;
  for (const f of ['search-queries', 'search-queries-heldout', 'search-queries-described', 'search-queries-final', 'search-queries-blind']) {
    for (const { q } of JSON.parse(readFileSync(`${ROOT}site/test/${f}.json`, 'utf8')).queries) {
      const want = Array.from(site.search(items, q).flatMap((s) => s.items.map((x) => idOf(x.u)))); // Array.from: the browser file runs in its own realm
      const got = TOOLS.search(real, { query: q, limit: 30 }).results.map(mine);
      assert.deepEqual(got, want, `${f}: "${q}"`); n++;
    }
  }
  assert.ok(n > 400, `compared ${n} searches`);
});
test('real map: the famous questions get sensible answers and nothing internal leaks', () => {
  useData(real);
  const ps = TOOLS.alternatives_to(real, { app: 'Photoshop' });
  assert.ok(ps.alternatives.length >= 3); assert.equal(ps.alternatives[0].fit, 'full'); assert.ok(ps.alternatives[0].why);
  assert.ok(TOOLS.alternatives_to(real, { app: 'Google Docs', setup: 'easy' }).alternatives.every((a) => a.setup === 'easy'));
  assert.ok(TOOLS.list_gaps(real, {}).total > 0);
  const lw = TOOLS.get_project(real, { id: 'librewolf' }); assert.equal(lw.family.relation, 'fork-keeps-up');
  const all = JSON.stringify([ps, lw, TOOLS.list_gaps(real, { limit: 150 }), TOOLS.get_group(real, { id: real.catalog.groups[0].id })]);
  assert.doesNotMatch(all, /"unconfirmed"|"review"|"sourceLists"|claude-(opus|sonnet|haiku)|"starter"/);
});

test('real map: a project file keeps the project\'s own license apart from the data license', () => {
  const p = TOOLS.get_project(real, { id: 'librewolf' });
  assert.equal(p.license, 'MPL-2.0'); assert.equal(real.catalog.dataLicense, 'CC BY-SA 4.0');
});

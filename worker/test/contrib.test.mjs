// Plays out the new rules in docs/server-rules.md (requests, "Tag my project", "Your suggestions", mod Suggestions)
// against the local server (`npm run dev`, port 8787), the site preview on :4322 (data/names.json), and a stand-in for
// GitHub and project websites that THIS file starts on :8799 (wrangler.toml [env.dev.vars] points the server at it).
// Nothing here touches the real GitHub, and nothing is posted anywhere. Run: node --test test/
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

const API = process.env.API ?? 'http://127.0.0.1:8787';
const SITE = 'http://localhost:4322';
const stamp = Date.now().toString(36);
const REPO = 'itsdestin/opensourceeverything';

// ── The stand-in for GitHub ──
let issues = []; // what the stand-in says the repo's suggestion issues are
const comments = {}; // issue number → comments
const proofs = {}; // "github.com/owner/name" → file text
const owners = {}; // "owner/name" → real owner login
const stub = createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); const path = u.pathname;
  const send = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(typeof data === 'string' ? data : JSON.stringify(data)); };
  let m;
  if ((m = path.match(/^\/raw\/([^/]+)\/([^/]+)\/([^/]+)\//))) { const t = proofs[`${m[1]}/${m[2]}/${m[3]}`.toLowerCase()]; return t ? send(200, t) : send(404, 'no'); }
  if ((m = path.match(/^\/gh\/repos\/([^/]+)\/([^/]+)$/))) { const o = owners[`${m[1]}/${m[2]}`.toLowerCase()]; return o ? send(200, { owner: { login: o } }) : send(404, {}); }
  if ((m = path.match(/^\/gh\/repos\/[^/]+\/[^/]+\/issues\/(\d+)\/comments$/))) return send(200, comments[m[1]] ?? []);
  if (path.endsWith('/issues')) {
    const creator = u.searchParams.get('creator'); const state = u.searchParams.get('state');
    return send(200, issues.filter((i) => (!creator || i.user.login === creator) && (state === 'all' || i.state === state)));
  }
  send(404, {});
});
before(() => new Promise((r) => stub.listen(8799, '127.0.0.1', r)));
after(() => stub.close());
const issue = (number, title, labels, extra = {}) => ({ number, title, state: 'open', html_url: `https://github.com/${REPO}/issues/${number}`, created_at: new Date().toISOString(), user: { login: 'someone', type: 'User' }, labels: labels.map((name) => ({ name })), ...extra });

// ── A test person (same helper as api.test.mjs) ──
async function person(name, days = 400, exact = false) {
  const login = exact || name === 'mod-sample' ? name : `${name}-${stamp}`;
  const r = await fetch(`${API}/auth/dev-login?login=${login}&days=${days}&return=${SITE}/`, { redirect: 'manual' });
  const cookie = r.headers.get('set-cookie').split(';')[0];
  const call = async (method, path, body) => {
    const res = await fetch(API + path, { method, headers: { Cookie: cookie, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(method === 'GET' ? {} : { Origin: SITE, 'X-OSE': '1' }) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, data: await res.json().catch(() => null) };
  };
  return { name: login, call };
}
const names = await (await fetch(`${SITE}/data/names.json`)).json();
const gapGroup = Object.entries(names.groups).find(([, g]) => g.gap)[0];
const fullGroup = Object.entries(names.groups).find(([, g]) => !g.gap)[0];
const GROUPS = Object.keys(names.groups).slice(0, 2);

test('I want this too: only gaps, 14-day rule, one per person, toggles off, counted', async () => {
  const fresh = await person('reqfresh', 3); const a = await person('reqa'); const b = await person('reqb');
  const key = `group:${gapGroup}`;
  assert.equal((await fresh.call('POST', '/requests/vote', { key, on: true })).status, 403, 'a new account cannot');
  assert.equal((await a.call('POST', '/requests/vote', { key: `group:${fullGroup}`, on: true })).status, 400, 'a group that is already covered is not requestable');
  assert.equal((await a.call('POST', '/requests/vote', { key: 'group:not-a-group', on: true })).status, 400);
  assert.equal((await a.call('POST', '/requests/vote', { key: 'whatever', on: true })).status, 400);
  const before = (await a.call('GET', `/requests?keys=${key}`)).data.items[0].votes;
  await a.call('POST', '/requests/vote', { key, on: true }); await a.call('POST', '/requests/vote', { key, on: true });
  await b.call('POST', '/requests/vote', { key, on: true });
  const after = (await a.call('GET', `/requests?keys=${key}`)).data.items[0];
  assert.equal(after.votes, before + 2, 'two people, each counted once'); assert.equal(after.mine, true);
  await a.call('POST', '/requests/vote', { key, on: false });
  assert.equal((await a.call('GET', `/requests?keys=${key}`)).data.items[0].votes, before + 1);
  await b.call('POST', '/requests/vote', { key, on: false });
});

test('Most requested includes suggestions still waiting on GitHub, and only open ones can be voted for', async () => {
  const a = await person('reqc');
  issues = [issue(9001, 'Closed app: Zorblax Draw', ['suggestion', 'add-closed-app']), issue(9002, 'Add: Something', ['suggestion', 'add-project']), issue(9003, 'Closed app: Gone', ['suggestion', 'add-closed-app'], { state: 'closed' })];
  const list = (await a.call('GET', '/requests?limit=30')).data;
  const w = list.items.find((x) => x.key === 'issue:9001');
  assert.ok(w && w.waiting && w.votes === 0 && w.name === 'Zorblax Draw', 'a waiting closed-app suggestion shows even with no votes');
  assert.ok(!list.items.some((x) => x.key === 'issue:9002' || x.key === 'issue:9003'), 'add-project and closed issues are not requests');
  assert.equal((await a.call('POST', '/requests/vote', { key: 'issue:9001', on: true })).status, 200);
  assert.equal((await a.call('POST', '/requests/vote', { key: 'issue:9003', on: true })).status, 400);
  const top = (await a.call('GET', '/requests?limit=30')).data.items;
  assert.equal(top.find((x) => x.key === 'issue:9001').votes, 1); assert.equal(top[0].key, 'issue:9001', 'ranked by votes');
  await a.call('POST', '/requests/vote', { key: 'issue:9001', on: false });
});

// A listed project on GitHub, to pitch for.
const proj = Object.entries(names.codes).find(([c]) => c.startsWith('github.com/'));
const [repoKey, projectId] = proj; const [, owner, rname] = repoKey.split('/');
owners[`${owner}/${rname}`] = owner;
const pitchBody = (extra = {}) => ({ groups: GROUPS.slice(0, 1), differs: 'It keeps everything on your own computer.', strengths: 'Fast', weaknesses: 'Young', reusable: 'The sync library', help: 'Translations', built: 'hand-built', ...extra });

test('Tag my project: a repo under your own account is proven by GitHub alone', async () => {
  const me = await person(owner, 400, true);
  const s = (await me.call('POST', '/pitches/start', { url: `https://github.com/${owner}/${rname}` })).data;
  assert.equal(s.listed, true); assert.equal(s.pitch.verified, true); assert.equal(s.pitch.proof, 'own-account'); assert.equal(s.pitch.project, projectId);
  const id = s.pitch.id;
  assert.equal((await me.call('PUT', `/pitches/${id}`, pitchBody({ differs: '  ' }))).status, 400, '"What does yours do differently?" is required');
  assert.equal((await me.call('PUT', `/pitches/${id}`, pitchBody({ groups: [] }))).status, 400, 'at least one group');
  const sent = (await me.call('PUT', `/pitches/${id}`, pitchBody())).data;
  assert.equal(sent.status, 'pending');
  assert.deepEqual((await fetch(`${API}/pitches/live?projects=${projectId}`).then((r) => r.json())), {}, 'nothing public before a mod approves');
  await me.call('DELETE', `/pitches/${id}`);
});

test('Tag my project: pending → mod approves → public; edits go back to pending while the approved text stays; turn down keeps it', async () => {
  const me = await person(owner, 400, true); const mod = await person('mod-sample'); const other = await person('pitchother');
  const id = (await me.call('POST', '/pitches/start', { url: `github.com/${owner}/${rname}.git` })).data.pitch.id;
  await me.call('PUT', `/pitches/${id}`, pitchBody());
  assert.equal((await other.call('GET', '/mod/pitches')).status, 403, 'mods only');
  assert.equal((await other.call('PUT', `/pitches/${id}`, pitchBody())).status, 404, "somebody else's project");
  assert.ok((await mod.call('GET', '/mod/pitches')).data.items.some((x) => x.id === id));
  await mod.call('POST', `/mod/pitches/${id}`, { action: 'approve' });
  let live = (await fetch(`${API}/pitches/live?projects=${projectId}`).then((r) => r.json()))[projectId];
  assert.equal(live.differs, 'It keeps everything on your own computer.'); assert.equal(live.by, owner);
  await me.call('PUT', `/pitches/${id}`, pitchBody({ differs: 'EDITED words' }));
  assert.equal((await me.call('GET', '/pitches/mine')).data.items.find((x) => x.id === id).status, 'pending', 'an edit goes back to pending');
  live = (await fetch(`${API}/pitches/live?projects=${projectId}`).then((r) => r.json()))[projectId];
  assert.match(live.differs, /own computer/, 'the approved text keeps showing until the edit is approved');
  await mod.call('POST', `/mod/pitches/${id}`, { action: 'reject', reason: 'Please remove the claim about speed.' });
  const mine = (await me.call('GET', '/pitches/mine')).data.items.find((x) => x.id === id);
  assert.equal(mine.status, 'live'); assert.equal(mine.pending, null); assert.match(mine.reason, /speed/);
  await me.call('DELETE', `/pitches/${id}`);
  assert.deepEqual(await fetch(`${API}/pitches/live?projects=${projectId}`).then((r) => r.json()), {}, 'deleting removes it from the site');
});

test('Tag my project: an organization or another website needs the one-line file', async () => {
  const me = await person('orgdev'); // not the owner, so a file is required
  const s = (await me.call('POST', '/pitches/start', { url: `https://github.com/${owner}/${rname}` })).data;
  assert.equal(s.pitch.proof, 'file'); assert.equal(s.pitch.verified, false); assert.equal(s.pitch.proofFile, '.opensourceeverything'); assert.match(s.pitch.proofText, /^ose-/);
  const id = s.pitch.id;
  assert.equal((await me.call('PUT', `/pitches/${id}`, pitchBody())).status, 403, 'cannot send a pitch before proving');
  assert.equal((await me.call('POST', `/pitches/${id}/verify`)).status, 400, 'no file yet');
  proofs[repoKey] = 'ose-wrong-token';
  assert.equal((await me.call('POST', `/pitches/${id}/verify`)).status, 400, 'wrong text');
  proofs[repoKey] = `${s.pitch.proofText}\n`;
  assert.equal((await me.call('POST', `/pitches/${id}/verify`)).data.verified, true);
  assert.equal((await me.call('PUT', `/pitches/${id}`, pitchBody())).status, 200);
  delete proofs[repoKey];
  await me.call('DELETE', `/pitches/${id}`);
});

test('Tag my project: a project that is not listed yet gets no proof step, and a non-project link is refused', async () => {
  const me = await person('notlisted');
  const s = (await me.call('POST', '/pitches/start', { url: 'https://github.com/nobody-here/never-listed' })).data;
  assert.equal(s.listed, false);
  assert.equal((await me.call('POST', '/pitches/start', { url: 'https://example.com/a/b' })).status, 400);
});

test('Your suggestions: waiting / needs a mod / approved / live (with link) / turned down (with reason)', async () => {
  const me = await person('sugg'); const mine = (n, t, labels, extra = {}) => issue(n, t, labels, { user: { login: me.name, type: 'User' }, ...extra });
  issues = [
    mine(1, 'Closed app: One', ['suggestion', 'add-closed-app']),
    mine(2, 'Closed app: Two', ['suggestion', 'add-closed-app', 'needs-mod']),
    mine(3, 'Closed app: Three', ['suggestion', 'add-closed-app', 'approved']),
    mine(4, 'Closed app: Four', ['suggestion', 'add-closed-app', 'approved'], { state: 'closed', state_reason: 'completed' }),
    mine(5, 'Closed app: Five', ['suggestion', 'add-closed-app'], { state: 'closed', state_reason: 'not_planned' }),
    issue(6, 'Closed app: Not mine', ['suggestion']),
  ];
  comments[4] = [{ body: `Thank you! <!-- live: ${SITE}/alternatives-to/four/ -->`, user: { type: 'Bot' } }];
  comments[5] = [{ body: '<!-- suggestion-robot --> checked', user: { type: 'Bot' } }, { body: 'This is already covered by another group.', user: { type: 'User' } }];
  const got = Object.fromEntries((await me.call('GET', '/me/suggestions')).data.items.map((x) => [x.number, x]));
  assert.deepEqual([1, 2, 3, 4, 5].map((n) => got[n].status), ['waiting', 'needs-mod', 'approved', 'live', 'turned-down']);
  assert.equal(got[6], undefined, "only the person's own");
  assert.equal(got[4].liveUrl, `${SITE}/alternatives-to/four/`);
  assert.equal(got[5].reason, 'This is already covered by another group.');
  assert.equal((await anon('/me/suggestions')).status, 401);
});

test('Mod Suggestions tab: open suggestions with the robot verdict and request counts; mods only', async () => {
  const mod = await person('mod-sample'); const other = await person('notamod');
  issues = [issue(41, 'Closed app: A', ['suggestion', 'add-closed-app', 'robot-ok']), issue(42, 'Closed app: B', ['suggestion', 'add-closed-app', 'needs-mod']), issue(43, 'Add: C', ['suggestion', 'add-project'])];
  assert.equal((await other.call('GET', '/mod/suggestions')).status, 403);
  const items = (await mod.call('GET', '/mod/suggestions')).data.items;
  assert.deepEqual(items.map((x) => [x.number, x.verdict]), [[41, 'ok'], [42, 'needs-mod'], [43, 'unchecked']]);
});
const anon = async (path) => { const r = await fetch(API + path); return { status: r.status }; };

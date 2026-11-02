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
const meta = {}; // "owner/name" → extra facts GitHub would give (type, fork, stars, id, full_name, moved...)
const members = new Set(); // "org/login" → public members of an organization
const stub = createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); const path = u.pathname;
  const send = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(typeof data === 'string' ? data : JSON.stringify(data)); };
  let m;
  if ((m = path.match(/^\/raw\/([^/]+)\/([^/]+)\/([^/]+)\//))) { const t = proofs[`${m[1]}/${m[2]}/${m[3]}`.toLowerCase()]; return t ? send(200, t) : send(404, 'no'); }
  if ((m = path.match(/^\/gh\/repos\/([^/]+)\/([^/]+)$/))) {
    const key = `${m[1]}/${m[2]}`.toLowerCase(); const o = owners[key]; const x = meta[key] ?? {};
    return o ? send(200, { id: 5000 + key.length, full_name: `${m[1]}/${m[2]}`, owner: { login: o, type: x.type ?? 'User' }, stargazers_count: Math.min(names.stars?.[names.codes[`github.com/${key}`]] ?? 5, 9000), fork: false, ...x.repo }) : send(404, {});
  }
  if ((m = path.match(/^\/gh\/orgs\/([^/]+)\/public_members\/([^/]+)$/))) { res.writeHead(members.has(`${m[1]}/${m[2]}`.toLowerCase()) ? 204 : 404); return res.end(); }
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
// WHY not a high-profile one: those need a mod's extra confirmation, which has its own test below.
const proj = Object.entries(names.codes).find(([c, id]) => c.startsWith('github.com/') && !names.hp.includes(id));
const [repoKey, projectId] = proj; const [, owner, rname] = repoKey.split('/');
owners[`${owner}/${rname}`] = owner;
const missing = (extra = {}) => ({ kind: 'missing', group: 'documents', projects: ['libreoffice-writer'], closedApps: ['Google Docs'], title: `Test note ${stamp}`, body: 'See https://example.org', ...extra });
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
  assert.equal((await mod.call('POST', `/mod/pitches/${id}`, { action: 'approve' })).status, 200);
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

// ═══════════ Security hardening (docs/server-rules.md → "Claiming a project" and "What people write") ═══════════
// Every project below is a made-up repo under a unique name, so no run can disturb another; the stand-in answers for them.
let n = 0;
const listed = (extra = {}) => {
  // A listed, non-high-profile GitHub project to claim: reuse the real ids from names.json, one per test.
  const cands = Object.entries(names.codes).filter(([c, id]) => c.startsWith('github.com/') && !names.hp.includes(id));
  const [key, id] = cands[1 + (n++ % (cands.length - 1))]; const [, o, nm] = key.split('/');
  // WHY a fresh owner name per call: the test database keeps accounts between runs, and an account's age is fixed when it is first made.
  const me = extra.owner ?? `own${n}-${stamp}`; owners[`${o}/${nm}`] = me; if (extra.meta) meta[`${o}/${nm}`] = extra.meta;
  return { key, id, o, nm, me, url: `https://github.com/${o}/${nm}` };
};
const claim = async (who, url) => (await who.call('POST', '/pitches/start', { url }));
const sendPitch = (who, id, extra) => who.call('PUT', `/pitches/${id}`, pitchBody(extra));

test('claim: a brand-new account cannot claim a project', async () => {
  const p = listed(); const fresh = await person('freshclaimer', 3);
  assert.equal((await claim(fresh, p.url)).status, 403);
});

test('claim: a repo that moved or was renamed on GitHub cannot be claimed', async () => {
  const p = listed({ meta: { repo: { full_name: 'someone-else/renamed' } } }); const me = await person(p.me, 400, true);
  assert.equal((await claim(me, p.url)).status, 409);
});

test('claim: a fork needs a mod to confirm before anything shows, even under your own account', async () => {
  const p = listed({ meta: { repo: { fork: true } } }); const me = await person(p.me, 400, true); const mod = await person('mod-sample');
  const s = (await claim(me, p.url)).data.pitch;
  assert.equal(s.verified, true); assert.equal(s.needsConfirm, true); assert.ok(s.flags.includes('fork'));
  await sendPitch(me, s.id, {});
  assert.equal((await mod.call('POST', `/mod/pitches/${s.id}`, { action: 'approve' })).status, 409, 'cannot approve before the extra confirmation');
  await mod.call('POST', `/mod/pitches/${s.id}`, { action: 'confirm-claim' });
  assert.equal((await mod.call('POST', `/mod/pitches/${s.id}`, { action: 'approve' })).status, 200);
  const live = (await fetch(`${API}/pitches/live?projects=${p.id}`).then((r) => r.json()))[p.id];
  assert.equal(live.ownerCheck, 'mods', 'the page can say "confirmed by mods"');
  await me.call('DELETE', `/pitches/${s.id}`);
});

test('claim: a high-profile project (Verified, hand-kept list, 10k+ stars) is hidden until a mod confirms, even when approved', async () => {
  const hpKey = Object.entries(names.codes).find(([c, id]) => c.startsWith('github.com/') && names.hp.includes(id));
  const [key, id] = hpKey; const [, o, nm] = key.split('/'); owners[`${o}/${nm}`] = o;
  const me = await person(o, 400, true); const mod = await person('mod-sample');
  const s = (await claim(me, `https://github.com/${o}/${nm}`)).data.pitch;
  assert.equal(s.needsConfirm, true); assert.ok(s.flags.includes('high-profile'));
  await sendPitch(me, s.id, {});
  assert.equal((await mod.call('POST', `/mod/pitches/${s.id}`, { action: 'approve' })).status, 409);
  await mod.call('POST', `/mod/pitches/${s.id}`, { action: 'confirm-claim' }); await mod.call('POST', `/mod/pitches/${s.id}`, { action: 'approve' });
  assert.equal((await fetch(`${API}/pitches/live?projects=${id}`).then((r) => r.json()))[id].ownerCheck, 'mods');
  await mod.call('POST', `/mod/pitches/${s.id}`, { action: 'revoke', reason: 'test' });
  assert.deepEqual(await fetch(`${API}/pitches/live?projects=${id}`).then((r) => r.json()), {}, 'revoke takes it off the site');
  assert.equal((await me.call('POST', `/pitches/${s.id}/verify`)).status, 403, 'a revoked claim cannot be re-proved by itself');
  await me.call('DELETE', `/pitches/${s.id}`);
});

test('claim: an organization project needs public membership, the file, and a mod', async () => {
  const p = listed({ owner: `org-${stamp}`, meta: { type: 'Organization' } }); const me = await person('orgmember');
  assert.equal((await claim(me, p.url)).status, 403, 'not a public member');
  members.add(`org-${stamp}/${me.name}`.toLowerCase());
  const s = (await claim(me, p.url)).data.pitch;
  assert.equal(s.proof, 'file'); assert.equal(s.needsConfirm, true); assert.ok(s.flags.includes('owner-unverified'));
  await me.call('DELETE', `/pitches/${s.id}`);
});

test('claim: the proof text works once, only for the person it was made for', async () => {
  const p = listed({ owner: `other-${stamp}` }); const a = await person('proofa'); const b = await person('proofb');
  const sa = (await claim(a, p.url)).data.pitch; const sb = (await claim(b, p.url)).data.pitch;
  assert.notEqual(sa.proofText, sb.proofText, 'each person gets their own text');
  proofs[p.key] = sa.proofText;
  assert.equal((await b.call('POST', `/pitches/${sb.id}/verify`)).status, 400, "somebody else's text does not prove it for you");
  assert.equal((await a.call('POST', `/pitches/${sa.id}/verify`)).data.verified, true);
  const after = (await a.call('GET', '/pitches/mine')).data.items.find((x) => x.id === sa.id);
  assert.equal(after.proofText, undefined, 'the used text is gone from the page');
  // Two claimants on one project: the second cannot go live while the first is showing.
  proofs[p.key] = sb.proofText;
  assert.equal((await b.call('POST', `/pitches/${sb.id}/verify`)).data.verified, true);
  const mod = await person('mod-sample');
  for (const [who, s] of [[a, sa], [b, sb]]) { await sendPitch(who, s.id, {}); await mod.call('POST', `/mod/pitches/${s.id}`, { action: 'confirm-claim' }); }
  assert.equal((await mod.call('POST', `/mod/pitches/${sa.id}`, { action: 'approve' })).status, 200);
  assert.equal((await mod.call('POST', `/mod/pitches/${sb.id}`, { action: 'approve' })).status, 409, 'one live claim per project');
  assert.equal((await fetch(`${API}/pitches/live?projects=${p.id}`).then((r) => r.json()))[p.id].by, a.name);
  delete proofs[p.key]; await a.call('DELETE', `/pitches/${sa.id}`); await b.call('DELETE', `/pitches/${sb.id}`);
});

test('claim: an edit re-checks ownership; a project that changed hands loses the claim', async () => {
  const p = listed(); const me = await person(p.me, 400, true);
  const s = (await claim(me, p.url)).data.pitch;
  owners[`${p.o}/${p.nm}`.toLowerCase()] = 'someone-new';
  assert.equal((await sendPitch(me, s.id, {})).status, 403);
  assert.equal((await me.call('GET', '/pitches/mine')).data.items.find((x) => x.id === s.id).verified, false);
  await me.call('DELETE', `/pitches/${s.id}`);
});

test('claim: links and words in a pitch: shortener refused, bad language reaches the mod with a reason', async () => {
  const p = listed(); const me = await person(p.me, 400, true); const mod = await person('mod-sample');
  const s = (await claim(me, p.url)).data.pitch;
  assert.equal((await sendPitch(me, s.id, { help: 'See https://bit.ly/abc' })).status, 400);
  assert.equal((await sendPitch(me, s.id, { differs: 'This is sh1t' })).status, 200, 'held for a mod, not refused');
  const item = (await mod.call('GET', '/mod/pitches')).data.items.find((x) => x.id === s.id);
  assert.match(item.flag, /bad language/);
  await me.call('DELETE', `/pitches/${s.id}`);
});

test('what people write: bad words hold a note or reply for a mod; edits cannot sneak them in; bad links are refused', async () => {
  const a = await person('filtera'); const b = await person('filterb'); const mod = await person('mod-sample');
  const held = (await a.call('POST', '/notes', { kind: 'talk', group: 'documents', closedApps: [], title: 'Hello', body: 'what the f.u.c.k' })).data;
  assert.equal(held.held, true); assert.match(held.flag, /bad language/);
  assert.equal((await b.call('GET', `/notes/${held.id}`)).status, 404, 'others cannot see it');
  assert.equal((await mod.call('GET', `/notes/${held.id}`)).status, 200);
  await mod.call('POST', '/mod/act', { id: held.id, action: 'approve' });
  assert.equal((await b.call('GET', `/notes/${held.id}`)).status, 200, 'visible once a mod approves');
  const edited = (await a.call('PATCH', `/notes/${held.id}`, { title: 'Hello again', body: 'sh!t' })).data;
  assert.equal(edited.held, true, 'a bad edit puts it back on hold');
  assert.equal((await b.call('GET', `/notes/${held.id}`)).status, 404);
  const clean = (await a.call('POST', '/notes', { kind: 'talk', group: 'documents', closedApps: [], title: 'Fine', body: 'all good' })).data;
  assert.equal(clean.held, false);
  const rep = (await b.call('POST', `/notes/${clean.id}/replies`, { body: 'you are a bitch' })).data; assert.equal(rep.held, true);
  assert.equal((await a.call('POST', '/notes', { kind: 'talk', group: 'documents', closedApps: [], title: 'x', body: 'go to bit.ly/abc' })).status, 400, 'a shortened link is refused with a reason');
  assert.equal((await a.call('POST', '/notes', { kind: 'talk', group: 'documents', closedApps: [], title: 'x', body: 'https://user:pw@example.org/' })).status, 400);
  assert.equal((await a.call('POST', '/notes', { kind: 'talk', group: 'documents', closedApps: [], title: 'x', body: 'https://examp1e.org <img src=x onerror=alert(1)>' })).data.held, false, 'markup is stored as plain text; the page escapes it');
  const w = (await a.call('POST', '/notes', missing({ kind: 'wish', projects: [] }))).data;
  assert.equal((await b.call('POST', `/notes/${w.id}/building`, { link: 'https://bit.ly/x' })).status, 400);
  assert.equal((await b.call('POST', `/notes/${w.id}/building`, { link: 'https://g1thub.com/x' })).status, 400, 'look-alike site');
  assert.equal((await b.call('POST', `/notes/${w.id}/building`, { link: 'javascript:alert(1)' })).status, 400);
  assert.equal((await b.call('POST', `/notes/${w.id}/building`, { link: 'https://github.com/x/y' })).status, 200);
});

test('Contributor preferences: public only while the claim stands; only the approved owner can change them', async () => {
  const me = await person(owner, 400, true); const mod = await person('mod-sample'); const other = await person('prefsother');
  assert.equal((await me.call('PUT', `/prefs/${projectId}`, { start: 'issue' })).status, 403, 'not allowed before a claim is approved');
  const id = (await me.call('POST', '/pitches/start', { url: `https://github.com/${owner}/${rname}` })).data.pitch.id;
  await me.call('PUT', `/pitches/${id}`, pitchBody());
  await mod.call('POST', `/mod/pitches/${id}`, { action: 'approve' });
  assert.equal((await other.call('PUT', `/prefs/${projectId}`, { start: 'issue' })).status, 403, 'somebody else cannot');
  const saved = (await me.call('PUT', `/prefs/${projectId}`, { ai: 'traditional-developers-only', start: 'issue', wanted: ['translation', 'testing'], review: 'weeks', note: 'Hold interface changes until v3.' })).data;
  assert.equal(saved.start, 'issue');
  assert.equal((await fetch(`${API}/prefs?projects=${projectId}`).then((r) => r.json()))[projectId].review, 'weeks', 'visitors see it');
  await me.call('DELETE', `/pitches/${id}`);
  assert.deepEqual(await fetch(`${API}/prefs?projects=${projectId}`).then((r) => r.json()), {}, 'when the claim ends, the answers stop showing');
});

// Plays out docs/server-rules.md against a running local server (`npm run dev`, which allows test sign-ins) and the
// site preview on :4322 (for data/names.json). Run: node --test test/   — each check names the rule it proves.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const API = process.env.API ?? 'http://127.0.0.1:8787';
const SITE = 'http://localhost:4322';
const stamp = Date.now().toString(36);

// A test person: signs in through the test-only door and keeps their cookie.
async function person(name, days = 400) {
  // WHY the mod keeps its exact name: only names on the server's mod list are mods.
  const login = name === 'mod-sample' ? name : `${name}-${stamp}`;
  const r = await fetch(`${API}/auth/dev-login?login=${login}&days=${days}&return=${SITE}/`, { redirect: 'manual' });
  const cookie = r.headers.get('set-cookie').split(';')[0];
  const call = async (method, path, body, headers = { Origin: SITE, 'X-OSE': '1' }) => {
    const res = await fetch(API + path, { method, headers: { Cookie: cookie, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(method === 'GET' ? {} : headers) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, data: await res.json().catch(() => null), headers: res.headers };
  };
  return { name: login, call, location: r.headers.get('location') };
}
const anon = async (method, path) => { const r = await fetch(API + path, { method }); return { status: r.status, data: await r.json().catch(() => null) }; };
const missing = (extra = {}) => ({ kind: 'missing', group: 'documents', projects: ['libreoffice-writer'], closedApps: ['Google Docs'], title: `Test note ${stamp}`, body: 'See https://example.org', ...extra });

test('signed-out visitors can read but not act', async () => {
  assert.equal((await anon('GET', '/me')).data.user, null);
  assert.equal((await anon('GET', '/notes?group=documents')).status, 200);
});

test('after sign-in, people are only ever sent back to the site', async () => {
  const r = await fetch(`${API}/auth/dev-login?login=ret-${stamp}&return=https://evil.example/steal`, { redirect: 'manual' });
  assert.equal(r.headers.get('location'), `${SITE}/`);
  const c = r.headers.get('set-cookie'); assert.match(c, /HttpOnly/); assert.match(c, /SameSite=Lax/);
});

test('changes must come from the site itself', async () => {
  const m = await person('origin');
  assert.equal((await m.call('POST', '/notes', missing(), { Origin: 'https://evil.example', 'X-OSE': '1' })).status, 403);
  assert.equal((await m.call('POST', '/notes', missing(), { Origin: SITE })).status, 403);
});

test('a member posts, votes count, edit shows "edited", others cannot change it', async () => {
  const a = await person('alice'); const b = await person('bob');
  const n = (await a.call('POST', '/notes', missing())).data;
  assert.equal(n.held, false); assert.equal(n.votes, 1, "the author's own vote");
  assert.equal(n.projects[0], 'libreoffice-writer');
  assert.equal((await a.call('POST', '/notes', missing({ projects: [] }))).status, 400, 'missing features need a project');
  assert.equal((await a.call('POST', '/notes', missing({ group: 'not-a-job' }))).status, 400);
  const v = (await b.call('POST', `/notes/${n.id}/vote`, { on: true })).data; assert.equal(v.votes, 2); assert.equal(v.mine, true);
  assert.equal((await b.call('PATCH', `/notes/${n.id}`, { title: 'hijack' })).status, 403);
  assert.equal((await b.call('DELETE', `/notes/${n.id}`)).status, 403);
  const e = (await a.call('PATCH', `/notes/${n.id}`, { title: 'Edited title', body: '' })).data; assert.ok(e.edited); assert.equal(e.title, 'Edited title');
  const counts = (await anon('GET', '/counts?group=documents')).data; assert.ok(counts['libreoffice-writer'] >= 1);
  assert.equal((await a.call('DELETE', `/notes/${n.id}`)).status, 200);
  assert.equal((await b.call('GET', `/notes/${n.id}`)).status, 404);
});

test('new accounts: first post of any kind waits for a mod; no voting until 14 days', async () => {
  const fresh = await person('fresh', 3); const member = await person('carol'); const mod = await person('mod-sample');
  const me = (await fresh.call('GET', '/me')).data.user; assert.equal(me.canVote, false); assert.equal(me.firstPostHeld, true);
  const n = (await fresh.call('POST', '/notes', missing())).data; assert.equal(n.held, true); assert.equal(n.votes, 0);
  assert.equal((await member.call('GET', `/notes/${n.id}`)).status, 404, 'others cannot see a held post');
  assert.equal((await fresh.call('GET', `/notes/${n.id}`)).status, 200, 'the author can');
  const open = (await member.call('POST', '/notes', missing())).data;
  assert.equal((await fresh.call('POST', `/notes/${open.id}/vote`, { on: true })).status, 403);
  assert.equal((await fresh.call('POST', '/ratings', { group: 'documents', project: 'libreoffice-writer', value: 1 })).status, 403);
  assert.equal((await fresh.call('POST', `/notes/${open.id}/replies`, { body: 'hi' })).data.held, true, 'a first reply is held too');
  const q = (await mod.call('GET', '/mod/queue')).data;
  assert.ok(q.held.some((x) => x.id === n.id)); assert.ok(q.heldReplies.some((r) => r.note.id === open.id));
  assert.equal((await member.call('GET', '/mod/queue')).status, 403, 'mods only');
  await mod.call('POST', '/mod/act', { id: n.id, action: 'approve' });
  assert.equal((await member.call('GET', `/notes/${n.id}`)).status, 200, 'approved posts are public');
  assert.equal((await fresh.call('POST', '/notes', missing())).data.held, false, 'approval trusts the account');
});

test('"it\'s fixed": a link, not confirmable by the claimer, closes at 3 confirmations, claimer can take it back', async () => {
  const a = await person('dana'); const c = await person('claim'); const others = await Promise.all(['e1', 'e2', 'e3'].map((x) => person(x)));
  const n = (await a.call('POST', '/notes', missing())).data;
  assert.equal((await c.call('POST', `/notes/${n.id}/fixed`, { link: 'javascript:alert(1)' })).status, 400, 'only web links');
  assert.equal((await c.call('POST', `/notes/${n.id}/fixed`, { link: 'https://example.org/release' })).data.fixed.by, c.name);
  assert.equal((await others[0].call('POST', `/notes/${n.id}/fixed`, { link: 'https://example.org/other' })).status, 400, 'one claim at a time');
  assert.equal((await c.call('POST', `/notes/${n.id}/fixed/confirm`)).status, 400, 'not by the claimer');
  assert.equal((await c.call('DELETE', `/notes/${n.id}/fixed`)).data.fixed, null, 'take it back');
  await c.call('POST', `/notes/${n.id}/fixed`, { link: 'https://example.org/release' });
  for (const o of others) await o.call('POST', `/notes/${n.id}/fixed/confirm`);
  assert.equal((await a.call('GET', `/notes/${n.id}`)).data.status, 'fixed');
});

test('ratings: one per person per job, only real answers, only listed projects', async () => {
  const a = await person('rater');
  assert.equal((await a.call('POST', '/ratings', { group: 'documents', project: 'libreoffice-writer', value: 5 })).status, 400);
  assert.equal((await a.call('POST', '/ratings', { group: 'documents', project: 'gimp', value: 1 })).status, 400);
  await a.call('POST', '/ratings', { group: 'documents', project: 'libreoffice-writer', value: 1 });
  await a.call('POST', '/ratings', { group: 'documents', project: 'libreoffice-writer', value: -1 });
  const r = (await a.call('POST', '/ratings/query', { pairs: [{ group: 'documents', project: 'libreoffice-writer' }] })).data['documents/libreoffice-writer'];
  assert.equal(r.mine, -1);
});

test('reports once each; bans stop posting and remove held posts', async () => {
  const a = await person('frank'); const r = await person('reporter'); const mod = await person('mod-sample'); const spam = await person('spam', 2);
  const n = (await a.call('POST', '/notes', missing())).data;
  assert.equal((await r.call('POST', `/notes/${n.id}/report`, { reason: 'spam' })).status, 200);
  assert.equal((await r.call('POST', `/notes/${n.id}/report`, { reason: 'again' })).status, 400);
  const held = (await spam.call('POST', '/notes', missing())).data;
  assert.equal((await mod.call('POST', '/mod/act', { id: held.id, action: 'ban' })).status, 200);
  assert.equal((await spam.call('POST', '/notes', missing())).status, 401, 'a ban ends their sign-in too');
  assert.equal((await mod.call('GET', `/notes/${held.id}`)).status, 404, 'their held posts are gone');
});

test('deleting an account removes what it posted', async () => {
  const a = await person('leaver');
  const n = (await a.call('POST', '/notes', missing())).data;
  assert.equal((await a.call('DELETE', '/me')).status, 200);
  assert.equal((await anon('GET', `/notes/${n.id}`)).status, 404);
  assert.equal((await a.call('GET', '/me')).data.user, null);
});

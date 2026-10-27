// The content filter and the claim rules, with no server needed: node --test test/filter.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { screenText, screenLink, screenAll } from '../../site/assets/filter.js';
import { claimPlan, isHighProfile, tokenUsable, parseRepo, cleanLink, cleanPitch, CLAIM } from '../src/rules.js';

const flags = (t) => screenText(t).flags;
test('bad language is held, including common disguises, but ordinary words are left alone', () => {
  for (const bad of ['what the fuck', 'f.u.c.k this', 'f u c k', 'sh1t', 'FUUUUCK', 'this is bullsh!t', 'you are a b1tch', 'youmotherfucker', 'n1gger']) assert.deepEqual(flags(bad), ['language'], bad);
  for (const ok of ['Scunthorpe class assess', 'the 2019 release, 100% done', 'shiitake', 'Dickens and Hancock', 'a passing grade', 'password', 'I like kite surfing']) assert.deepEqual(flags(ok), [], ok);
});
test('spam phrases and link floods are held', () => {
  assert.deepEqual(flags('Join my telegram group'), ['spam']);
  assert.ok(flags(Array.from({ length: 7 }, (_, i) => `https://example.org/${i}`).join(' ')).includes('many-links'));
});
test('links: shorteners, hidden passwords, numbers, odd ports, look-alike letters and other schemes are refused', () => {
  for (const bad of ['https://bit.ly/x', 'http://t.co/x', 'https://tinyurl.com/a', 'https://user:pw@example.org', 'http://192.168.0.1/x', 'https://example.org:8443/', 'https://xn--gthub-9wa.com', 'javascript:alert(1)', 'data:text/html,hi', 'ftp://example.org/x', 'https://localhost/x'])
    assert.ok(screenLink(bad).error, bad);
  assert.ok(screenText('go to bit.ly/abc now').error, 'bare shorteners too');
  for (const ok of ['https://github.com/a/b', 'https://libreoffice.org/', 'https://example.org/a?b=c#d', 'http://www.gimp.org']) assert.equal(screenLink(ok).error, undefined, ok);
});
test('links: look-alikes of well-known sites are caught, the real ones are not', () => {
  for (const bad of ['https://g1thub.com/x', 'https://githb.com/x', 'https://github.com.evil.example/x', 'https://gitlab-login.example', 'https://libre-office.org']) assert.ok(screenLink(bad).error, bad);
  for (const ok of ['https://github.io/x', 'https://docs.github.com/a', 'https://mozilla.org', 'https://gitlab.com/a']) assert.equal(screenLink(ok).error, undefined, ok);
  assert.deepEqual(screenText('see https://g1thub.com/x').flags, ['lookalike-link'], 'inside prose it is held, not refused');
});
test('screenAll pools flags and stops at the first hard error', () => {
  assert.deepEqual(screenAll('fine', 'what the shit').flags, ['language']);
  assert.ok(screenAll('shit', 'https://bit.ly/x').error);
});
test('submitted links need http(s) and pass the same checks', () => {
  assert.equal(cleanLink('https://example.org/release').link, 'https://example.org/release');
  assert.ok(cleanLink('javascript:alert(1)').error); assert.ok(cleanLink('https://bit.ly/a').error); assert.ok(cleanLink('example.org').error);
});
test('a pitch with a shortened link is refused; bad language comes back as a flag', () => {
  assert.ok(cleanPitch({ groups: ['x'], differs: 'see https://bit.ly/a' }, ['x']).error);
  assert.deepEqual(cleanPitch({ groups: ['x'], differs: 'it is shit' }, ['x']).flags, ['language']);
});
test('project links cannot walk the proof address somewhere else', () => {
  assert.equal(parseRepo('https://github.com/../x'), null); assert.equal(parseRepo('https://github.com/a/..'), null); assert.equal(parseRepo('github.com/./b'), null);
  assert.equal(parseRepo('https://github.com/.github/x').repo, 'github.com/.github/x');
});

const me = { login: 'Alice' }; const N = { hp: ['famous'], stars: { small: 400, famous: 20000 } };
const repo = (o, name = 'tool', extra = {}) => ({ id: 7, full_name: `${o}/${name}`, owner: { login: o, type: 'User' }, stargazers_count: 10, fork: false, ...extra });
test('claim plan: own plain repo is proven by GitHub alone, nothing for a mod to confirm', () => {
  const p = claimPlan(me, parseRepo('github.com/alice/tool'), repo('alice'), { project: 'small', N: { ...N, stars: {} } });
  assert.equal(p.proof, 'own-account'); assert.equal(p.needsConfirm, false); assert.deepEqual(p.flags, []);
});
test('claim plan: forks, high-profile (list or 10k stars), far-fewer-stars and anything not own-account need a mod', () => {
  const r = parseRepo('github.com/alice/tool');
  assert.deepEqual(claimPlan(me, r, repo('alice', 'tool', { fork: true }), { project: 'x', N }).flags, ['fork']);
  assert.ok(claimPlan(me, r, repo('alice'), { project: 'famous', N }).flags.includes('high-profile'));
  assert.ok(claimPlan(me, r, repo('alice', 'tool', { stargazers_count: 10000 }), { project: 'x', N }).flags.includes('high-profile'));
  const small = claimPlan(me, r, repo('alice'), { project: 'small', N });
  assert.ok(small.flags.includes('looks-different') && small.needsConfirm, 'a re-created repo with 10 stars where 400 were listed');
  const org = claimPlan(me, parseRepo('github.com/acme/tool'), repo('acme', 'tool', { owner: { login: 'acme', type: 'Organization' } }), { project: 'x', N });
  assert.equal(org.proof, 'file'); assert.equal(org.org, true); assert.equal(org.needsConfirm, true);
  const gl = claimPlan(me, parseRepo('gitlab.com/alice/tool'), null, { project: 'x', N });
  assert.equal(gl.proof, 'file', 'the same name on another site proves nothing'); assert.equal(gl.needsConfirm, true);
});
test('claim plan: a repo that moved cannot be claimed; a missing hp list means everything is high-profile', () => {
  const r = parseRepo('github.com/alice/tool');
  assert.equal(claimPlan(me, r, repo('bob', 'renamed'), { project: 'x', N }).status, 409);
  assert.equal(claimPlan(me, r, null, { project: 'x', N }).status, 404);
  assert.equal(isHighProfile({}, 'anything', 0), true); assert.equal(isHighProfile(N, 'x', 9999), false);
});
test('proof text: usable once, only before it expires, never after use', () => {
  const now = 1e12; const row = { verified_at: null, token: 'ose-a', token_expires: now + 1000 };
  assert.equal(tokenUsable(row, now), true);
  assert.equal(tokenUsable({ ...row, token_expires: now - 1 }, now), false, 'expired');
  assert.equal(tokenUsable({ ...row, verified_at: now }, now), false, 'already used');
  assert.equal(tokenUsable({ ...row, token: 'used-ose-a' }, now), false, 'burned');
  assert.equal(CLAIM.tokenHours, 48);
});

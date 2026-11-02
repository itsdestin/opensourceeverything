// The pure rules (no server needed): node --test test/rules.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRepo, proofFor, proofHas, suggestionStatus, cleanPitch, cleanPrefs, requestKind } from '../src/rules.js';

test('project links are read from any usual form, only on the three code hosts', () => {
  assert.equal(parseRepo('https://www.GitHub.com/Foo/Bar.git/tree/main?x=1').repo, 'github.com/foo/bar');
  assert.equal(parseRepo('codeberg.org/a/b').repo, 'codeberg.org/a/b');
  assert.equal(parseRepo('https://gitlab.com/a'), null); assert.equal(parseRepo('https://example.com/a/b'), null); assert.equal(parseRepo('not a link'), null);
});
test('ownership: your own GitHub account is proof; an organization or another site needs the file', () => {
  const me = { login: 'Alice' };
  assert.equal(proofFor(me, parseRepo('github.com/alice/tool')), 'own-account');
  assert.equal(proofFor(me, parseRepo('github.com/some-org/tool')), 'file');
  assert.equal(proofFor(me, parseRepo('codeberg.org/alice/tool')), 'file', 'same name on another site proves nothing');
  assert.equal(proofHas('hello\nose-abc\n', 'ose-abc'), true); assert.equal(proofHas('ose-abcd', 'ose-abc'), false);
});
test('a suggestion\'s state comes from its labels and how it was closed', () => {
  const i = (state, labels, state_reason) => ({ state, labels: labels.map((name) => ({ name })), state_reason });
  assert.equal(suggestionStatus(i('open', [])), 'waiting');
  assert.equal(suggestionStatus(i('open', ['needs-mod'])), 'needs-mod');
  assert.equal(suggestionStatus(i('open', ['approved'])), 'approved');
  assert.equal(suggestionStatus(i('closed', ['approved'], 'completed')), 'live');
  assert.equal(suggestionStatus(i('closed', [], 'not_planned')), 'turned-down');
});
test('a pitch needs a group, "what is different" and a how-built label; text is cut to size', () => {
  assert.ok(cleanPitch({ groups: ['x'], differs: '', built: 'hand-built' }, ['x']).error);
  assert.ok(cleanPitch({ groups: ['nope'], differs: 'a', built: 'hand-built' }, ['x']).error);
  assert.equal(cleanPitch({ groups: ['x'], differs: 'a', built: 'agentic', strengths: 'y'.repeat(5000) }, ['x']).pitch.strengths.length, 1000);
});
test('request keys', () => { assert.equal(requestKind('group:signing'), 'group'); assert.equal(requestKind('issue:12'), 'issue'); assert.equal(requestKind('nope'), null); });

test('contributor preferences: only listed answers are kept, at most three wanted, text is cut to 200 characters, links must be real', () => {
  const c = cleanPrefs({ ai: 'wizard', aiTicks: ['beginner', 'nope'], start: 'issue', startLink: 'javascript:alert(1)', wanted: ['code', 'design', 'docs', 'testing'], newcomers: 'help', sign: 'cla', signLink: 'https://example.org/cla', note: 'x'.repeat(500) }).prefs;
  assert.equal(c.ai, '', 'an answer that is not on its list is dropped');
  assert.deepEqual(c.aiTicks, ['beginner']);
  assert.equal(c.startLink, '', 'not a web link or an email address');
  assert.equal(c.wanted.length, 3, 'up to three');
  assert.equal(c.signLink, 'https://example.org/cla');
  assert.equal(c.note.length, 200);
  assert.equal(cleanPrefs({ startLink: 'team@example.org' }).prefs.startLink, 'team@example.org');
  assert.deepEqual(cleanPrefs({}).prefs.wanted, [], 'everything is optional');
});

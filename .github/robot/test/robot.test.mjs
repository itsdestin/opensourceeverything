// Plays the suggestion robot against made-up issue files (never touches GitHub). Run: node --test .github/robot/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROBOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'suggestion.mjs');
const body = (app, group) => `### Closed app\n\n${app}\n\n### Group\n\n${group}\n\n### Anything else\n\n_No response_`;
const issue = (number, app, group, login = 'someone') => ({ number, title: `Closed app: ${app}`, user: { login }, labels: [{ name: 'suggestion' }, { name: 'add-closed-app' }], body: body(app, group) });
const OLD = '2015-01-01T00:00:00Z';
// Runs `check` and returns { comment, labels }.
function check(iss, fixture) {
  const dir = mkdtempSync(join(tmpdir(), 'robot-'));
  writeFileSync(join(dir, 'ev.json'), JSON.stringify({ issue: iss })); writeFileSync(join(dir, 'fx.json'), JSON.stringify(fixture));
  execFileSync('node', [ROBOT, 'check', join(dir, 'ev.json')], { cwd: dir, env: { ...process.env, ROBOT_FIXTURE: join(dir, 'fx.json') }, stdio: 'pipe' });
  return { comment: readFileSync(join(dir, 'robot-comment.md'), 'utf8'), labels: JSON.parse(readFileSync(join(dir, 'robot-labels.json'), 'utf8')) };
}

test('a clean suggestion from an old account gets robot-ok', () => {
  const r = check(issue(20, 'Zorblax Draw', 'Digital painting'), { user: { created_at: OLD }, open: [] });
  assert.deepEqual(r.labels.add, ['robot-ok']); assert.match(r.comment, /Everything the robot can check looks fine/);
});
test('no group chosen is flagged for a mod, not an error', () => {
  const r = check(issue(21, 'Zorblax Draw', 'None of these fit (a mod will choose)'), { user: { created_at: OLD }, open: [] });
  assert.deepEqual(r.labels.add, ['needs-mod']); assert.match(r.comment, /No group was chosen/);
});
test('accounts under 14 days old are held for a mod', () => {
  const young = new Date(Date.now() - 3 * 86400e3).toISOString();
  const r = check(issue(22, 'Zorblax Draw', 'Digital painting', 'brandnew'), { user: { created_at: young }, open: [] });
  assert.deepEqual(r.labels.add, ['needs-mod']); assert.match(r.comment, /only 3 days old/);
});
test('a second suggestion for the same thing is flagged against the earlier open one, not the other way round', () => {
  const first = issue(30, 'Zorblax Draw', 'Digital painting'); const second = issue(31, 'zorblax  draw', 'Digital painting');
  const later = check(second, { user: { created_at: OLD }, open: [first, second] });
  assert.match(later.comment, /same thing: #30/); assert.deepEqual(later.labels.add, ['needs-mod']);
  const earlier = check(first, { user: { created_at: OLD }, open: [first, second] });
  assert.doesNotMatch(earlier.comment, /same thing/); assert.deepEqual(earlier.labels.add, ['robot-ok']);
});

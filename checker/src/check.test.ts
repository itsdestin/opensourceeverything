import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkProject } from './check.js';
import { creditedAssistants, lastPageNumber } from './site-facts.js';

// A pretend GitHub: URL → [status, body, headers]. Nothing here touches the internet.
type Answer = [number, unknown, Record<string, string>?];
function fakeGitHub(answers: Record<string, Answer>): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    const hit = answers[url];
    if (!hit) return new Response('not found', { status: 404 });
    const [status, body, headers] = hit;
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: headers ?? {} });
  }) as typeof fetch;
}

const R = 'https://api.github.com/repos/acme/writer';
const day = (d: string) => ({ commit: { author: { date: `${d}T12:00:00Z` }, message: 'work' } });
const NOW = new Date('2026-10-27T00:00:00Z');

function healthyRepo(): Record<string, Answer> {
  const commits = [day('2026-10-20'), day('2026-09-01'), day('2026-06-15'),
    { commit: { author: { date: '2026-05-01T00:00:00Z' }, message: 'Add parser\n\nCo-Authored-By: Claude <noreply@anthropic.com>' } }];
  return {
    [R]: [200, { created_at: '2025-10-01T00:00:00Z', license: { spdx_id: 'MIT' }, stargazers_count: 1234, archived: false, pushed_at: '2026-10-20T12:00:00Z' }],
    [`${R}/commits?per_page=100`]: [200, commits],
    [`${R}/commits?per_page=1`]: [200, [commits[0]], { link: `<${R}/commits?per_page=1&page=140>; rel="last"` }],
    [`${R}/commits?per_page=1&page=140`]: [200, [day('2025-10-02')]],
    [`${R}/readme`]: [200, {}],
    [`${R}/contributors?per_page=1&anon=1`]: [200, [{}], { link: `<${R}/contributors?per_page=1&anon=1&page=17>; rel="last"` }],
  };
}

test('a healthy GitHub project passes and reports the site facts', async () => {
  globalThis.fetch = fakeGitHub(healthyRepo());
  const r = await checkProject({ host: 'github', owner: 'acme', name: 'writer' }, { now: NOW });
  assert.ok(r.supported);
  assert.equal(r.license, 'open');
  assert.deepEqual(r.violations, []);
  assert.equal(r.site.stars, 1234);
  assert.equal(r.site.contributors, 17);
  assert.equal(r.site.commitsCreditingAi, 1);
  assert.deepEqual(r.site.aiAssistants, ['Claude']);
  assert.equal(r.site.lastPushAt?.toISOString(), '2026-10-20T12:00:00.000Z');
});

test('a two-day-old project with no license gets the same verdict as the mod bot', async () => {
  const a = healthyRepo();
  a[R] = [200, { created_at: '2026-10-25T00:00:00Z', license: null, stargazers_count: 0 }];
  a[`${R}/commits?per_page=100`] = [200, [day('2026-10-25')]];
  a[`${R}/commits?per_page=1`] = [200, [day('2026-10-25')]];
  globalThis.fetch = fakeGitHub(a);
  const r = await checkProject({ host: 'github', owner: 'acme', name: 'writer' }, { now: NOW });
  assert.ok(r.supported);
  assert.equal(r.license, 'missing');
  assert.deepEqual(r.violations.map((v) => v.rule).sort(), ['3', '5', '5']);
});

test('a missing project says so without asking for the extra facts', async () => {
  globalThis.fetch = fakeGitHub({});
  const r = await checkProject({ host: 'github', owner: 'acme', name: 'gone' }, { now: NOW });
  assert.ok(r.supported);
  assert.equal(r.facts.exists, false);
  assert.equal(r.site.stars, 0);
});

test('GitLab and Codeberg go to a person, like in the bot', async () => {
  const r = await checkProject({ host: 'codeberg', owner: 'paletta', name: 'paletta' });
  assert.equal(r.supported, false);
});

test('only real credit lines count as AI credit', () => {
  assert.deepEqual(creditedAssistants('Fix bug\n\nCo-authored-by: Copilot <x@github.com>'), ['Copilot']);
  assert.deepEqual(creditedAssistants('🤖 Generated with [Claude Code](https://claude.com/claude-code)'), ['Claude']);
  assert.deepEqual(creditedAssistants('aider: add tests'), ['Aider']);
  assert.deepEqual(creditedAssistants('Turn off copilot suggestions in the editor settings'), []);
  assert.deepEqual(creditedAssistants('Co-authored-by: Jane Doe <jane@example.com>'), []);
});

test('reads the page count GitHub uses to say how many contributors there are', () => {
  assert.equal(lastPageNumber('<https://x/c?per_page=1&page=2>; rel="next", <https://x/c?per_page=1&page=58>; rel="last"'), 58);
  assert.equal(lastPageNumber(null), undefined);
});

// WHY: the copied files must match the mod bot's, or the site and the subreddit would judge projects
// differently. Skipped on a computer without the bot checked out next to this repo.
test('the copied checker files still match the mod bot', { skip: !existsSync(fileURLToPath(new URL('../../../trueopensource-bot', import.meta.url))) }, () => {
  for (const f of ['rules.ts', 'github.ts']) {
    const here = readFileSync(fileURLToPath(new URL(`../src/from-bot/${f}`, import.meta.url)), 'utf8');
    const bot = readFileSync(fileURLToPath(new URL(`../../../trueopensource-bot/src/features/checker/${f}`, import.meta.url)), 'utf8');
    assert.equal(here, bot, `${f} differs from the bot's copy: run npm run sync-from-bot`);
  }
});

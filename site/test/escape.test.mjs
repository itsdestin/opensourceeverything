// Guards the rule "everything people write is shown as plain text": in the pages' scripts, any text a person wrote that is placed
// into HTML must go through esc(). This reads the source and fails on a template that drops a user field in unescaped.
// Run: node --test site/test/escape.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// Fields that hold text from a person (notes, replies, pitches, suggestions, reports, mod reasons).
const USER_FIELD = /\b(?:n|r|p|x|it|m|q|pit|st\.pitch|st|n\.fixed|n\.building|a)\.(?:title|body|differs|strengths|weaknesses|reusable|help|author|login|owner|by|reason|link|url|flag|repo|projectName|name|text|liveUrl|confirmedBy)\b/;

// Pulls out each ${...} with its nested braces and quotes.
function expressions(src) {
  const out = []; let i = 0;
  while ((i = src.indexOf('${', i)) !== -1) {
    let depth = 1, j = i + 2;
    for (; j < src.length && depth; j++) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; }
    out.push({ at: i, text: src.slice(i + 2, j - 1) }); i = i + 2;
  }
  return out;
}
// Safe if the field only appears inside esc(...), esc-ed helper calls, or is used as a plain value (numbers, ids, attribute-less conditions).
const stripEscaped = (t) => { let prev; do { prev = t; t = t.replace(/\besc\((?:[^()]|\([^()]*\))*\)/g, ''); } while (t !== prev); return t; };

for (const file of ['contrib.js', 'social.js']) {
  test(`${file}: user text is escaped before it goes into HTML`, () => {
    const src = readFileSync(join(HERE, '..', 'assets', file), 'utf8'); const bad = [];
    for (const e of expressions(src)) {
      // document.title and textContent are text sinks, not HTML.
      if (/document\.title\s*=\s*`[^`]*$/.test(src.slice(Math.max(0, e.at - 80), e.at))) continue;
      const rest = stripEscaped(e.text);
      // A bare field is only dangerous when it is printed, not when it is only tested (`x.url ? ... : ...`) or compared.
      const m = rest.match(new RegExp(`(?:^|[^.\\w])(${USER_FIELD.source})`));
      if (!m) continue;
      // Allowed: the field is only used as a condition / in a call that escapes it itself (e.g. pitchBody(p) is escaped inside).
      const printed = new RegExp(`^\\s*${USER_FIELD.source}\\s*$`).test(rest) || new RegExp(`\\+\\s*${USER_FIELD.source}|${USER_FIELD.source}\\s*\\+`).test(rest) || new RegExp(`\\$\\{${USER_FIELD.source}`).test(`\${${rest}`) && !/[?&|]|\bencodeURIComponent\b/.test(rest);
      if (printed) bad.push(`${file}:${src.slice(0, e.at).split('\n').length}: \${${e.text.slice(0, 80)}}`);
    }
    assert.deepEqual(bad, []);
  });
}
test('the shared esc() escapes quotes, angle brackets and ampersands', () => {
  const src = readFileSync(join(HERE, '..', 'assets', 'site.js'), 'utf8');
  const fn = src.match(/const esc = [^\n]+/)[0]; const esc = new Function(`${fn}; return esc;`)();
  assert.equal(esc(`<img src=x onerror="a('b')">&`), '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;');
});
test('no script in the pages uses eval, document.write or javascript: addresses', () => {
  for (const f of ['contrib.js', 'social.js', 'site.js', 'api.js', 'fake-api.js']) assert.doesNotMatch(readFileSync(join(HERE, '..', 'assets', f), 'utf8'), /\beval\(|document\.write\(|new Function\(|javascript:/, f);
});

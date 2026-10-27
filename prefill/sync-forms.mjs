// Keeps the pick lists inside the GitHub suggestion forms (.github/ISSUE_TEMPLATE/) in step with the data.
//   node prefill/sync-forms.mjs          writes the lists
//   node prefill/sync-forms.mjs --check  exits 1 if any list is out of date (site/check.mjs runs this)
// WHY (review Oct 26): the forms used to ask people to TYPE a group name or pick from a hand-typed category list,
// so they drifted from the real ones and robot suggestions failed with "No group called …". Now the lists are
// generated from data/groups.json and data/categories.json, so a new group appears in the forms automatically.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
const groups = read('data/groups.json').groups.map((g) => g.name).sort((a, b) => a.localeCompare(b));
const categories = read('data/categories.json').categories.map((c) => c.name);
// The first option of an optional/"none fit" group list. The robot (suggestion.mjs) recognises this wording.
export const NO_GROUP = 'None of these fit (a mod will choose)';
const LISTS = [
  { file: '1-add-project.yml', name: 'groups', items: [NO_GROUP, ...groups] },
  { file: '3-add-closed-app.yml', name: 'groups', items: [NO_GROUP, ...groups] },
  { file: '4-new-group.yml', name: 'categories', items: categories },
];

export function render(text, name, items) {
  const re = new RegExp(`( *)# BEGIN ${name}[^\\n]*\\n[\\s\\S]*?\\1# END ${name}`);
  const m = text.match(re); if (!m) throw new Error(`no BEGIN/END ${name} markers`);
  const pad = m[1];
  const first = m[0].split('\n')[0];
  return text.replace(re, `${first}\n${items.map((i) => `${pad}- ${JSON.stringify(i)}`).join('\n')}\n${pad}# END ${name}`);
}
export function stale() {
  const out = [];
  for (const { file, name, items } of LISTS) {
    const f = join(ROOT, '.github/ISSUE_TEMPLATE', file); const now = readFileSync(f, 'utf8'); const next = render(now, name, items);
    if (now !== next) out.push({ f, next, file });
  }
  return out;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = stale();
  if (process.argv.includes('--check')) { if (s.length) { console.error(`Form lists out of date: ${s.map((x) => x.file).join(', ')}. Run: node prefill/sync-forms.mjs`); process.exit(1); } console.log('form lists in step with the data'); }
  else { for (const x of s) writeFileSync(x.f, x.next); console.log(s.length ? `updated ${s.map((x) => x.file).join(', ')}` : 'already up to date'); }
}

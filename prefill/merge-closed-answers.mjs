// Copies the closed apps' researched answers (prefill/out/closed-answers.json, from closed-answers.mjs) into
// data/closed-apps.json, the file the site reads. Run from the repo root: node prefill/merge-closed-answers.mjs
//
// WHY a file of its own instead of more rows in features.json: features.json's answers are keyed by project id, and closed
// apps have names, not ids (and one name can sit in several groups). Keeping them apart also keeps every open-data user's
// existing reading of features.json unchanged.
// WHY only answers with a source: design §2 (docs/evidence-map-design.md) — every value shows where it came from.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const src = join(HERE, process.argv[2] ?? 'out/closed-answers.json');
if (!existsSync(src)) { console.error(`No ${src}; run prefill/closed-answers.mjs first.`); process.exit(1); }
const research = JSON.parse(readFileSync(src, 'utf8'));
const groups = JSON.parse(readFileSync(join(ROOT, 'data/groups.json'), 'utf8')).groups;
const features = JSON.parse(readFileSync(join(ROOT, 'data/features.json'), 'utf8'));
const names = new Set(groups.flatMap((g) => g.closed ?? []));

// WHY "own" (Nov 2 design check): some checklist items are about the closed app itself — "Opens Word files faithfully" for
// Microsoft Word, "Imports from Slack" for Slack. The AI answered them oddly ("Word: partly"); the honest answer is "that's
// its own format", shown as its own mark. Rule: the item's name starts with opens / imports / runs / uses / works with /
// drop-in and names the app's brand (its name without Microsoft, Google, Apple, Adobe or Amazon) and no other app
// ("Imports from Trello, Asana or Jira" is a real question for Trello: can it import from the other two?).
const brand = (n) => n.replace(/^(Microsoft|Google|Apple|Adobe|Amazon) /, '').split(/[ .]/)[0];
const ownTags = new Map();
for (const g of groups) for (const t of features.groups[g.id] ?? []) for (const c of g.closed ?? []) {
  const b = brand(c), name = features.tags[t]?.name ?? '';
  if (b.length >= 3 && /^(Opens|Imports|Runs|Uses|Works with|Drop-in)/.test(name) && !/,| or | and /.test(name) && new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(name))
    (ownTags.get(c) ?? ownTags.set(c, new Set()).get(c)).add(t);
}

const apps = {};
let answers = 0, stale = 0;
for (const [name, r] of Object.entries(research).sort(([a], [b]) => a.localeCompare(b))) {
  // WHY skip names no group lists any more: the list was tidied after some research ran (docs/closed-apps-cleanup.md).
  if (!names.has(name)) { stale++; continue; }
  const e = {};
  if (r.status && r.status.is !== 'current') e.status = { is: r.status.is, note: r.status.note ?? null, source: r.status.source ?? null };
  const a = Object.fromEntries(Object.entries(r.answers ?? {}).filter(([, x]) => x.source));
  for (const t of ownTags.get(name) ?? []) a[t] = { v: 'own' };
  if (Object.keys(a).length) e.answers = a;
  if (Object.keys(e).length) { apps[name] = e; answers += Object.keys(a).length; }
}
writeFileSync(join(ROOT, 'data/closed-apps.json'), JSON.stringify({
  license: 'CC BY-SA 4.0',
  note: 'Closed apps\' answers to the same feature checklists as data/features.json (keyed by app name, then checklist item). ' +
    'by "ai" = researched by AI from the cited page; checked = the date it was researched; v "own" = the item is about this app\'s own files or data. status = the app has shut down or been renamed.',
  apps,
}, null, 1) + '\n');
console.log(`${Object.keys(apps).length} apps, ${answers} answers written to data/closed-apps.json${stale ? ` (${stale} old names skipped)` : ''}`);

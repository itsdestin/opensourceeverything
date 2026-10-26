// Seeds the boards with what the map already knows: each "Replaces partly" listing's short "what's missing" line
// becomes a Missing feature note on that project, posted by the map's own account (Destin, Oct 27: "seed the boards").
// WHY: empty boards make a site look dead; these give people something to vote on, or to mark fixed when out of date.
// Safe to run again: notes already on the server (same job and title) are skipped.
// Run: node seed-notes.mjs > seed.sql && npx wrangler d1 execute opensourceeverything --remote --file seed.sql
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const groups = JSON.parse(readFileSync(new URL('data/groups.json', ROOT), 'utf8')).groups;
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
// WHY id -1: GitHub never gives out negative ids, so no real person can ever sign in as this account.
const MAP = -1;
const now = Date.now();
const out = [`INSERT OR IGNORE INTO users (id, login, github_created, trusted, joined) VALUES (${MAP}, 'opensourceeverything', ${now}, 1, ${now});`];
let n = 0;
for (const g of groups) for (const a of g.alternatives) {
  if (a.fit !== 'partial' || !a.note) continue;
  const title = a.note.charAt(0).toUpperCase() + a.note.slice(1);
  const body = `Added from the map itself: this is why it's listed as "Replaces partly" for ${g.name.toLowerCase()}. If it matters to you, vote for it. If it's no longer true, say it's fixed, with a link.`;
  out.push(`INSERT INTO notes (kind, category, grp, projects, closed_apps, title, body, author_id, created, held)
  SELECT 'missing', ${q(g.category)}, ${q(g.id)}, ${q(JSON.stringify([a.project]))}, '[]', ${q(title)}, ${q(body)}, ${MAP}, ${now - n * 1000}, 0
  WHERE NOT EXISTS (SELECT 1 FROM notes WHERE grp = ${q(g.id)} AND title = ${q(title)} AND author_id = ${MAP});`);
  n++;
}
console.log(out.join('\n'));
console.error(`${n} notes`);

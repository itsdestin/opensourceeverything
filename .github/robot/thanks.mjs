// Writes the thank-you comment for a merged suggestion: node .github/robot/thanks.mjs <issue number>  → prints markdown.
// It finds the live address from the change the robot recorded in data/edits.json (so the link is the real one).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SITE = process.env.SITE_URL ?? 'https://opensourceeverything.org/';
const read = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
const n = Number(process.argv[2]);
// The same address rule the site uses for a closed app's page (site/src/cards.mjs appSlug).
const slug = (name) => name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');

// WHY the fallback: data/edits.json only exists once the first suggestion has been applied.
const e = (() => { try { return read('data/edits.json').edits.find((x) => x.issue === n); } catch { return null; } })();
let link = null; let what = 'It is now on the map.';
if (e?.type === 'add-project') {
  const p = read('data/projects.json').projects.find((x) => norm(x.code) === norm(e.code));
  link = p ? `p/${p.id}/` : e.group ? `g/${e.group}/` : null; what = `**${e.name}** is now listed.`;
} else if (e?.type === 'add-closed-app') { link = `alternatives-to/${slug(e.app)}/`; what = `**${e.app}** now has its own page, so people searching for it find the open alternatives.`; }
else if (e?.type === 'new-group') { link = `g/${e.id}/`; what = `**${e.name}** is now a group on the map.`; }
else if (e?.type === 'fix') { link = e.project ? `p/${e.project}/` : null; what = 'The fix is in.'; }
else if (e?.type === 'remove-project') { what = 'The project has been taken off the map.'; }

console.log(`Thank you${e?.by ? `, @${e.by}` : ''}! ${what}${link ? `\n\nSee it here: ${SITE}${link}` : ''}\n\nIt can take a couple of minutes to show up after a change like this. If something looks wrong, say so right here.${link ? `\n\n<!-- live: ${SITE}${link} -->` : ''}`);

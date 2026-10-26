// Compares the map's projects before and after the weekly refresh and writes refresh-report.md for the pull request:
// license changes, newly archived or quiet projects, and projects that dropped off. Mods read this before merging.
// Run: node .github/robot/refresh-report.mjs <old projects.json> <new projects.json>
// WHY (plan: "a weekly robot that refreshes facts and flags license changes"): a project that switches to a
// non-open license, or is abandoned, must not stay listed silently.
import { readFileSync, writeFileSync } from 'node:fs';

const [oldFile, newFile] = process.argv.slice(2);
const before = new Map(JSON.parse(readFileSync(oldFile, 'utf8')).projects.map((p) => [p.id, p]));
const after = new Map(JSON.parse(readFileSync(newFile, 'utf8')).projects.map((p) => [p.id, p]));
const lines = [];
for (const [id, a] of after) {
  const b = before.get(id); if (!b) continue;
  const link = `[${a.name}](https://itsdestin.github.io/opensourceeverything/p/${id}/)`;
  // WHY only known → different: a license filled in for the first time isn't a change worth a mod's time.
  if (b.license && b.license !== a.license) lines.push(`- ⚠️ ${link}: license changed from ${b.license ?? 'unknown'} to ${a.license ?? 'unknown'}. **Check it's still open source.**`);
  if (!b.archived && a.archived) lines.push(`- 🗄️ ${link} was archived by its owners (no longer maintained).`);
  if (!b.inactive && a.inactive) lines.push(`- 💤 ${link} has had no changes in a year.`);
}
for (const [id, b] of before) if (!after.has(id)) lines.push(`- ❌ ${b.name} dropped off the map (its code page may be gone, or its license is no longer open).`);
const stars = [...after.values()].filter((p) => before.has(p.id) && p.stars !== before.get(p.id).stars).length;
writeFileSync('refresh-report.md', `The weekly refresh: GitHub stars, activity, licenses, links and downloads, read again for every project.\n\n` +
  (lines.length ? `**Needs a mod's eye**\n\n${lines.join('\n')}\n\n` : 'Nothing needs a mod\'s eye this week.\n\n') +
  `${stars} projects' star counts changed. Merging puts the new facts on the site.\n`);
console.log(lines.length ? lines.join('\n') : 'nothing flagged');

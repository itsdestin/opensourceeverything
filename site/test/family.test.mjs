// Quick checks for the family data: every claim has a source, parents exist, old names are findable, old addresses redirect.
// Run: node site/test/family.test.mjs   (after node prefill/assemble.mjs)
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadData } from '../src/lib.mjs';
import { familyIndex, ownText, oldNames, redirects, stoppedBanner } from '../src/family.mjs';
const d = loadData(join(dirname(fileURLToPath(import.meta.url)), '..', '..'));
const fam = familyIndex(d);
const withLineage = d.projects.filter((p) => p.lineage);
assert.ok(withLineage.length >= 25, 'about 25 families filled');
for (const p of withLineage) {
  const e = p.lineage;
  assert.match(e.source, /^https:\/\//, `${p.id}: source link`);
  assert.ok(e.of ? d.projById.has(e.of) : e.ofName, `${p.id}: parent exists`);
}
assert.equal(ownText(d.projById.get('forgejo'), fam), 'Split from Gitea (2022)');
assert.ok(oldNames(d.projById.get('mbin'), fam)[0].text.includes('kbin'));
assert.ok(redirects(d).some((r) => r.from === 'perplexica'));
assert.ok(stoppedBanner(d.projById.get('keepassx'), fam).includes('KeePassXC'));
console.log(`family test: ${withLineage.length} entries ok`);

// Copies the map's two AI-facing files into the server's bundle (worker/src/generated/): catalog.json and search.json.
// Run by `npm test`, `npm run dev` and `npm run deploy`. WHY: see the note at the top of src/agent.js (the 10 ms limit).
// It builds them with the very same functions as the site build (site/build.mjs), so the server and the site agree.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadData } from '../../site/src/lib.mjs';
import { familyIndex } from '../../site/src/family.mjs';
import { buildAgentData } from '../../site/src/catalog.mjs';
import { searchIndex } from '../../site/src/search-index.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'worker', 'src', 'generated');
const d = loadData(ROOT); familyIndex(d);
const generated = JSON.parse(readFileSync(join(ROOT, 'data', 'projects.json'), 'utf8')).generated ?? new Date().toISOString().slice(0, 10);
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'catalog.json'), JSON.stringify(buildAgentData(d, generated).catalog));
writeFileSync(join(OUT, 'search.json'), JSON.stringify(searchIndex(d)));
console.log(`worker snapshot: ${d.groups.length} groups, ${d.projects.length} projects (data of ${generated})`);

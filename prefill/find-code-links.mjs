// Step 1b of the pre-fill (free, no AI): for projects the lists gave only a website for, open that
// website and look for a link to its code (GitHub, GitLab or Codeberg). Updates candidates.json in place.
// Run: node prefill/find-code-links.mjs   (then rerun github-facts.mjs)
//
// WHY: a project's own homepage nearly always links its code. Finding it here means the AI step
// doesn't have to search for it, and the license can be checked the same way as everyone else's.

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoOf } from './import-lists.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out');
const file = join(OUT, 'candidates.json');
const data = JSON.parse(readFileSync(file, 'utf8'));
const missing = data.projects.filter((p) => !p.repo && p.urls.length);
const key = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

async function page(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { 'User-Agent': 'alternatives-map-prefill' } });
    return res.ok ? (await res.text()).slice(0, 2_000_000) : '';
  } catch { return ''; }
}

// WHY score by name match, then count: homepages also link their *dependencies* and sponsors.
function pick(html, name) {
  const counts = new Map();
  for (const m of html.matchAll(/https?:\/\/(?:www\.)?(?:github\.com|gitlab\.com|codeberg\.org)\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/gi)) {
    const r = repoOf(m[0].replace(/[.,]+$/, ''));
    if (r) counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  const ranked = [...counts].sort((a, b) => {
    const an = key(a[0]).includes(key(name)) ? 1 : 0, bn = key(b[0]).includes(key(name)) ? 1 : 0;
    return bn - an || b[1] - a[1];
  });
  const best = ranked[0]?.[0];
  // Only accept a link whose owner or name resembles the project, to avoid picking up a random dependency.
  return best && (key(best).includes(key(name)) || key(name).includes(key(best.split('/')[2] ?? ''))) ? best : undefined;
}

let found = 0;
const queue = [...missing];
await Promise.all(Array.from({ length: 8 }, async () => {
  for (let p = queue.shift(); p; p = queue.shift()) {
    for (const url of p.urls.slice(0, 2)) {
      const r = pick(await page(url), p.name);
      if (r) { p.repo = r; p.repoFoundOnWebsite = url; found++; break; }
    }
  }
}));
writeFileSync(file, JSON.stringify(data, null, 1));
const text = `\n## Step 1b: code links found on project websites (free)\n\nOpened the websites of **${missing.length}** projects that had no code link: found one for **${found}**. ` +
  `**${missing.length - found}** still have none (often hosted services or closed-source picks that slipped into a list).\n`;
appendFileSync(join(OUT, 'summary.md'), text);
console.log(text);

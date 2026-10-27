// Suggests project families for a mod to confirm: "possible family: confirm?".
// Run on its own: node .github/robot/family-suggestions.mjs [--ignore-known] [--no-readme]
// Also used by refresh-report.mjs, which puts the result in the weekly refresh pull request.
//
// WHY suggestions only (review Oct 26, section 5): GitHub's own "this is a fork" flag catches only 3 of 431 projects,
// and fork disputes are personal, so a person confirms every relationship. Nothing here changes the site: a family only shows
// once a mod adds it to data/lineage.json with "confirmed": "mod". Free: reads the files the refresh already wrote, plus
// each GitHub project's README (one cheap request each, only when GH_TOKEN is set).
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null);
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '');
// "github.com/Org/Repo" and "https://codeberg.org/org/repo/" both become "org/repo" on their host, lower case.
const repoKey = (code) => (code ? code.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase() : null);

// What READMEs say, in the words people use. Each maps to the relation a mod will most likely want.
// Names that show up after "formerly" or "based on" in READMEs without meaning a family ("follow us on X (formerly Twitter)").
const NOT_A_PROJECT = new Set(['twitter', 'x', 'github', 'gitlab', 'google', 'facebook', 'meta', 'linkedin', 'discord', 'slack', 'youtube', 'docker', 'kubernetes', 'linux', 'windows', 'android', 'openstreetmap', 'node', 'react', 'the', 'this', 'our', 'a']);
const PHRASES = [
  [/\b(?:fork(?:ed)?\s+(?:of|from)|forked\s+from)\s+\[?([A-Z][\w.+!/-]*(?:\s+[A-Z][\w.+!/-]*){0,2})/g, 'split', 'says it is a fork of'],
  [/\b(?:formerly(?:\s+(?:known\s+as|called))?|previously\s+(?:known\s+as|called)|renamed\s+from|was\s+(?:called|named|known\s+as))\s+\[?([A-Z][\w.+!/-]*(?:\s+[A-Z][\w.+!/-]*){0,2})/g, 'renamed', 'says it was formerly'],
  [/\b(?:successor\s+to|continuation\s+of|continues|picks\s+up\s+where)\s+\[?([A-Z][\w.+!/-]*(?:\s+[A-Z][\w.+!/-]*){0,2})/g, 'continues', 'says it continues'],
  [/\bbased\s+on\s+\[?([A-Z][\w.+!/-]*(?:\s+[A-Z][\w.+!/-]*){0,2})/g, 'built-on', 'says it is based on'],
];

async function readme(code, token) {
  const m = /^github\.com\/([^/]+)\/([^/]+)/i.exec(code ?? ''); if (!m) return '';
  try {
    const r = await fetch(`https://api.github.com/repos/${m[1]}/${m[2]}/readme`, { headers: { Accept: 'application/vnd.github.raw', Authorization: `Bearer ${token}`, 'User-Agent': 'opensourceeverything' }, signal: AbortSignal.timeout(15_000) });
    return r.ok ? (await r.text()).slice(0, 4000) : '';
  } catch { return ''; }
}

export async function suggestFamilies({ projects, links = {}, hostFacts = {}, lineage = {}, token, useReadme = true, ignoreKnown = false }) {
  const byName = new Map(projects.map((p) => [norm(p.name), p]));
  const byRepo = new Map(projects.filter((p) => p.code).map((p) => [repoKey(p.code), p]));
  // Pairs already decided (either way) are never suggested again, including "same name, unrelated".
  const known = new Set();
  if (!ignoreKnown) for (const [id, e] of Object.entries(lineage)) { known.add(`${id}>${e.of ?? norm(e.ofName)}`); if (e.of) known.add(`${e.of}>${id}`); known.add(`${id}>*`); }
  const out = new Map(); // id -> suggestion (strongest signal wins; the others are listed as extra evidence)
  const add = (p, parent, parentName, relation, signal, source, strength) => {
    if (!ignoreKnown && (known.has(`${p.id}>*`) || (parent && known.has(`${p.id}>${parent.id}`)) || (parent && known.has(`${parent.id}>${p.id}`)))) return;
    if (parent && parent.id === p.id) return;
    const key = `${p.id}>${parent?.id ?? norm(parentName)}`;
    const cur = out.get(key) ?? { id: p.id, name: p.name, parent: parent?.id ?? null, parentName: parent?.name ?? parentName, relation, signals: [], source, strength: 0 };
    cur.signals.push(signal); if (strength > cur.strength) { cur.strength = strength; cur.relation = relation; cur.source = source; }
    out.set(key, cur);
  };

  // 1. The code site itself says "this is a copy of that" (GitHub's isFork + parent, Forgejo/GitLab parent or migrated-from).
  for (const p of projects) {
    const l = p.code && links[p.code]; const h = hostFacts[p.id];
    const real = (l?.isFork && l.forkOf) || h?.forkOf || null;
    // WHY migrated-from is weaker: a project that moved between code sites (Inventaire: GitHub to Codeberg) also keeps its old address,
    // and some sites record a local test address. Only count it when it points at a different project name.
    const moved = h?.migratedFrom && !/localhost|127\.0\.0\.1/.test(h.migratedFrom) && repoKey(h.migratedFrom).split('/').pop() !== repoKey(p.code)?.split('/').pop() ? h.migratedFrom : null;
    const url = real || moved; if (!url) continue;
    const parent = byRepo.get(repoKey(url));
    add(p, parent, parent?.name ?? url.replace(/^https?:\/\/(www\.)?/, ''), 'split', real ? `its code page says it is a fork of ${url}` : `its code page says it was imported from ${url}`, url, real ? 3 : 2);
  }

  // 2. Words in the README and the one-line description.
  if (useReadme && token) {
    const queue = projects.filter((p) => p.code?.startsWith('github.com/'));
    for (let i = 0; i < queue.length; i += 8) {
      await Promise.all(queue.slice(i, i + 8).map(async (p) => {
        const text = `${p.summary}\n${await readme(p.code, token)}`;
        for (const [re, relation, words] of PHRASES) {
          for (const m of text.matchAll(re)) {
            const name = m[1].replace(/[.,;:!)\]]+$/, '').trim();
            if (NOT_A_PROJECT.has(norm(name))) continue;
            // Try the full phrase, then shorter ones ("Organic Maps and" -> "Organic Maps").
            const parts = name.split(/\s+/); let parent = null;
            for (let n = parts.length; n >= 1 && !parent; n--) parent = byName.get(norm(parts.slice(0, n).join(' ')));
            // WHY only listed projects for "based on": "based on OpenStreetMap" is true of half the map and is not a family.
            if (parent && parent.id !== p.id) add(p, parent, parent.name, relation, `its README ${words} ${parent.name}`, `https://${p.code}`, relation === 'built-on' ? 1 : 2);
            else if (!parent && ['renamed'].includes(relation) && parts[0].length > 2) add(p, null, name, relation, `its README ${words} ${name}`, `https://${p.code}`, 2);
          }
        }
      }));
    }
  }

  // 3. Names: one project's whole name sits inside another's, and they are not from the same organisation.
  const owner = (p) => repoKey(p.code)?.split('/').slice(0, 2).join('/');
  for (const a of projects) for (const b of projects) {
    if (a.id === b.id || norm(b.name).length < 5 || norm(a.name) === norm(b.name)) continue;
    // WHY whole words: "Ghostfolio" is not "Ghost". b's words must appear, in order, as separate words of a's name.
    const words = (x) => x.name.toLowerCase().replace(/\(.*?\)/g, ' ').split(/[^a-z0-9]+/).filter(Boolean).join(' ');
    if (` ${words(a)} `.includes(` ${words(b)} `) && owner(a) !== owner(b) && !(a.code && b.code && a.code.split('/')[1] === b.code.split('/')[1])) {
      // WHY organisation check by the first path part: "Nextcloud Talk" and "Nextcloud" are one team's apps, not a fork pair.
      add(a, b, b.name, 'split', `its name contains "${b.name}"`, a.code ? `https://${a.code.replace(/^https?:\/\//, '')}` : a.website, 1);
    }
  }
  return [...out.values()].sort((x, y) => y.strength - x.strength || x.name.localeCompare(y.name));
}

const LABEL = { split: 'split / fork', 'fork-keeps-up': 'copy that keeps up', continues: 'continues', renamed: 'renamed', 'built-on': 'built on', 'free-edition': 'free edition' };
export function renderMarkdown(list, limit = 25) {
  if (!list.length) return '**Possible families: confirm?**\n\nNo new possible families this week.\n\n';
  const row = (s) => {
    const entry = { [s.id]: { ...(s.parent ? { of: s.parent } : { ofName: s.parentName }), relation: s.relation, since: null, why: 'ONE NEUTRAL SENTENCE', source: s.source, confirmed: 'mod' } };
    return `- **${s.name}** may be related to **${s.parentName}** (${LABEL[s.relation]}): ${[...new Set(s.signals)].join('; ')}.\n  <details><summary>Entry to paste into data/lineage.json if it is right</summary>\n\n  \`\`\`json\n  ${JSON.stringify(entry).slice(1, -1)}\n  \`\`\`\n  </details>`;
  };
  return `**Possible families: confirm?**\n\nNothing below is on the site. A family appears only after a mod adds it to \`data/lineage.json\` with \`"confirmed": "mod"\` (a neutral one-sentence reason and a source link are required). ` +
    `Not a family? Add it with relation \`unrelated-same-name\` so it is not suggested again.\n\n${list.slice(0, limit).map(row).join('\n')}\n${list.length > limit ? `\n…and ${list.length - limit} weaker suggestions.\n` : ''}\n`;
}

// Everything the refresh has on disk, ready for suggestFamilies.
export async function suggestFromDisk(opts = {}) {
  const projects = read(join(ROOT, 'data/projects.json')).projects;
  return suggestFamilies({
    projects, links: read(join(ROOT, 'prefill/out/links.json')) ?? {}, hostFacts: read(join(ROOT, 'prefill/out/host-facts.json')) ?? {},
    lineage: read(join(ROOT, 'data/lineage.json'))?.lineage ?? {}, token: process.env.GH_TOKEN, ...opts,
  });
}

if (process.argv[1] && process.argv[1].endsWith('family-suggestions.mjs')) {
  const list = await suggestFromDisk({ ignoreKnown: process.argv.includes('--ignore-known'), useReadme: !process.argv.includes('--no-readme') });
  console.log(renderMarkdown(list, process.argv.includes('--all') ? 999 : 25));
}

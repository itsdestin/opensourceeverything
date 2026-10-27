// Project families: which project came from which, and how (data/lineage.json -> project.lineage).
// Used by cards (one short "family" line), project pages (the line, a Family section and a "development stopped" banner),
// the search index (old names) and the redirect pages for renamed projects.
//
// WHY only neutral, sourced facts (review Oct 26 section 5): fork disputes are personal and the site speaks for the
// subreddit, so this file never says "better" or "worse". It states a relation, a year, one sentence and a link to the source,
// and only for entries a mod confirmed (confirmed: "mod"); anything else is invisible.
import { esc, url } from './lib.mjs';

// Everyday words for each relation. "N" is the other project's name (already linked or escaped by the caller).
// A hand-written `label` in the data replaces the words (e.g. "Works with Bitwarden's apps").
const PHRASE = {
  'fork-keeps-up': (N) => `A modified version of ${N} that keeps up with its updates`,
  split: (N, y) => `Started as a copy of ${N}${y ? ` in ${y}` : ''}, now separate`,
  continues: (N) => `Carries on ${N} after it stopped`,
  renamed: (N) => `Formerly called ${N}`,
  'built-on': (N) => `Uses ${N} underneath`,
  'free-edition': (N) => `Free version of ${N}`,
  'unrelated-same-name': (N) => `Not related to ${N} (only the name is similar)`,
};
// WHY plain words (Destin, redesign round 2: "'copy that keeps up' / 'built on it' don't have clear meaning to normal users"): every
// label says what the project IS to someone who has never heard "fork".
// The same relation inside the tree, where the parent is the row above and needs no name.
const SHORT = { 'fork-keeps-up': 'Modified copy, kept up to date', split: 'Started as a copy, now separate', continues: 'Carries it on', renamed: 'New name', 'built-on': 'Uses it underneath', 'free-edition': 'Free version', 'unrelated-same-name': 'Same name only' };
// The same relation seen from the original's side, as a lead-in to a list of names.
const REVERSE = { 'fork-keeps-up': 'Modified versions', split: 'Separate copies', continues: 'Carried on by', renamed: 'Now called', 'built-on': 'Used underneath by', 'free-edition': 'Free version' };
const REVERSE_ORDER = ['Modified versions', 'Separate copies', 'Carried on by', 'Now called', 'Used underneath by', 'Free version'];

export const shown = (p) => p?.lineage && p.lineage.confirmed === 'mod' ? p.lineage : null;

// Index everything once per build: parent -> children, and quick lookups.
// Remembered per data set, and the latest one is kept for cards (altCard has no access to the data, only to a project).
const MEMO = new WeakMap();
let LATEST = null;
export const currentFamily = () => LATEST;
export function familyIndex(d) {
  if (MEMO.has(d)) return (LATEST = MEMO.get(d));
  const kids = new Map();
  for (const p of d.projects) {
    const e = shown(p);
    if (e?.of && e.relation !== 'unrelated-same-name') (kids.get(e.of) ?? kids.set(e.of, []).get(e.of)).push(p);
  }
  const fam = { d, kids };
  MEMO.set(d, fam); LATEST = fam;
  return fam;
}

const nameOf = (e, d) => (e.of ? d.projById.get(e.of)?.name : e.ofName);
const linkTo = (e, d) => {
  const href = e.of ? url(`p/${e.of}/`) : null;
  const name = esc(nameOf(e, d));
  // A project that is not on the map links to its own page when we know it (marked as an outside link).
  return href ? `<a href="${href}">${name}</a>` : e.ofUrl ? `<a href="${esc(e.ofUrl)}" rel="noopener">${name}</a>` : name;
};
const yearOf = (e) => (e.since && e.relation !== 'split' ? ` (${e.since})` : ''); // WHY not for a split: the year is already inside the sentence

// "Split from <Gitea> (2022)": the project's own line, as HTML. null when it has no confirmed lineage.
export function ownLine(p, fam) {
  const e = shown(p); if (!e) return null;
  const N = linkTo(e, fam.d);
  return `${e.label ? esc(e.label) : PHRASE[e.relation](N, e.since)}${yearOf(e)}`;
}
// The same, as plain text (search results, page descriptions).
export function ownText(p, fam) {
  const e = shown(p); if (!e) return null;
  return `${e.label ?? PHRASE[e.relation](nameOf(e, fam.d), e.since)}${yearOf(e)}`;
}

// "Forked by: <Forgejo>": what other projects say about this one, grouped. max names per group on cards.
export function reverseLines(p, fam, max = 3) {
  const by = new Map();
  for (const k of fam.kids.get(p.id) ?? []) {
    const w = REVERSE[shown(k).relation]; if (!w) continue;
    (by.get(w) ?? by.set(w, []).get(w)).push(k);
  }
  return REVERSE_ORDER.filter((w) => by.has(w)).map((w) => {
    const list = by.get(w);
    const names = list.slice(0, max).map((k) => `<a href="${url(`p/${k.id}/`)}">${esc(k.name)}</a>`).join(', ');
    return `${w}: ${names}${list.length > max ? ` +${list.length - max} more` : ''}`;
  });
}

// ── Status of a project in the tree ──
export function status(p) {
  if (!p) return { key: 'outside', text: 'Not on this map' };
  if (p.archived) return { key: 'archived', text: 'Archived' };
  if (p.inactive) return { key: 'inactive', text: 'Inactive' };
  return { key: 'active', text: 'Active' };
}

// Walk up to the oldest listed project, or to an outside name (kbin) when that is where the family starts.
export function rootOf(p, d) {
  let cur = p; const seen = new Set();
  for (;;) {
    const e = shown(cur);
    if (!e || e.relation === 'unrelated-same-name' || seen.has(cur.id)) return { project: cur };
    seen.add(cur.id);
    if (!e.of) return { outside: { name: e.ofName, url: e.ofUrl, relation: e.relation }, first: cur };
    const up = d.projById.get(e.of);
    if (!up) return { project: cur };
    cur = up;
  }
}

// Is this project part of a family at all (has a confirmed parent, or someone confirmed it as their parent)?
export const inFamily = (p, fam) => !!(shown(p) && shown(p).relation !== 'unrelated-same-name') || (fam.kids.get(p.id) ?? []).length > 0;

// "Development stopped. Continued as <X>": on a project that is archived or quiet and that another project says it continues.
export function stoppedBanner(p, fam) {
  if (!(p.archived || p.inactive)) return '';
  const next = (fam.kids.get(p.id) ?? []).filter((k) => shown(k).relation === 'continues');
  if (!next.length) return '';
  const names = next.map((k) => `<a href="${url(`p/${k.id}/`)}">${esc(k.name)}</a>`).join(' and ');
  const src = shown(next[0]);
  return `<div class="callout warn fam-banner" role="note"><b>${p.archived ? 'Development stopped.' : 'No changes in over a year.'}</b> Continued as ${names}. <a href="${esc(src.source)}" rel="noopener">Source</a></div>`;
}

// Old names people may still search for, with the sentence to show: [{ old, text }] for one project.
export function oldNames(p, fam) {
  const e = shown(p); if (!e?.oldNames?.length) return [];
  return e.oldNames.map((old) => ({
    old,
    text: e.relation === 'continues' ? `Looking for ${old}? It continues as ${p.name}.`
      : e.relation === 'renamed' ? `Looking for ${old}? It is now called ${p.name}.`
      : `Looking for ${old}? ${p.name}: ${ownText(p, fam)}.`,
  }));
}

// Old addresses that still work: p/<oldId>/ -> the renamed project. Returns [{ path, to, from }].
export function redirects(d) {
  const out = [];
  for (const p of d.projects) {
    const e = shown(p);
    for (const old of e?.redirectFrom ?? []) if (!d.projById.has(old)) out.push({ from: old, to: p });
  }
  return out;
}

// ───────── The compact family pieces cards and the project page share ─────────
// One grey line for a card: its own relation in plain words, else who was made from it. Plain text.
export function famGrey(p, fam) {
  const e = shown(p);
  if (e?.differs) return e.differs; // WHY: how it differs from its upstream says more than the relation word
  if (e && e.relation !== 'unrelated-same-name') return ownText(p, fam);
  const by = reverseLines(p, fam, 2)[0];
  return by ? by.replace(/<[^>]+>/g, '') : '';
}
// The list the Family card shows: the tree flattened, depth for indentation, relation in plain words.
export function famNodes(p, fam) {
  if (!inFamily(p, fam)) return [];
  const root = rootOf(p, fam.d); const out = [];
  const add = (c, depth, parent) => {
    const e = shown(c);
    // WHY "how it differs" first (Destin: families are always framed by how a project differs from its upstream); the plain relation words are only the fallback.
    const diff = depth && e ? e.differs : null;
    out.push({ p: c, depth, parent, here: c.id === p.id, status: status(c), diff: diff || '', rel: depth && e ? (e.label ?? (e.relation === 'split' && e.since ? `Started as a copy in ${e.since}, now separate` : SHORT[e.relation])) + (e.relation === 'fork-keeps-up' && e.since ? ` (${e.since})` : '') : '', why: depth && e ? e.why : '', source: depth && e ? e.source : '' });
    for (const k of (fam.kids.get(c.id) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name))) add(k, depth + 1, c.name);
  };
  if (root.outside) {
    const o = root.outside;
    out.push({ outside: true, name: o.name, url: o.url, depth: 0, status: o.relation === 'renamed' ? { key: 'renamed', text: 'Old name' } : { key: 'outside', text: 'Not on this map' } });
    for (const s of fam.d.projects.filter((x) => { const e = shown(x); return e && !e.of && e.ofName === o.name && rootOf(x, fam.d).outside; })) add(s, 1, o.name);
  } else add(root.project, 0);
  return out;
}

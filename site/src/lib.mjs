// Shared helpers for building Open Instead's pages: loading the map data, links, small HTML pieces.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// WHY a base path: on GitHub Pages the site lives at itsdestin.github.io/openinstead/; with a custom address it's "/".
export const BASE = process.env.SITE_BASE ?? '/openinstead/';
export const SITE_URL = process.env.SITE_URL ?? 'https://itsdestin.github.io/openinstead/';
// WHY: voting, comments and suggestions need the server (built next). Until it exists, pages leave those
// controls out entirely rather than showing buttons that do nothing (YouCoded design rule).
export const API_URL = process.env.API_URL ?? '';
export const SUBREDDIT = 'https://www.reddit.com/r/TrueOpenSource/';
export const REPO = 'https://github.com/itsdestin/openinstead';

export const url = (path = '') => BASE + path.replace(/^\//, '');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtStars = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n));
export const KIND = { app: 'App', self_hosted: 'Runs on your own server', developer_tool: 'For developers', library: 'Code library' };
export const codeUrl = (p) => (p.code ? `https://${p.code}` : p.website);
export const hostOf = (p) => (p.code ? p.code.split('/')[0] : null);

export function loadData(root) {
  const read = (f) => JSON.parse(readFileSync(join(root, 'data', f), 'utf8'));
  const categories = read('categories.json').categories;
  const groups = read('groups.json').groups;
  const projects = read('projects.json').projects;
  const projById = new Map(projects.map((p) => [p.id, p]));
  const catById = new Map(categories.map((c) => [c.id, c]));
  const groupsByProject = new Map();
  for (const g of groups) for (const a of g.alternatives) (groupsByProject.get(a.project) ?? groupsByProject.set(a.project, []).get(a.project)).push({ group: g, alt: a });
  return { categories, groups, projects, projById, catById, groupsByProject };
}

export const ICON = {
  search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/></svg>',
  star: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z"/></svg>',
  shield: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>',
  chev: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
};

// The fact chips every listing shows, in one order everywhere (YouCoded's "one chip row" rule).
export function factChips(p, alt) {
  const c = [];
  if (p.verified) c.push(`<span class="chip">${ICON.shield}Verified</span>`);
  c.push(`<span class="chip"${p.licenseNeedsCheck ? ' title="A mod is confirming this license"' : ''}>${esc(p.license ?? 'License being checked')}</span>`);
  if (p.licenseClass === 'open_core') c.push('<span class="chip" title="Open source, with some parts paid or under another license">Open core</span>');
  if (alt?.fit === 'partial') c.push(`<span class="chip" title="${esc(alt.note || 'Covers part of the job')}">Replaces partly</span>`);
  if (p.stars) c.push(`<span class="chip">${ICON.star}${fmtStars(p.stars)} on GitHub</span>`);
  else if (hostOf(p) !== 'github.com') c.push('<span class="chip">Not on GitHub</span>');
  if (KIND[p.kind]) c.push(`<span class="chip">${esc(KIND[p.kind])}</span>`);
  return c.join('');
}
export const statusPill = (p) => (p.inactive ? '<span class="pill warn"><i></i>Quiet for a year</span>' : '<span class="pill ok"><i></i>Active</span>');

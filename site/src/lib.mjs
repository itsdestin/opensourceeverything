// Shared helpers for building Open Source Everything's pages: loading the map data, links, small HTML pieces.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// WHY "/": the site has its own address, opensourceeverything.org (Destin registered it Oct 27). SITE_BASE is kept for
// building a copy that lives in a folder, e.g. itsdestin.github.io/opensourceeverything/ before the address works.
export const BASE = process.env.SITE_BASE ?? '/';
export const SITE_URL = process.env.SITE_URL ?? 'https://opensourceeverything.org/';
// WHY: voting, comments and suggestions need the server (built next). Until it exists, pages leave those
// controls out entirely rather than showing buttons that do nothing (YouCoded design rule).
export const API_URL = process.env.API_URL ?? '';
// WHY a switch: voting, notes and boards show only when there's a server to talk to. API_URL=demo builds the preview,
// which uses a pretend server in the browser (assets/fake-api.js) so the screens can be tried before the real one exists.
export const SOCIAL = !!API_URL;
export const DEMO = API_URL === 'demo';
export const SUBREDDIT = 'https://www.reddit.com/r/TrueOpenSource/';
export const REPO = 'https://github.com/itsdestin/opensourceeverything';

// A suggestion form on GitHub (.github/ISSUE_TEMPLATE/), with fields filled in from the page it's opened on.
// WHY prefilled: the visitor only writes what's new; the robot reads exact names it can match.
export const suggestUrl = (template, fields = {}) => `${REPO}/issues/new?template=${template}.yml${Object.entries(fields).map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join('')}`;
// The small copy of screenshot n (prefill/make-thumbs.mjs), or the project's original when none was made.
export const shot = (p, n = 0) => (p.thumbs?.[n] ? url(p.thumbs[n]) : p.screenshots?.[n]);
export const url = (path = '') => BASE + path.replace(/^\//, '');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtStars = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n));
export const KIND = { app: 'App', self_hosted: 'Runs on your own server', developer_tool: 'For developers', library: 'Code library' };
// WHY both forms: API-read hosts are stored as "github.com/owner/repo"; hand-added ones (GIMP, KDE) as full https links.
export const codeUrl = (p) => (p.code ? (/^https?:\/\//.test(p.code) ? p.code : `https://${p.code}`) : null);
export const hostOf = (p) => (p.code ? p.code.replace(/^https?:\/\//, '').split('/')[0] : null);

// The outside links a project gets, most useful first, worded so a visitor knows where each goes
// (Destin, Oct 27: an "Actions" menu with "View on GitHub", "View downloads"…). A GitHub release counts as
// downloads only for apps people install; for servers and developer tools it's "View latest release".
const HOST_NAME = { 'github.com': 'GitHub', 'gitlab.com': 'GitLab', 'codeberg.org': 'Codeberg' };
export function actions(p) {
  const l = [];
  const download = p.download ?? (p.release && p.kind === 'app' ? p.release : null);
  if (download) l.push({ label: 'View downloads', href: download });
  if (p.website) l.push({ label: 'Visit website', href: p.website });
  if (p.release && !download) l.push({ label: 'View latest release', href: p.release });
  if (codeUrl(p)) l.push({ label: HOST_NAME[hostOf(p)] ? `View on ${HOST_NAME[hostOf(p)]}` : 'View source code', href: codeUrl(p) });
  return l;
}

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

// Devices a project runs on, in plain words (from data/projects.json "platforms").
export const DEVICE = { windows: 'Windows', mac: 'Mac', linux: 'Linux', android: 'Android', ios: 'iPhone', web: 'In your browser' };
export const devicesText = (p) => (p.platforms ?? []).filter((x) => DEVICE[x]).map((x) => DEVICE[x]).join(' · ');

// Which section of licenses/ explains a license (licenses.mjs), from its SPDX name.
export const licenseAnchor = (spdx = '') => [[/AGPL/, 'agpl'], [/LGPL/, 'lgpl'], [/GPL/, 'gpl'], [/MPL/, 'mpl'], [/Apache/, 'apache'], [/MIT/, 'mit'], [/BSD/, 'bsd'], [/OSL/, 'osl'], [/EUPL/, 'eupl']].find(([re]) => re.test(spdx))?.[1] ?? '';

// The fact chips every listing shows, in one order everywhere (YouCoded's "one chip row" rule).
// With links (project pages), chips go somewhere useful; on cards they stay plain, because the whole card is a link.
export function factChips(p, alt, afterStars = '', { links = false } = {}) {
  const chip = (html, href, title) => (links && href
    ? `<a class="chip link" href="${esc(href)}"${/^https?:/.test(href) ? ' rel="noopener"' : ''}${title ? ` title="${esc(title)}"` : ''}>${html}</a>`
    : `<span class="chip"${title ? ` title="${esc(title)}"` : ''}>${html}</span>`);
  const gh = hostOf(p) === 'github.com' ? codeUrl(p) : null;
  // WHY GitHub stars first, as a bare number (Destin, Oct 27): the number people already know how to read; the star
  // says what it is. Projects hosted elsewhere (GIMP, LibreOffice) say so instead, so the first chip is never missing.
  const c = [];
  if (p.stars) c.push(chip(`${ICON.star}${fmtStars(p.stars)}`, gh, `${p.stars.toLocaleString('en')} stars on GitHub`));
  else if (hostOf(p) !== 'github.com') c.push(chip('Not on GitHub', codeUrl(p) ?? p.website, 'Its code lives on its own site'));
  // WHY the rating right after stars: our own community's answer to "a good replacement?" sits beside GitHub's popularity.
  c.push(afterStars);
  // WHY activity next, as a plain chip (Destin, Oct 27): the card's corner is for the Actions menu.
  c.push(chip(p.inactive ? 'Quiet for a year' : 'Active', gh && `${gh}/commits`, p.inactive ? 'No changes in over a year' : 'Changed within the last year: see its latest work'));
  // WHY right after activity (Destin, Oct 27): "does it run on my computer or phone?" is a newcomer's first question.
  // Server-only projects get no device chip; their "Runs on your own server" chip says it.
  const dl = p.download ?? (p.release && p.kind === 'app' ? p.release : null) ?? p.website;
  if (devicesText(p)) c.push(chip(esc(devicesText(p)), dl, 'Where to get it'));
  if (p.verified) c.push(chip(`${ICON.shield}Verified`, url('about/#verified'), 'r/TrueOpenSource mods vouch for it'));
  c.push(chip(esc(p.license ?? 'License being checked'), p.license && url(`licenses/#${licenseAnchor(p.license)}`), p.licenseNeedsCheck ? 'A mod is confirming this license' : 'What this license means'));
  if (p.licenseClass === 'open_core') c.push(chip('Open core', url('licenses/#open-core'), 'Open source, with some parts paid or under another license'));
  if (alt?.fit === 'partial') c.push(chip('Replaces partly', null, alt.note || 'Covers part of the job'));
  if (KIND[p.kind]) c.push(chip(esc(KIND[p.kind])));
  return c.join('');
}

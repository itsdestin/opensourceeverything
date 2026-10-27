// Who may do what, with no database or network: docs/server-rules.md → "Who can do what", as code.
// WHY its own file: these checks decide everyone's rights, so they're tested on their own (test/rules.test.js)
// and the pretend server (site/assets/fake-api.js) mirrors them line for line.

import { screenAll, screenLink, flagText } from '../../site/assets/filter.js';
export { screenAll, screenLink, flagText };

export const RULES = { minAgeDays: 14, confirmsNeeded: 3, popularVotes: 25 };
export const LIMITS = { title: 140, body: 4000, link: 500, reason: 500 };
const DAY = 24 * 3600e3;

export const ageDays = (user, now = Date.now()) => Math.floor((now - user.github_created) / DAY);
export const oldEnough = (user, now) => !!user && !user.banned && ageDays(user, now) >= RULES.minAgeDays;
// A new account's first post of any kind waits for a mod (Destin, Oct 27); approving one trusts the account.
export const holdsFirstPost = (user, now) => !user.trusted && ageDays(user, now) < RULES.minAgeDays;
export const isMod = (user, mods) => !!user && mods.includes(user.login.toLowerCase());

// `note` is a row with: kind, status, held, author_id, fixed_by, building_by, and `myReport` / `myConfirm` / `myVote` flags.
export function can(note, user, mods, now) {
  const signedIn = !!user && !user.banned;
  const mine = !!user && user.id === note.author_id;
  const open = note.status === 'open';
  return {
    vote: oldEnough(user, now) && note.kind !== 'talk' && !note.held && open,
    reply: signedIn && !note.held && open,
    edit: mine, delete: mine,
    claimFixed: signedIn && note.kind === 'missing' && open && !note.fixed_by,
    withdrawFixed: !!user && open && note.fixed_by === user.id,
    confirmFixed: oldEnough(user, now) && open && !!note.fixed_by && note.fixed_by !== user.id && !note.myConfirm,
    building: signedIn && note.kind === 'wish' && open && !note.building_by,
    removeBuilding: !!user && !!note.building_by && (note.building_by === user.id || mine || isMod(user, mods)),
    report: !!user && !mine && !note.myReport,
    close: isMod(user, mods),
  };
}

// What people type: trimmed, cut to size; links must be plain http(s) web addresses.
export const clean = (s, max) => String(s ?? '').trim().slice(0, max);
export const isLink = (s) => typeof s === 'string' && s.length <= LIMITS.link && /^https?:\/\/[^\s<>"]{3,}$/.test(s);
// A link someone submits on its own (a "fixed" or "I'm building this" link). WHY more than isLink: these show as a clickable
// link on a public note with no mod looking first, so shorteners, hidden passwords and look-alike sites are refused here.
// → { link } or { error: 'what to fix' }
export function cleanLink(s) {
  const link = clean(s, LIMITS.link);
  if (!isLink(link)) return { error: 'Add a link that starts with http:// or https://.' };
  const r = screenLink(link); return r.error ? { error: r.error } : { link };
}
// After sign-in, only ever send people back to the site itself (never to an address someone slipped in).
export const safeReturn = (url, siteOrigin) => {
  try { const u = new URL(url); return u.origin === siteOrigin ? u.href : `${siteOrigin}/`; } catch { return `${siteOrigin}/`; }
};

// ── Requests ("I want this too") ──
// A request is a gap group ("group:signing"), a closed app ("app:Procreate") or a suggestion still waiting on
// GitHub ("issue:123"). Anyone who may vote may add theirs; the same 14-day rule applies (oldEnough).
export const requestKind = (key) => (/^(group|app|issue):.{1,100}$/.test(String(key)) ? key.split(':')[0] : null);

// ── Tag my project ──
export const PROOF_FILE = '.opensourceeverything';
// WHY no "how it was built" label any more (Destin, redesign round 3: drop the AI tags entirely): a pitch is the description, the groups and the optional notes.
export const PITCH_LIMITS = { differs: 600, text: 1000, groups: 5 };
const HOSTS = ['github.com', 'gitlab.com', 'codeberg.org'];
// "https://github.com/Owner/Name/tree/main?x" → { host, owner, name, repo: "github.com/owner/name" }; null if it isn't a project page.
export function parseRepo(input) {
  let u; try { u = new URL(/^https?:\/\//i.test(String(input).trim()) ? String(input).trim() : `https://${String(input).trim()}`); } catch { return null; }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  if (!HOSTS.includes(host)) return null;
  const [owner, rawName] = u.pathname.split('/').filter(Boolean);
  const name = (rawName ?? '').replace(/\.git$/, '');
  // WHY "." and ".." are refused: they would walk the proof-file address up to a different page on the same site.
  if (!owner || !name || !/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(name) || /^\.+$/.test(owner) || /^\.+$/.test(name)) return null;
  return { host, owner, name, repo: `${host}/${owner}/${name}`.toLowerCase() };
}
// WHY this split (Destin, Oct 26): a repo under the person's own GitHub account is proof enough, because the server
// already knows who they are from GitHub's own sign-in. An organization's repo, or another website, needs a file only
// someone who controls the project could add.
export const proofFor = (user, r) => (r.host === 'github.com' && r.owner.toLowerCase() === user.login.toLowerCase() ? 'own-account' : 'file');
export const proofHas = (text, token) => String(text ?? '').split(/\s+/).includes(token);

// ── Claim safety (docs/server-rules.md → "Claiming a project") ──
export const CLAIM = { highStars: 10000, tokenHours: 48, proofDays: 180, maxClaims: 10 };
// "Verified", very popular, or on the hand-kept list (data/high-profile.json): the projects most worth impersonating.
// `hp` is the list the site build publishes in names.json; if it is missing (an old build) EVERY project counts as high-profile, so a
// mix-up between site and server versions makes things stricter, never looser.
export const isHighProfile = (N, project, stars) => !Array.isArray(N?.hp) || N.hp.includes(project) || (stars ?? 0) >= CLAIM.highStars;
// Decides, from GitHub's public answer about the repo, how a claim may be proven and what a mod must look at.
//   user  = the signed-in account;  r = parseRepo(link);  info = GitHub's /repos answer (null off GitHub);  ctx = { project, N }
// → { error, status } when nobody should be able to claim it, else { proof, needsConfirm, flags, org, stars, repoId }
// WHY needsConfirm: GitHub's public pages cannot tell us whether a person OWNS or ADMINISTERS an organization's repo (that needs
// the organization's own permission), and a file in a repo only proves the person can write to it. So a mod confirms those.
export function claimPlan(user, r, info, ctx) {
  const flags = [];
  if (r.host !== 'github.com') {
    flags.push('owner-unverified');
    if (isHighProfile(ctx.N, ctx.project, 0)) flags.push('high-profile');
    return { proof: 'file', needsConfirm: true, flags, org: false, stars: null, repoId: null };
  }
  if (!info?.owner?.login) return { error: "GitHub doesn't have a project at that link.", status: 404 };
  // A renamed or moved repo answers under its new name: the listing is out of date, so nobody claims it until a mod fixes the listing.
  if (String(info.full_name ?? '').toLowerCase() !== `${r.owner}/${r.name}`) return { error: 'That project has moved on GitHub. Ask a mod to update its listing first.', status: 409 };
  const stars = info.stargazers_count ?? 0;
  const org = info.owner.type !== 'User';
  const mine = !org && info.owner.login.toLowerCase() === user.login.toLowerCase();
  const proof = mine ? 'own-account' : 'file';
  if (!mine) flags.push('owner-unverified');
  if (info.fork) flags.push('fork');
  if (isHighProfile(ctx.N, ctx.project, stars)) flags.push('high-profile');
  // A repo with far fewer stars than the listing recorded is probably not the one the map means (e.g. re-created under a freed-up name).
  const listed = ctx.N?.stars?.[ctx.project];
  if (listed >= 50 && stars < listed / 2) flags.push('looks-different');
  return { proof, needsConfirm: proof === 'file' || flags.some((f) => ['fork', 'high-profile', 'looks-different'].includes(f)), flags, org, stars, repoId: info.id ?? null };
}
// Proof text is good for CLAIM.tokenHours, and only while the claim is unproven (a used text is replaced with 'used-…' and no expiry).
export const tokenUsable = (row, now = Date.now()) => !row.verified_at && !!row.token_expires && row.token_expires > now && !String(row.token).startsWith('used-');
export const newToken = () => `ose-${[...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('')}`;

// What a developer sends → what is stored. groupIds = the real group ids; "What does yours do differently?" is required.
export function cleanPitch(body, groupIds) {
  const groups = [...new Set(Array.isArray(body?.groups) ? body.groups : [])].filter((g) => groupIds.includes(g));
  if (!groups.length) return { error: 'Pick at least one group it belongs in.' };
  if (groups.length > PITCH_LIMITS.groups) return { error: `Pick up to ${PITCH_LIMITS.groups} groups.` };
  const differs = clean(body?.differs, PITCH_LIMITS.differs);
  if (!differs) return { error: 'Write a description.' };
  const t = (k) => clean(body?.[k], PITCH_LIMITS.text);
  const pitch = { groups, differs, strengths: t('strengths'), weaknesses: t('weaknesses'), reusable: t('reusable'), help: t('help') };
  // Every pitch already waits for a mod; the filter adds WHY a mod should look closely, and refuses links that can never be right.
  const f = screenAll(pitch.differs, pitch.strengths, pitch.weaknesses, pitch.reusable, pitch.help);
  if (f.error) return { error: f.error };
  return { pitch, flags: f.flags };
}

// ── Contributor preferences ("How you'd like help") ──
// WHY every value is checked against a fixed list: only the free text (a note, a policy sentence) and two links are open-ended, and those go through the same filter as a pitch.
// An answer that is not on its list is dropped, never stored. All of it is optional and changeable at any time.
export const PREFS = {
  ai: ['non-developers-welcome', 'traditional-developers-only', 'not-accepted', 'see-policy'], aiTicks: ['beginner', 'own-words', 'no-agents'],
  start: ['pr', 'issue', 'forum', 'email', 'closed'], wanted: ['code', 'design', 'docs', 'translation', 'testing', 'triage', 'co-maintainers', 'funding'],
  newcomers: ['help', 'self', 'experienced'], disclose: ['none', 'pr', 'form', 'commit'], sign: ['none', 'dco', 'cla'], review: ['days', 'weeks', 'month', 'hide'],
};
const prefLink = (l) => (isLink(l) || /^[^\s@<>"]{1,64}@[^\s@<>"]{1,120}$/.test(String(l ?? '')) ? String(l) : '');
export function cleanPrefs(body) {
  const one = (v, list) => (list.includes(v) ? v : '');
  const many = (v, list, max = 9) => [...new Set(Array.isArray(v) ? v : [])].filter((i) => list.includes(i)).slice(0, max);
  const c = {
    ai: one(body?.ai, PREFS.ai), aiPolicy: clean(body?.aiPolicy, 200), aiTicks: many(body?.aiTicks, PREFS.aiTicks),
    start: one(body?.start, PREFS.start), startLink: prefLink(body?.startLink), startSmall: !!body?.startSmall,
    wanted: many(body?.wanted, PREFS.wanted, 3), newcomers: one(body?.newcomers, PREFS.newcomers),
    disclose: many(body?.disclose, PREFS.disclose), sign: one(body?.sign, PREFS.sign), signLink: prefLink(body?.signLink),
    review: one(body?.review, PREFS.review), note: clean(body?.note, 200),
  };
  const f = screenAll(c.aiPolicy, c.note);
  if (f.error) return { error: f.error };
  if (f.flags.length) return { error: 'Please keep that note plain and without links; a mod would have to read it first.' };
  return { prefs: c };
}

// ── Your suggestions ──
// A suggestion's state, from its GitHub issue: waiting / needs a mod / approved / live / turned down.
// WHY from labels and close reason: the robot and the mods already record everything there; nothing new to keep in sync.
export function suggestionStatus(issue) {
  const labels = (issue.labels ?? []).map((l) => (typeof l === 'string' ? l : l.name));
  if (issue.state === 'closed') return issue.state_reason === 'completed' ? 'live' : 'turned-down';
  if (labels.includes('approved')) return 'approved';
  if (labels.includes('needs-mod')) return 'needs-mod';
  return 'waiting';
}
export const SUGGESTION_KINDS = ['add-project', 'fix', 'add-closed-app', 'new-group', 'report'];
export const suggestionKind = (issue) => (issue.labels ?? []).map((l) => (typeof l === 'string' ? l : l.name)).find((n) => SUGGESTION_KINDS.includes(n)) ?? null;
// "Closed app: Procreate" → "Procreate"
export const suggestionName = (issue) => String(issue.title ?? '').replace(/^(Closed app|New group|Add|Fix|Report)\s*:\s*/i, '').trim();

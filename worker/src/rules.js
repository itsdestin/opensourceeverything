// Who may do what, with no database or network: docs/server-rules.md → "Who can do what", as code.
// WHY its own file: these checks decide everyone's rights, so they're tested on their own (test/rules.test.js)
// and the pretend server (site/assets/fake-api.js) mirrors them line for line.

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
// After sign-in, only ever send people back to the site itself (never to an address someone slipped in).
export const safeReturn = (url, siteOrigin) => {
  try { const u = new URL(url); return u.origin === siteOrigin ? u.href : `${siteOrigin}/`; } catch { return `${siteOrigin}/`; }
};

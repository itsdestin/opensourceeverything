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

// ── Requests ("I want this too") ──
// A request is a gap group ("group:signing"), a closed app ("app:Procreate") or a suggestion still waiting on
// GitHub ("issue:123"). Anyone who may vote may add theirs; the same 14-day rule applies (oldEnough).
export const requestKind = (key) => (/^(group|app|issue):.{1,100}$/.test(String(key)) ? key.split(':')[0] : null);

// ── Tag my project ──
export const PROOF_FILE = '.opensourceeverything';
// The subreddit's four "how it was built" labels (trueopensource-bot/sub/rules.md rule 4).
export const BUILT = { 'hand-built': 'Hand-built', 'ai-assisted': 'AI-assisted', agentic: 'Agentic engineering', 'vibe-coded': 'Vibe-coded' };
export const PITCH_LIMITS = { differs: 600, text: 1000, groups: 5 };
const HOSTS = ['github.com', 'gitlab.com', 'codeberg.org'];
// "https://github.com/Owner/Name/tree/main?x" → { host, owner, name, repo: "github.com/owner/name" }; null if it isn't a project page.
export function parseRepo(input) {
  let u; try { u = new URL(/^https?:\/\//i.test(String(input).trim()) ? String(input).trim() : `https://${String(input).trim()}`); } catch { return null; }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  if (!HOSTS.includes(host)) return null;
  const [owner, rawName] = u.pathname.split('/').filter(Boolean);
  const name = (rawName ?? '').replace(/\.git$/, '');
  if (!owner || !name || !/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(name)) return null;
  return { host, owner, name, repo: `${host}/${owner}/${name}`.toLowerCase() };
}
// WHY this split (Destin, Oct 26): a repo under the person's own GitHub account is proof enough, because the server
// already knows who they are from GitHub's own sign-in. An organization's repo, or another website, needs a file only
// someone who controls the project could add.
export const proofFor = (user, r) => (r.host === 'github.com' && r.owner.toLowerCase() === user.login.toLowerCase() ? 'own-account' : 'file');
export const proofHas = (text, token) => String(text ?? '').split(/\s+/).includes(token);

// What a developer sends → what is stored. groupIds = the real group ids; "What does yours do differently?" is required.
export function cleanPitch(body, groupIds) {
  const groups = [...new Set(Array.isArray(body?.groups) ? body.groups : [])].filter((g) => groupIds.includes(g));
  if (!groups.length) return { error: 'Pick at least one group it belongs in.' };
  if (groups.length > PITCH_LIMITS.groups) return { error: `Pick up to ${PITCH_LIMITS.groups} groups.` };
  const differs = clean(body?.differs, PITCH_LIMITS.differs);
  if (!differs) return { error: 'Say what yours does differently. It is the part people read first.' };
  if (!BUILT[body?.built]) return { error: 'Say how it was built.' };
  const t = (k) => clean(body?.[k], PITCH_LIMITS.text);
  return { pitch: { groups, differs, strengths: t('strengths'), weaknesses: t('weaknesses'), reusable: t('reusable'), help: t('help'), built: body.built } };
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

// The Open Source Everything server (api.opensourceeverything.org): sign-in, ratings, notes, replies, mod tools.
// Every call and rule is listed in docs/server-rules.md; site/assets/fake-api.js is the same contract in the browser.
// The page never decides rights: each note goes out with a `can` list worked out here (rules.js).
import { RULES, LIMITS, ageDays, oldEnough, holdsFirstPost, isMod, can, clean, isLink, requestKind, parseRepo, proofFor, proofHas, cleanPitch, PROOF_FILE, BUILT, suggestionKind, suggestionName } from './rules.js';
import { openSuggestions, suggestionsBy, closingNote, suggestionView, proofFile, ghJson } from './github.js';
import { currentUser, login, callback, devLogin, logout } from './auth.js';

const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra } });
class Refuse extends Error { constructor(status, message) { super(message); this.status = status; } }
const need = (ok, status, message) => { if (!ok) throw new Refuse(status, message); };
const TOO_NEW = `GitHub accounts can vote once they're ${RULES.minAgeDays} days old.`;

// The map's names (jobs, projects), read from the site itself so notes can only point at things that exist.
let namesCache = { at: 0, data: null };
async function names(env) {
  if (!namesCache.data || Date.now() - namesCache.at > 10 * 60e3) {
    const r = await fetch(`${env.SITE_ORIGIN}/data/names.json`, { cf: { cacheTtl: 600 } });
    if (r.ok) namesCache = { at: Date.now(), data: await r.json() };
    else if (!namesCache.data) throw new Refuse(503, "Couldn't read the map right now. Try again in a minute.");
  }
  return namesCache.data;
}

// Limits on how fast anyone can act (docs/server-rules.md → Security), per account and per network address.
// pitch/proof: sending a pitch, and asking the server to look for a proof file (so it can't be used as a free web fetcher).
const LIMIT = { vote: [60, 60e3], post: [10, 3600e3], reply: [30, 3600e3], report: [20, 3600e3], pitch: [10, 3600e3], proof: [20, 3600e3] };
async function slowDown(env, req, user, what) {
  // WHY roomier in local testing: the test accounts are reused run after run (a developer's login must equal the project's owner).
  const [base, win] = LIMIT[what]; const max = env.DEV_LOGIN === '1' ? base * 100 : base; const bucket = Math.floor(Date.now() / win);
  // WHY no address limit in local testing: every test account shares one address there.
  const keys = [`u:${user.id}:${what}`]; if (env.DEV_LOGIN !== '1') keys.push(`ip:${req.headers.get('CF-Connecting-IP') ?? 'unknown'}:${what}`);
  for (const key of keys) {
    const r = await env.DB.prepare('INSERT INTO rate_limits (key, bucket, n) VALUES (?, ?, 1) ON CONFLICT(key, bucket) DO UPDATE SET n = n + 1 RETURNING n').bind(key, bucket).first();
    need(r.n <= max, 429, 'Slow down a little, then try again.');
  }
  if (Math.random() < 0.02) await env.DB.prepare('DELETE FROM rate_limits WHERE bucket < ?').bind(Math.floor(Date.now() / 3600e3) - 2).run();
}

// ── Notes as the page sees them ──
const NOTE_SQL = `SELECT n.*, a.login AS author,
    (SELECT COUNT(*) FROM votes v WHERE v.note_id = n.id) AS votes,
    (SELECT COUNT(*) FROM fixed_confirms c WHERE c.note_id = n.id) AS confirms,
    (SELECT login FROM users WHERE id = n.fixed_by) AS fixed_login,
    (SELECT login FROM users WHERE id = n.building_by) AS building_login,
    EXISTS (SELECT 1 FROM votes v WHERE v.note_id = n.id AND v.user_id = ?1) AS myVote,
    EXISTS (SELECT 1 FROM fixed_confirms c WHERE c.note_id = n.id AND c.user_id = ?1) AS myConfirm,
    EXISTS (SELECT 1 FROM reports r WHERE r.note_id = n.id AND r.user_id = ?1) AS myReport,
    (SELECT COUNT(*) FROM replies r WHERE r.note_id = n.id AND (r.held = 0 OR r.author_id = ?1 OR ?2)) AS replyCount
  FROM notes n JOIN users a ON a.id = n.author_id`;
// Held posts are seen only by their author and by mods.
const VISIBLE = '(n.held = 0 OR n.author_id = ?1 OR ?2)';
const view = (n, user, mods) => ({
  id: n.id, kind: n.kind, category: n.category, group: n.grp, projects: JSON.parse(n.projects), closedApps: JSON.parse(n.closed_apps),
  title: n.title, body: n.body, author: n.author, created: n.created, edited: n.edited, status: n.status, held: !!n.held,
  votes: n.votes, mine: !!n.myVote, replies: n.replyCount,
  fixed: n.fixed_by ? { by: n.fixed_login, link: n.fixed_link, confirms: n.confirms } : null,
  building: n.building_by ? { by: n.building_login, link: n.building_link } : null,
  can: can({ ...n, myConfirm: !!n.myConfirm, myReport: !!n.myReport }, user, mods),
});
const mods = (env) => env.MODS.toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
async function oneNote(env, id, user) {
  const n = await env.DB.prepare(`${NOTE_SQL} WHERE n.id = ?3 AND ${VISIBLE}`).bind(user?.id ?? 0, isMod(user, mods(env)) ? 1 : 0, Number(id)).first();
  need(n, 404, 'This note was removed, or it never existed.');
  return n;
}


// ── Requests and pitches: small helpers ──
const appSlug = (name) => name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// What a request key points at, or null if it isn't open for requests. Only gaps can be requested (a group nothing open
// fully replaces, or a closed app all of whose groups are gaps), and a "waiting suggestion" must still be open on GitHub.
async function requestInfo(env, N, key) {
  const kind = requestKind(key); if (!kind) return null; const v = key.slice(kind.length + 1);
  if (kind === 'group') { const g = N.groups[v]; return g?.gap ? { kind, name: g.n, href: `g/${v}/` } : null; }
  if (kind === 'app') {
    const gs = Object.values(N.groups).filter((g) => g.closed.includes(v));
    return gs.length && gs.every((g) => g.gap) ? { kind, name: v, href: `alternatives-to/${appSlug(v)}/` } : null;
  }
  try {
    const i = (await openSuggestions(env)).find((x) => `issue:${x.number}` === key && ['add-closed-app', 'new-group'].includes(suggestionKind(x)));
    return i ? { kind, name: suggestionName(i), url: i.html_url, number: i.number, type: suggestionKind(i), waiting: true } : null;
  } catch { return null; }
}
const pitchView = (x, owner, N, mine = false) => ({
  id: x.id, project: x.project, projectName: N.projects[x.project] ?? x.project, repo: x.repo, proof: x.proof, verified: !!x.verified_at, status: x.status, reason: x.reason,
  live: x.live ? JSON.parse(x.live) : null, pending: x.pending ? JSON.parse(x.pending) : null, updated: x.updated, by: owner,
  // The one-line file the project must contain, shown only until it is proven.
  ...(mine && !x.verified_at && x.proof === 'file' ? { proofFile: PROOF_FILE, proofText: x.token } : {}),
});

// ── The calls ──
async function route(req, env, url, user) {
  const p = url.pathname; const M = req.method; const MODS = mods(env); const mod = isMod(user, MODS);
  const body = M === 'GET' || M === 'DELETE' ? {} : await req.json().catch(() => ({}));
  const signedIn = () => { need(user, 401, 'Sign in first.'); need(!user.banned, 403, 'This account can no longer post or vote here.'); };
  const id = (p.match(/^\/notes\/(\d+)/) ?? [])[1];
  const note = id ? () => oneNote(env, id, user) : null;

  if (p === '/me' && M === 'GET') return { rules: RULES, user: user && { login: user.login, accountDays: ageDays(user), canVote: oldEnough(user), isMod: mod, banned: !!user.banned, firstPostHeld: holdsFirstPost(user) } };
  if (p === '/me' && M === 'DELETE') {
    signedIn(); // D1 enforces the tables' ON DELETE CASCADE: deleting an account removes its notes, replies, votes, ratings, reports and sessions (ON DELETE CASCADE)
    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run();
    return { ok: true };
  }

  // Ratings: one per person per project per job.
  if (p === '/ratings/query' && M === 'POST') {
    const pairs = (body.pairs ?? []).slice(0, 60).filter((x) => typeof x?.group === 'string' && typeof x?.project === 'string');
    const out = {};
    for (const { group, project } of pairs) {
      const r = await env.DB.prepare('SELECT SUM(value = 1) AS up, SUM(value = -1) AS down, MAX(CASE WHEN user_id = ? THEN value END) AS mine FROM ratings WHERE grp = ? AND project = ?').bind(user?.id ?? 0, group, project).first();
      out[`${group}/${project}`] = { up: r?.up ?? 0, down: r?.down ?? 0, mine: r?.mine ?? 0 };
    }
    return out;
  }
  if (p === '/ratings' && M === 'POST') {
    signedIn(); need(oldEnough(user), 403, TOO_NEW); need([1, -1, 0].includes(body.value), 400, 'Not a valid answer.');
    const N = await names(env); need(N.groups[body.group]?.alts.includes(body.project), 400, 'That project isn\'t listed in that job.');
    await slowDown(env, req, user, 'vote');
    await (body.value
      ? env.DB.prepare('INSERT INTO ratings (grp, project, user_id, value) VALUES (?, ?, ?, ?) ON CONFLICT DO UPDATE SET value = excluded.value').bind(body.group, body.project, user.id, body.value)
      : env.DB.prepare('DELETE FROM ratings WHERE grp = ? AND project = ? AND user_id = ?').bind(body.group, body.project, user.id)).run();
    return { ok: true };
  }

  // Notes: lists, counts, one note.
  if (p === '/notes' && M === 'GET') {
    const q = Object.fromEntries(url.searchParams);
    const where = [VISIBLE]; const args = [user?.id ?? 0, mod ? 1 : 0];
    const add = (sql, v) => { args.push(v); where.push(sql.replace('?', `?${args.length}`)); };
    if (q.category) add('n.category = ?', q.category);
    if (q.group) add('n.grp = ?', q.group);
    if (q.project) add('EXISTS (SELECT 1 FROM json_each(n.projects) WHERE value = ?)', q.project);
    if (['missing', 'wish', 'talk'].includes(q.kind)) add('n.kind = ?', q.kind);
    where.push(q.status === 'closed' ? "n.status != 'open'" : "n.status = 'open'");
    const limit = Math.min(Math.max(Number(q.limit) || 20, 1), 50); const offset = Math.max(Number(q.cursor) || 0, 0);
    const W = where.join(' AND ');
    const total = (await env.DB.prepare(`SELECT COUNT(*) AS c FROM notes n WHERE ${W}`).bind(...args).first()).c;
    const rows = (await env.DB.prepare(`${NOTE_SQL} WHERE ${W} ORDER BY ${q.sort === 'new' ? 'n.created DESC' : 'votes DESC, n.created DESC'} LIMIT ${limit} OFFSET ${offset}`).bind(...args).all()).results;
    return { items: rows.map((n) => view(n, user, MODS)), total, next: offset + limit < total ? String(offset + limit) : null };
  }
  if (p === '/counts' && M === 'GET') {
    const rows = (await env.DB.prepare("SELECT j.value AS project, COUNT(*) AS c FROM notes n, json_each(n.projects) j WHERE n.grp = ? AND n.kind = 'missing' AND n.status = 'open' AND n.held = 0 GROUP BY j.value").bind(url.searchParams.get('group') ?? '').all()).results;
    return Object.fromEntries(rows.map((r) => [r.project, r.c]));
  }
  if (p === '/notes' && M === 'POST') {
    signedIn(); await slowDown(env, req, user, 'post');
    const N = await names(env); const g = N.groups[body.group];
    need(['missing', 'wish', 'talk'].includes(body.kind), 400, 'Pick what kind of note it is.');
    need(g, 400, 'Pick which job it\'s about.');
    const projects = [...new Set(Array.isArray(body.projects) ? body.projects : [])].filter((x) => g.alts.includes(x));
    const closed = [...new Set(Array.isArray(body.closedApps) ? body.closedApps : [])].filter((x) => g.closed.includes(x));
    need(body.kind !== 'missing' || projects.length, 400, 'Pick the project, or projects, it applies to.');
    const title = clean(body.title, LIMITS.title); need(title, 400, 'Give it a short title.');
    const held = holdsFirstPost(user) ? 1 : 0;
    const r = await env.DB.prepare('INSERT INTO notes (kind, category, grp, projects, closed_apps, title, body, author_id, created, held) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id')
      .bind(body.kind, g.c, body.group, JSON.stringify(body.kind === 'missing' ? projects : []), JSON.stringify(closed), title, clean(body.body, LIMITS.body), user.id, Date.now(), held).first();
    // WHY the author's own vote: a missing feature or wish starts with the person who asked for it.
    if (body.kind !== 'talk' && oldEnough(user)) await env.DB.prepare('INSERT INTO votes (note_id, user_id) VALUES (?, ?)').bind(r.id, user.id).run();
    return view(await oneNote(env, r.id, user), user, MODS);
  }
  if (id && p === `/notes/${id}` && M === 'GET') {
    const n = await note();
    const replies = (await env.DB.prepare(`SELECT r.*, u.login AS author FROM replies r JOIN users u ON u.id = r.author_id WHERE r.note_id = ? AND (r.held = 0 OR r.author_id = ? OR ?) ORDER BY r.created`).bind(n.id, user?.id ?? 0, mod ? 1 : 0).all()).results;
    const reports = mod ? (await env.DB.prepare('SELECT reason FROM reports WHERE note_id = ?').bind(n.id).all()).results : undefined;
    return { ...view(n, user, MODS), replies: replies.map((r) => ({ id: r.id, author: r.author, body: r.body, created: r.created, edited: r.edited, held: !!r.held, can: { edit: r.author_id === user?.id, delete: r.author_id === user?.id } })), reports };
  }
  if (id && p === `/notes/${id}` && M === 'PATCH') {
    signedIn(); const n = await note(); need(n.author_id === user.id, 403, 'Only the person who wrote it can change it.');
    const title = clean(body.title, LIMITS.title); need(title, 400, 'Give it a short title.');
    await env.DB.prepare('UPDATE notes SET title = ?, body = ?, edited = ? WHERE id = ?').bind(title, clean(body.body, LIMITS.body), Date.now(), n.id).run();
    return view(await note(), user, MODS);
  }
  if (id && p === `/notes/${id}` && M === 'DELETE') {
    need(user, 401, 'Sign in first.'); const n = await note(); need(n.author_id === user.id, 403, 'Only the person who wrote it can delete it.');
    await env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(n.id).run();
    return { ok: true };
  }

  // Acting on a note.
  if (id && p === `/notes/${id}/vote` && M === 'POST') {
    signedIn(); const n = await note(); const c = can(n, user, MODS, Date.now());
    need(c.vote || (!body.on && n.myVote), 403, oldEnough(user) ? "This note can't take votes." : TOO_NEW);
    await slowDown(env, req, user, 'vote');
    await env.DB.prepare(body.on ? 'INSERT OR IGNORE INTO votes (note_id, user_id) VALUES (?, ?)' : 'DELETE FROM votes WHERE note_id = ? AND user_id = ?').bind(n.id, user.id).run();
    return view(await note(), user, MODS);
  }
  if (id && p === `/notes/${id}/replies` && M === 'POST') {
    signedIn(); const n = await note(); need(can(n, user, MODS).reply, 400, "This note can't take replies.");
    const text = clean(body.body, LIMITS.body); need(text, 400, 'Write something first.');
    await slowDown(env, req, user, 'reply');
    const held = holdsFirstPost(user) ? 1 : 0;
    await env.DB.prepare('INSERT INTO replies (note_id, author_id, body, created, held) VALUES (?, ?, ?, ?, ?)').bind(n.id, user.id, text, Date.now(), held).run();
    return { ok: true, held: !!held };
  }
  const rid = (p.match(/^\/notes\/\d+\/replies\/(\d+)$/) ?? [])[1];
  if (rid && (M === 'PATCH' || M === 'DELETE')) {
    need(user, 401, 'Sign in first.');
    const r = await env.DB.prepare('SELECT * FROM replies WHERE id = ? AND note_id = ?').bind(Number(rid), Number(id)).first();
    need(r && r.author_id === user.id, 403, `Only the person who wrote it can ${M === 'PATCH' ? 'change' : 'delete'} it.`);
    if (M === 'DELETE') await env.DB.prepare('DELETE FROM replies WHERE id = ?').bind(r.id).run();
    else { const text = clean(body.body, LIMITS.body); need(text, 400, 'Write something first.'); await env.DB.prepare('UPDATE replies SET body = ?, edited = ? WHERE id = ?').bind(text, Date.now(), r.id).run(); }
    return { ok: true };
  }
  if (id && p === `/notes/${id}/fixed`) {
    signedIn(); const n = await note(); const c = can(n, user, MODS);
    if (M === 'POST') { need(c.claimFixed, 400, 'Someone has already said this is fixed; confirm it instead.'); need(isLink(body.link), 400, 'Add a link that shows it, like the release notes.'); await env.DB.batch([env.DB.prepare('UPDATE notes SET fixed_by = ?, fixed_link = ? WHERE id = ?').bind(user.id, body.link, n.id), env.DB.prepare('DELETE FROM fixed_confirms WHERE note_id = ?').bind(n.id)]); }
    if (M === 'DELETE') { need(c.withdrawFixed, 403, 'Only the person who said it can take it back.'); await env.DB.batch([env.DB.prepare('UPDATE notes SET fixed_by = NULL, fixed_link = NULL WHERE id = ?').bind(n.id), env.DB.prepare('DELETE FROM fixed_confirms WHERE note_id = ?').bind(n.id)]); }
    return view(await note(), user, MODS);
  }
  if (id && p === `/notes/${id}/fixed/confirm` && M === 'POST') {
    signedIn(); const n = await note();
    need(n.fixed_by, 400, 'Nobody has said this is fixed yet.'); need(n.fixed_by !== user.id, 400, 'You said it, so other people confirm it.'); need(oldEnough(user), 403, TOO_NEW);
    await env.DB.prepare('INSERT OR IGNORE INTO fixed_confirms (note_id, user_id) VALUES (?, ?)').bind(n.id, user.id).run();
    const after = await note();
    // WHY several people: one person's word could be wrong or self-serving.
    if (after.confirms >= RULES.confirmsNeeded) await env.DB.prepare("UPDATE notes SET status = 'fixed' WHERE id = ?").bind(n.id).run();
    return view(await note(), user, MODS);
  }
  if (id && p === `/notes/${id}/building`) {
    signedIn(); const n = await note(); const c = can(n, user, MODS);
    if (M === 'POST') { need(c.building, 400, 'Someone already said they are building this.'); need(isLink(body.link), 400, 'Add a link to the project.'); await env.DB.prepare('UPDATE notes SET building_by = ?, building_link = ? WHERE id = ?').bind(user.id, body.link, n.id).run(); }
    if (M === 'DELETE') { need(c.removeBuilding, 403, 'Only they, the author or a mod can remove this.'); await env.DB.prepare('UPDATE notes SET building_by = NULL, building_link = NULL WHERE id = ?').bind(n.id).run(); }
    return view(await note(), user, MODS);
  }
  if (id && p === `/notes/${id}/report` && M === 'POST') {
    need(user, 401, 'Sign in first.'); const n = await note(); need(can(n, user, MODS).report, 400, "You've already reported this.");
    await slowDown(env, req, user, 'report');
    await env.DB.prepare('INSERT INTO reports (note_id, user_id, reason, created) VALUES (?, ?, ?, ?)').bind(n.id, user.id, clean(body.reason, LIMITS.reason), Date.now()).run();
    return { ok: true };
  }

  // Mods.
  if (id && p === `/notes/${id}/status` && M === 'POST') {
    need(mod, 403, 'Only mods can close or reopen notes.'); const n = await note();
    need(['open', 'fixed', 'wontfix', 'duplicate'].includes(body.status), 400, 'Not a valid status.');
    // Reopening clears an old "it's fixed" claim.
    await env.DB.batch(body.status === 'open'
      ? [env.DB.prepare("UPDATE notes SET status = 'open', fixed_by = NULL, fixed_link = NULL WHERE id = ?").bind(n.id), env.DB.prepare('DELETE FROM fixed_confirms WHERE note_id = ?').bind(n.id)]
      : [env.DB.prepare('UPDATE notes SET status = ? WHERE id = ?').bind(body.status, n.id)]);
    return view(await note(), user, MODS);
  }
  if (p === '/mod/queue' && M === 'GET') {
    need(mod, 403, 'Mods only.');
    const list = async (sql) => (await env.DB.prepare(`${NOTE_SQL} WHERE ${sql}`).bind(user.id, 1).all()).results.map((n) => view(n, user, MODS));
    const withReports = async (notes) => Promise.all(notes.map(async (n) => ({ ...n, reports: (await env.DB.prepare('SELECT reason FROM reports WHERE note_id = ?').bind(n.id).all()).results })));
    const heldReplies = (await env.DB.prepare('SELECT r.id, r.body, r.created, u.login AS author, n.id AS note_id, n.title AS note_title FROM replies r JOIN users u ON u.id = r.author_id JOIN notes n ON n.id = r.note_id WHERE r.held = 1 ORDER BY r.created').all()).results;
    return {
      held: await list('n.held = 1 ORDER BY n.created'),
      heldReplies: heldReplies.map((r) => ({ id: r.id, body: r.body, created: r.created, author: r.author, note: { id: r.note_id, title: r.note_title } })),
      reported: await withReports(await list('n.held = 0 AND EXISTS (SELECT 1 FROM reports r WHERE r.note_id = n.id)')),
      claims: await list("n.status = 'open' AND n.fixed_by IS NOT NULL"),
      // WHY not the ones above: a note shows in one section only.
      popular: await list(`n.kind = 'missing' AND n.status = 'open' AND n.fixed_by IS NULL AND n.keep_full = 0 AND (SELECT COUNT(*) FROM votes v WHERE v.note_id = n.id) >= ${RULES.popularVotes}`),
    };
  }
  if (p === '/mod/act' && M === 'POST') {
    need(mod, 403, 'Mods only.');
    const nid = Number(body.id); const rId = body.rid ? Number(body.rid) : null; const a = body.action; const DB = env.DB;
    const target = rId ? await DB.prepare('SELECT author_id FROM replies WHERE id = ? AND note_id = ?').bind(rId, nid).first() : await DB.prepare('SELECT author_id FROM notes WHERE id = ?').bind(nid).first();
    need(target, 404, 'That post is already gone.');
    const steps = {
      approve: rId ? [DB.prepare('UPDATE replies SET held = 0 WHERE id = ?').bind(rId)] : [DB.prepare('UPDATE notes SET held = 0 WHERE id = ?').bind(nid)],
      hide: rId ? [DB.prepare('DELETE FROM replies WHERE id = ?').bind(rId)] : [DB.prepare('DELETE FROM notes WHERE id = ?').bind(nid)],
      dismiss: [DB.prepare('DELETE FROM reports WHERE note_id = ?').bind(nid)],
      'reject-fix': [DB.prepare('UPDATE notes SET fixed_by = NULL, fixed_link = NULL WHERE id = ?').bind(nid), DB.prepare('DELETE FROM fixed_confirms WHERE note_id = ?').bind(nid)],
      keep: [DB.prepare('UPDATE notes SET keep_full = 1 WHERE id = ?').bind(nid)],
      partly: [DB.prepare('UPDATE notes SET keep_full = 1 WHERE id = ?').bind(nid)],
      // A ban also removes the account's posts that are still waiting for approval.
      ban: [DB.prepare('UPDATE users SET banned = 1 WHERE id = ?').bind(target.author_id), DB.prepare('DELETE FROM notes WHERE author_id = ? AND held = 1').bind(target.author_id), DB.prepare('DELETE FROM replies WHERE author_id = ? AND held = 1').bind(target.author_id), DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(target.author_id)],
    }[a];
    need(steps, 400, 'Not a valid action.');
    // Approving a first post trusts the account from then on.
    if (a === 'approve') steps.push(DB.prepare('UPDATE users SET trusted = 1 WHERE id = ?').bind(target.author_id));
    await DB.batch(steps);
    return { ok: true };
  }

  // ── "I want this too": requests for a closed app or group, ranked by votes ──
  if (p === '/requests' && M === 'GET') {
    const N = await names(env); const q = Object.fromEntries(url.searchParams);
    const rows = (await env.DB.prepare('SELECT key, COUNT(*) AS votes, MAX(user_id = ?) AS mine FROM request_votes GROUP BY key').bind(user?.id ?? 0).all()).results;
    const by = new Map(rows.map((r) => [r.key, r]));
    const item = async (key) => {
      const info = await requestInfo(env, N, key); if (!info) return null;
      return { key, ...info, votes: by.get(key)?.votes ?? 0, mine: !!by.get(key)?.mine };
    };
    if (q.keys) return { items: (await Promise.all(q.keys.split(',').slice(0, 20).map(item))).filter(Boolean), can: { vote: oldEnough(user) } };
    // Everything voted for, plus every suggestion still waiting on GitHub (they count even with no votes yet).
    const keys = new Set(rows.map((r) => r.key));
    try { for (const i of await openSuggestions(env)) if (['add-closed-app', 'new-group'].includes(suggestionKind(i))) keys.add(`issue:${i.number}`); } catch { /* GitHub busy: still show the voted ones */ }
    const items = (await Promise.all([...keys].map(item))).filter(Boolean)
      .sort((a, b) => b.votes - a.votes || (b.number ?? 0) - (a.number ?? 0));
    const limit = Math.min(Math.max(Number(q.limit) || 10, 1), 30);
    return { items: items.slice(0, limit), total: items.length, can: { vote: oldEnough(user) } };
  }
  if (p === '/requests/vote' && M === 'POST') {
    signedIn(); need(oldEnough(user), 403, TOO_NEW);
    need(requestKind(body.key), 400, 'Not something that can be requested.');
    need(await requestInfo(env, await names(env), body.key), 400, "That isn't open for requests.");
    await slowDown(env, req, user, 'vote');
    await (body.on ? env.DB.prepare('INSERT OR IGNORE INTO request_votes (key, user_id, created) VALUES (?, ?, ?)').bind(body.key, user.id, Date.now()) : env.DB.prepare('DELETE FROM request_votes WHERE key = ? AND user_id = ?').bind(body.key, user.id)).run();
    return { ok: true };
  }

  // ── Your suggestions: the person's own suggestion issues on GitHub, with where each one stands ──
  if (p === '/me/suggestions' && M === 'GET') {
    need(user, 401, 'Sign in first.');
    let issues; try { issues = await suggestionsBy(env, user.login); } catch { throw new Refuse(503, "Couldn't reach GitHub just now. Try again in a minute."); }
    let looked = 0;
    const items = [];
    for (const i of issues.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))) {
      const v = suggestionView(i);
      // WHY only the newest few: each closed one costs a GitHub call to read the live link or the reason.
      if ((v.status === 'live' || v.status === 'turned-down') && looked < 8) { looked++; try { const n = await closingNote(env, i.number, env.SITE_ORIGIN); Object.assign(v, v.status === 'live' ? { liveUrl: n.live } : { reason: n.reason }); } catch { /* shown without it */ } }
      items.push(v);
    }
    return { items };
  }

  // ── Tag my project (docs/server-rules.md → "Tag my project") ──
  if (p === '/pitches/start' && M === 'POST') {
    signedIn(); await slowDown(env, req, user, 'pitch');
    const r = parseRepo(body.url); need(r, 400, 'Paste the link to its code page on GitHub, GitLab or Codeberg.');
    const N = await names(env); const project = N.codes?.[r.repo];
    // Not on the map yet: the page sends them to the "Add a project" form instead; there is nothing to prove yet.
    if (!project) return { listed: false, repo: r.repo, name: r.name };
    const proof = proofFor(user, r);
    let row = await env.DB.prepare('SELECT * FROM pitches WHERE user_id = ? AND repo = ?').bind(user.id, r.repo).first();
    if (!row) {
      let verified = null;
      if (proof === 'own-account') {
        // The public API confirms the project is really under their account (not just a similar name).
        let info; try { info = await ghJson(env, `/repos/${r.owner}/${r.name}`, 60e3); } catch (e) { throw new Refuse(e.github === 404 ? 404 : 503, e.github === 404 ? "GitHub doesn't have a project at that link." : "Couldn't reach GitHub just now. Try again in a minute."); }
        need(String(info.owner?.login).toLowerCase() === user.login.toLowerCase(), 403, 'That project is not under your GitHub account.');
        verified = Date.now();
      }
      const token = `ose-${[...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
      row = await env.DB.prepare('INSERT INTO pitches (user_id, repo, project, proof, token, verified_at, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *').bind(user.id, r.repo, project, proof, token, verified, Date.now(), Date.now()).first();
    }
    return { listed: true, pitch: pitchView(row, user.login, N, true) };
  }
  if (p === '/pitches/mine' && M === 'GET') {
    need(user, 401, 'Sign in first.'); const N = await names(env);
    return { items: (await env.DB.prepare('SELECT * FROM pitches WHERE user_id = ? ORDER BY updated DESC').bind(user.id).all()).results.map((x) => pitchView(x, user.login, N, true)) };
  }
  // Approved pitches for project cards and pages. Public: only approved text, and only while ownership still stands.
  if (p === '/pitches/live' && M === 'GET') {
    const ids = (url.searchParams.get('projects') ?? '').split(',').filter(Boolean).slice(0, 60);
    const out = {};
    for (const id of ids) {
      const row = await env.DB.prepare('SELECT p.*, u.login AS owner FROM pitches p JOIN users u ON u.id = p.user_id WHERE p.project = ? AND p.live IS NOT NULL AND p.verified_at IS NOT NULL ORDER BY p.updated DESC LIMIT 1').bind(id).first();
      if (row) out[id] = { by: row.owner, repo: row.repo, ...JSON.parse(row.live), updated: row.updated };
    }
    return out;
  }
  const pid = (p.match(/^\/pitches\/(\d+)/) ?? [])[1];
  if (pid) {
    signedIn(); const N = await names(env);
    const row = await env.DB.prepare('SELECT * FROM pitches WHERE id = ? AND user_id = ?').bind(Number(pid), user.id).first();
    need(row, 404, "That isn't one of your projects.");
    const r = parseRepo(row.repo);
    if (p === `/pitches/${pid}/verify` && M === 'POST') {
      await slowDown(env, req, user, 'proof');
      if (!row.verified_at) {
        let text; try { text = await proofFile(env, r, PROOF_FILE); } catch { throw new Refuse(503, "Couldn't reach that site just now. Try again in a minute."); }
        need(proofHas(text, row.token), 400, `We didn't find ${PROOF_FILE} with the right text in that project yet. Add it to the project's main page (the top folder), then check again.`);
        await env.DB.prepare('UPDATE pitches SET verified_at = ?, updated = ? WHERE id = ?').bind(Date.now(), Date.now(), row.id).run();
      }
      return pitchView(await env.DB.prepare('SELECT * FROM pitches WHERE id = ?').bind(row.id).first(), user.login, N, true);
    }
    if (p === `/pitches/${pid}` && M === 'PUT') {
      need(row.verified_at, 403, 'Prove the project is yours first.');
      const c = cleanPitch(body, Object.keys(N.groups)); need(!c.error, 400, c.error);
      await slowDown(env, req, user, 'pitch');
      // WHY back to waiting on every edit: nothing a developer writes goes public until a mod has read it.
      await env.DB.prepare("UPDATE pitches SET pending = ?, status = 'pending', reason = NULL, updated = ? WHERE id = ?").bind(JSON.stringify(c.pitch), Date.now(), row.id).run();
      return pitchView(await env.DB.prepare('SELECT * FROM pitches WHERE id = ?').bind(row.id).first(), user.login, N, true);
    }
    if (p === `/pitches/${pid}` && M === 'DELETE') { await env.DB.prepare('DELETE FROM pitches WHERE id = ?').bind(row.id).run(); return { ok: true }; }
  }
  if (p === '/mod/pitches' && M === 'GET') {
    need(mod, 403, 'Mods only.'); const N = await names(env);
    const rows = (await env.DB.prepare("SELECT p.*, u.login AS owner FROM pitches p JOIN users u ON u.id = p.user_id WHERE p.pending IS NOT NULL ORDER BY p.updated").all()).results;
    return { items: rows.map((x) => ({ ...pitchView(x, x.owner, N), owner: x.owner })) };
  }
  const mpid = (p.match(/^\/mod\/pitches\/(\d+)$/) ?? [])[1];
  if (mpid && M === 'POST') {
    need(mod, 403, 'Mods only.');
    const row = await env.DB.prepare('SELECT * FROM pitches WHERE id = ?').bind(Number(mpid)).first();
    need(row?.pending, 404, 'Nothing waiting there.');
    if (body.action === 'approve') await env.DB.prepare("UPDATE pitches SET live = pending, pending = NULL, status = 'live', reason = NULL, updated = ? WHERE id = ?").bind(Date.now(), row.id).run();
    else if (body.action === 'reject') await env.DB.prepare("UPDATE pitches SET pending = NULL, status = CASE WHEN live IS NULL THEN 'turned-down' ELSE 'live' END, reason = ?, updated = ? WHERE id = ?").bind(clean(body.reason, LIMITS.reason) || null, Date.now(), row.id).run();
    else need(false, 400, 'Not a valid action.');
    return { ok: true };
  }
  if (p === '/mod/suggestions' && M === 'GET') {
    need(mod, 403, 'Mods only.');
    let issues; try { issues = await openSuggestions(env); } catch { throw new Refuse(503, "Couldn't reach GitHub just now. Try again in a minute."); }
    const votes = new Map((await env.DB.prepare("SELECT key, COUNT(*) AS n FROM request_votes WHERE key LIKE 'issue:%' GROUP BY key").all()).results.map((r) => [r.key, r.n]));
    // Oldest first: the one that has waited longest is at the top.
    return { items: issues.sort((a, b) => a.number - b.number).map((i) => suggestionView(i, { votes: votes.get(`issue:${i.number}`) ?? 0, verdict: (i.labels ?? []).some((l) => (l.name ?? l) === 'needs-mod') ? 'needs-mod' : (i.labels ?? []).some((l) => (l.name ?? l) === 'robot-ok') ? 'ok' : 'unchecked' })) };
  }
  throw new Refuse(404, 'Not found.');
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url); const origin = req.headers.get('Origin');
    // CORS: only the site itself may call this server with someone's sign-in.
    const cors = { 'Access-Control-Allow-Origin': env.SITE_ORIGIN, 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE', 'Access-Control-Allow-Headers': 'Content-Type, X-OSE', 'Access-Control-Max-Age': '86400' } });
    try {
      if (url.pathname === '/auth/login') return login(url, env);
      if (url.pathname === '/auth/callback') return callback(url, env);
      if (url.pathname === '/auth/dev-login') return devLogin(url, env);
      // WHY both checks on every change: other websites can't make a signed-in visitor's browser vote or post.
      if (req.method !== 'GET') { need(origin === env.SITE_ORIGIN && req.headers.get('X-OSE') === '1', 403, 'Requests must come from the site itself.'); }
      if (url.pathname === '/auth/logout' && req.method === 'POST') { const { cookie } = await logout(req, env); return json({ ok: true }, 200, { ...cors, 'Set-Cookie': cookie }); }
      const user = await currentUser(req, env);
      return json(await route(req, env, url, user), 200, cors);
    } catch (e) {
      if (e instanceof Refuse) return json({ error: e.message }, e.status, cors);
      console.error(e);
      return json({ error: 'Something went wrong on our side. Try again in a minute.' }, 500, cors);
    }
  },
};

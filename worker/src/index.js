// The Open Source Everything server (api.opensourceeverything.org): sign-in, ratings, notes, replies, mod tools.
// Every call and rule is listed in docs/server-rules.md; site/assets/fake-api.js is the same contract in the browser.
// The page never decides rights: each note goes out with a `can` list worked out here (rules.js).
import { RULES, LIMITS, ageDays, oldEnough, holdsFirstPost, isMod, can, clean, isLink } from './rules.js';
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
const LIMIT = { vote: [60, 60e3], post: [10, 3600e3], reply: [30, 3600e3], report: [20, 3600e3] };
async function slowDown(env, req, user, what) {
  const [max, win] = LIMIT[what]; const bucket = Math.floor(Date.now() / win);
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

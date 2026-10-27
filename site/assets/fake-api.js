// A pretend server for previewing voting, notes and boards before the real one exists (built with API_URL=demo).
// It obeys docs/server-rules.md exactly, so it doubles as the blueprint the real server (Cloudflare) must match:
// same calls, same answers, same rules. Everything is kept in this browser only and starts from sample posts.
(function () {
  const KEY = 'ose-demo-v3';
  const RULES = { minAgeDays: 14, confirmsNeeded: 3, popularVotes: 25 };
  const now = Date.now(), H = 3600e3, D = 24 * H;
  const u = (login, days = 400) => ({ login, created: now - days * D, trusted: days >= 14 });
  const seed = () => ({
    me: null, nextId: 100, banned: [], mods: ['itsdestin'],
    users: Object.fromEntries(['erin', 'gus', 'hana', 'ivan', 'jo', 'kim', 'lee'].map((n) => [`${n}-sample`, u(`${n}-sample`)]).concat([['newbie-sample', u('newbie-sample', 3)]])),
    ratings: {}, // "group/project" → { login: 1 | -1 }
    // "I want this too": key → voters, plus made-up extra votes so the preview has a ranking (docs/server-rules.md → Requests)
    reqVoters: {}, reqExtra: { 'group:music': 88, 'group:graphic-design': 64, 'app:LinkedIn': 41, 'group:pro-network': 31, 'group:search': 17, 'issue:201': 23, 'issue:203': 9, 'group:icons': 6 },
    // The pretend GitHub: suggestion issues. state/reason/labels work like the real ones; `robot` is the robot's verdict label.
    issues: sampleIssues(),
    // "Tag my project": a developer's pitch per listed project (live = approved, pending = waiting for a mod)
    pitches: samplePitches(),
    notes: sampleNotes().map((n) => ({ voters: [], extraVotes: 0, status: 'open', replies: [], reports: [], body: '', ...n })),
  });
  const day = (n) => now - n * D;
  function sampleIssues() {
    const mk = (number, name, kind, author, days, extra = {}) => ({ number, name, kind, author, created: day(days), state: 'open', labels: [], ...extra });
    const mine = (who) => [
      mk(210 + who.length, 'Zorblax Draw', 'add-closed-app', who, 1, {}),
      mk(220 + who.length, 'Notability', 'add-closed-app', who, 3, { labels: ['needs-mod'] }),
      mk(230 + who.length, 'Linear', 'add-closed-app', who, 6, { labels: ['approved'] }),
      mk(240 + who.length, 'Procreate', 'add-closed-app', who, 20, { state: 'closed', reason: 'completed', live: '/alternatives-to/procreate/' }),
      mk(250 + who.length, 'Habit tracking', 'new-group', who, 30, { state: 'closed', reason: 'not_planned', why: 'Habit tracking is already part of the group "Task management"; add the closed apps there instead.' }),
    ];
    return [
      mk(201, 'Notion Calendar', 'add-closed-app', 'erin-sample', 9, { labels: ['robot-ok'] }), mk(202, 'Cleanshot', 'add-closed-app', 'newbie-sample', 2, { labels: ['needs-mod'] }),
      mk(203, 'Podcast hosting', 'new-group', 'gus-sample', 5, { labels: ['robot-ok'] }), mk(204, 'Add: Zorblax (project)', 'add-project', 'hana-sample', 4, { labels: ['robot-ok'] }),
      ...mine('you-sample'), ...mine('member-sample'),
    ];
  }
  function samplePitches() {
    return [
      { id: 1, owner: 'penpot-team-sample', project: 'penpot', repo: 'github.com/penpot/penpot', proof: 'file', token: 'ose-sample', verified: true, status: 'live', updated: day(8),
        live: { groups: ['graphic-design'], differs: 'It works the way designers do, in a browser, and the design files are open code, so developers can build from the same source.', strengths: 'Real-time teamwork. Runs in a browser, or on your own server.', weaknesses: 'Fewer plugins than Figma. Large files can feel slow.', reusable: 'The plugin system, and the exporter that turns designs into code.', help: 'Plugin authors, and translators for the interface.', built: 'hand-built' } },
      { id: 2, owner: 'inkscape-sample', project: 'inkscape', repo: 'gitlab.com/inkscape/inkscape', proof: 'file', token: 'ose-sample2', verified: true, status: 'pending', updated: day(0.1), pending: { groups: ['vector-graphics'], differs: 'A drawing program that saves its files in an open web format, so other programs can read them.', strengths: 'Precise drawing tools.', weaknesses: 'Less polished for page layout.', reusable: 'The path math library.', help: 'Documentation writers.', built: 'ai-assisted' }, live: null },
    ];
  }
  function sampleNotes() {
    return [
      { id: 1, kind: 'missing', category: 'office', group: 'documents', projects: ['libreoffice-writer', 'onlyoffice-docs'], closedApps: ['Google Docs', 'Microsoft Word'], title: 'No live co-editing: two people can\'t type in one document', body: 'Collabora and OnlyOffice can do it in a browser, but they need a server. See https://www.collaboraonline.com for one.', author: 'erin-sample', created: now - 30 * D, voters: ['gus-sample', 'hana-sample', 'ivan-sample', 'jo-sample', 'kim-sample'], extraVotes: 43, replies: [{ id: 1, author: 'gus-sample', body: 'This is the one thing that keeps my team on Google Docs.', created: now - 20 * D }] },
      { id: 2, kind: 'missing', category: 'office', group: 'documents', projects: ['onlyoffice-docs'], closedApps: ['Microsoft Word'], title: 'Tracked changes break after a round trip through Word', author: 'gus-sample', created: now - 9 * D, voters: ['erin-sample'], extraVotes: 28 },
      { id: 3, kind: 'wish', category: 'office', group: 'documents', projects: [], closedApps: [], title: 'A phone app that edits documents, not just views them', body: 'Every open option either only views on phones or needs a server.', author: 'hana-sample', created: now - 4 * D, extraVotes: 12 },
      { id: 4, kind: 'missing', category: 'office', group: 'documents', projects: ['cryptpad'], closedApps: [], title: 'Exporting to .docx loses tables', author: 'ivan-sample', created: now - 60 * D, extraVotes: 9, status: 'fixed', replies: [{ id: 2, author: 'kim-sample', body: 'Fixed in the latest release, works for me.', created: now - 3 * D }] },
      { id: 5, kind: 'missing', category: 'office', group: 'notes', projects: ['logseq'], closedApps: ['Notion'], title: 'No shared workspaces for a team', author: 'jo-sample', created: now - 14 * D, extraVotes: 31, fixed: { by: 'lee-sample', link: 'https://github.com/logseq/logseq/releases', confirms: ['kim-sample'] } },
      { id: 6, kind: 'wish', category: 'office', group: 'notes', projects: [], closedApps: ['Notion'], title: 'Notion-style databases that sync without a server', author: 'kim-sample', created: now - 2 * D, extraVotes: 22, building: { by: 'lee-sample', link: 'https://github.com/example/example' } },
      { id: 7, kind: 'talk', category: 'office', group: 'documents', projects: [], closedApps: ['Microsoft Word'], title: 'Which one do you use with people who only have Word?', body: 'Curious what works best when everyone else sends .docx files.', author: 'lee-sample', created: now - 6 * H, replies: [{ id: 3, author: 'erin-sample', body: 'OnlyOffice. Its files look the same in Word.', created: now - 2 * H }, { id: 4, author: 'newbie-sample', body: 'Try LibreOffice with the "Word" toolbar layout.', created: now - 1 * H, held: true }] },
      { id: 8, kind: 'missing', category: 'creative', group: 'photo-editing', projects: ['gimp'], closedApps: ['Adobe Photoshop'], title: 'No generative fill', author: 'hana-sample', created: now - 11 * D, extraVotes: 37 },
      { id: 9, kind: 'wish', category: 'creative', group: 'graphic-design', projects: [], closedApps: ['Canva'], title: 'A template library like Canva\'s', body: 'Penpot is great for screens, but nothing has ready-made posters and social posts.', author: 'erin-sample', created: now - 21 * D, extraVotes: 64 },
      { id: 10, kind: 'missing', category: 'creative', group: 'graphic-design', projects: ['penpot'], closedApps: ['Canva'], title: 'No one-click resize for every social network', author: 'newbie-sample', created: now - 1 * H, held: true },
      { id: 11, kind: 'wish', category: 'media', group: 'music', projects: [], closedApps: ['Spotify'], title: 'A music service with a real catalog, not just your own files', author: 'ivan-sample', created: now - 40 * D, extraVotes: 88, reports: [{ by: 'jo-sample', reason: 'Not something software alone can fix (it needs music licenses).' }] },
    ];
  }
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { return seed(); } };
  let S = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* preview only */ } };
  // Preview shortcut: ?preview-as=member | new | mod signs in as that kind of user, to try each state quickly.
  const as = new URLSearchParams(location.search).get('preview-as');
  if (as) { const login = `${as}-sample`; S.users[login] ??= u(login, as === 'new' ? 3 : 400); S.me = login; S.mods = S.mods.filter((m) => m === 'itsdestin').concat(as === 'mod' ? [login] : []); save(); }

  // ── Who someone is, and what they may do (docs/server-rules.md → "Who can do what") ──
  const me = () => (S.me ? S.users[S.me] : null);
  const ageDays = (x) => Math.floor((now - x.created) / D);
  const isMod = (x) => !!x && S.mods.includes(x.login);
  const banned = (x) => !!x && S.banned.includes(x.login);
  const oldEnough = (x) => !!x && ageDays(x) >= RULES.minAgeDays && !banned(x);
  const isOpen = (n) => n.status === 'open';
  const heldFor = (x) => !x.trusted && ageDays(x) < RULES.minAgeDays; // first post of any kind waits for a mod
  const sees = (item, x) => !item.held || (x && (x.login === item.author || isMod(x)));
  function can(n, x) {
    const mine = !!x && x.login === n.author;
    return {
      vote: oldEnough(x) && n.kind !== 'talk' && !n.held && isOpen(n),
      reply: !!x && !banned(x) && !n.held && isOpen(n),
      edit: mine, delete: mine,
      claimFixed: !!x && !banned(x) && n.kind === 'missing' && isOpen(n) && !n.fixed,
      withdrawFixed: !!x && n.fixed?.by === x.login && isOpen(n),
      confirmFixed: oldEnough(x) && !!n.fixed && n.fixed.by !== x.login && !n.fixed.confirms.includes(x.login) && isOpen(n),
      building: !!x && !banned(x) && n.kind === 'wish' && isOpen(n) && !n.building,
      removeBuilding: !!n.building && !!x && (n.building.by === x.login || mine || isMod(x)),
      report: !!x && !mine && !n.reports.some((r) => r.by === x.login),
      close: isMod(x),
    };
  }
  const view = (n) => {
    const x = me();
    return { id: n.id, kind: n.kind, category: n.category, group: n.group, projects: n.projects, closedApps: n.closedApps, title: n.title, body: n.body,
      author: n.author, created: n.created, edited: n.edited ?? null, status: n.status, held: !!n.held,
      votes: n.voters.length + n.extraVotes, mine: !!x && n.voters.includes(x.login),
      replies: n.replies.filter((r) => sees(r, x)).length,
      fixed: n.fixed ? { by: n.fixed.by, link: n.fixed.link, confirms: n.fixed.confirms.length } : null,
      building: n.building ?? null, can: can(n, x) };
  };
  const BUILT = { 'hand-built': 'Hand-built', 'ai-assisted': 'AI-assisted', agentic: 'Agentic engineering', 'vibe-coded': 'Vibe-coded' };
  // Same link reading as the server (worker/src/rules.js parseRepo).
  function parseRepo(input) {
    let u; try { u = new URL(/^https?:\/\//i.test(String(input).trim()) ? String(input).trim() : `https://${String(input).trim()}`); } catch { return null; }
    const host = u.hostname.replace(/^www\./, '').toLowerCase(); if (!['github.com', 'gitlab.com', 'codeberg.org'].includes(host)) return null;
    const [owner, raw] = u.pathname.split('/').filter(Boolean); const name = (raw ?? '').replace(/\.git$/, '');
    if (!owner || !name || !/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(name)) return null;
    return { host, owner, name, repo: `${host}/${owner}/${name}`.toLowerCase() };
  }
  let namesP = null; const names = () => namesP || (namesP = fetch((window.OI?.base || '/') + 'data/names.json').then((r) => r.json()));
  async function pitchView(p, mine) {
    const N = await names();
    return { id: p.id, project: p.project, projectName: N.projects[p.project] ?? p.project, repo: p.repo, proof: p.proof, verified: !!p.verified, status: p.status, reason: p.reason ?? null, live: p.live ?? null, pending: p.pending ?? null, updated: p.updated, by: p.owner,
      ...(mine && !p.verified && p.proof === 'file' ? { proofFile: '.opensourceeverything', proofText: p.token } : {}) };
  }
  const delay = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 120));
  const fail = (status, message) => Promise.reject(Object.assign(new Error(message), { status }));
  const find = (id) => S.notes.find((n) => n.id === +id && sees(n, me()));
  const link = (l) => (/^https?:\/\/[^\s]{3,500}$/.test(l ?? '') ? l : null);
  // Every check below mirrors one row of the rules table; a refusal says what the person can do instead.
  const guard = (ok, status, msg) => (ok ? null : fail(status, msg));
  const NEED_SIGNIN = [401, 'Sign in first.'];
  const TOO_NEW = () => [403, `GitHub accounts can vote once they're ${RULES.minAgeDays} days old.`];

  const api = {
    demo: true,
    async me() {
      const x = me();
      return delay({ rules: RULES, user: x && { login: x.login, accountDays: ageDays(x), canVote: oldEnough(x), isMod: isMod(x), banned: banned(x), firstPostHeld: heldFor(x) } });
    },
    async signIn(login = 'you-sample', days = 400) { S.users[login] ??= u(login, days); S.me = login; save(); return api.me(); },
    async signOut() { S.me = null; save(); return delay({ ok: true }); },
    async reset() { S = seed(); save(); return delay({ ok: true }); },
    async deleteAccount() {
      const x = me(); if (!x) return fail(...NEED_SIGNIN);
      S.notes = S.notes.filter((n) => n.author !== x.login);
      for (const n of S.notes) { n.voters = n.voters.filter((v) => v !== x.login); n.replies = n.replies.filter((r) => r.author !== x.login); n.reports = n.reports.filter((r) => r.by !== x.login); if (n.fixed) n.fixed.confirms = n.fixed.confirms.filter((c) => c !== x.login); }
      for (const g of Object.values(S.ratings)) delete g[x.login];
      S.pitches = S.pitches.filter((p) => p.owner !== x.login); for (const k of Object.keys(S.reqVoters)) S.reqVoters[k] = S.reqVoters[k].filter((v) => v !== x.login);
      delete S.users[x.login]; S.me = null; save(); return delay({ ok: true });
    },

    // ── Ratings: one per person per project per job ──
    async ratings(pairs) {
      const x = me(); const out = {};
      for (const { group, project } of pairs) {
        const k = `${group}/${project}`; const v = Object.values(S.ratings[k] ?? {});
        // WHY steady made-up counts: so the preview shows scores; real ratings start at zero.
        let h = 7; for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0;
        out[k] = { up: v.filter((r) => r > 0).length + (h % 40) + 2, down: v.filter((r) => r < 0).length + ((h >>> 8) % 9), mine: x ? (S.ratings[k]?.[x.login] ?? 0) : 0 };
      }
      return delay(out);
    },
    async rate(group, project, value) {
      const x = me(); return guard(x, ...NEED_SIGNIN) ?? guard(oldEnough(x), ...TOO_NEW()) ?? guard([1, -1, 0].includes(value), 400, 'Not a valid answer.') ?? (() => {
        const r = (S.ratings[`${group}/${project}`] ??= {}); if (value) r[x.login] = value; else delete r[x.login]; save(); return delay({ ok: true });
      })();
    },

    // ── Notes ──
    async notes(q = {}) {
      const x = me();
      let list = S.notes.filter((n) => sees(n, x)).filter((n) =>
        (!q.category || n.category === q.category) && (!q.group || n.group === q.group) && (!q.project || n.projects.includes(q.project)) &&
        (!q.kind || n.kind === q.kind) && ((q.status ?? 'open') === 'open' ? isOpen(n) : !isOpen(n))).map(view);
      list.sort(q.sort === 'new' ? (a, b) => b.created - a.created : (a, b) => b.votes - a.votes || b.created - a.created);
      const start = +(q.cursor ?? 0), limit = Math.min(+(q.limit ?? 20), 50);
      return delay({ items: list.slice(start, start + limit), total: list.length, next: start + limit < list.length ? String(start + limit) : null });
    },
    async counts(group) {
      const out = {};
      for (const n of S.notes) if (n.group === group && n.kind === 'missing' && isOpen(n) && !n.held) for (const p of n.projects) out[p] = (out[p] ?? 0) + 1;
      return delay(out);
    },
    async note(id) {
      const n = find(id); if (!n) return fail(404, 'This note was removed, or it never existed.');
      const x = me();
      return delay({ ...view(n), replies: n.replies.filter((r) => sees(r, x)).map((r) => ({ ...r, can: { edit: x?.login === r.author, delete: x?.login === r.author } })),
        reports: isMod(x) ? n.reports : undefined });
    },
    async addNote(n) {
      const x = me();
      return guard(x, ...NEED_SIGNIN) ?? guard(!banned(x), 403, 'This account can no longer post here.') ?? guard(n.title?.trim(), 400, 'Give it a short title.')
        ?? guard(n.kind !== 'missing' || n.projects?.length, 400, 'Pick the project, or projects, it applies to.') ?? (() => {
          const note = { id: S.nextId++, kind: n.kind, category: n.category, group: n.group, projects: n.projects ?? [], closedApps: n.closedApps ?? [],
            title: n.title.trim().slice(0, 140), body: (n.body ?? '').trim().slice(0, 4000), author: x.login, created: Date.now(),
            voters: n.kind === 'talk' ? [] : [x.login], extraVotes: 0, status: 'open', replies: [], reports: [], held: heldFor(x) };
          S.notes.push(note); save(); return delay(view(note));
        })();
    },
    async editNote(id, { title, body }) {
      const n = find(id); const x = me();
      return guard(n && x?.login === n.author, 403, 'Only the person who wrote it can change it.') ?? guard(title?.trim(), 400, 'Give it a short title.') ?? (() => {
        n.title = title.trim().slice(0, 140); n.body = (body ?? '').trim().slice(0, 4000); n.edited = Date.now(); save(); return delay(view(n));
      })();
    },
    async deleteNote(id) {
      const n = find(id); const x = me();
      return guard(n && x?.login === n.author, 403, 'Only the person who wrote it can delete it.') ?? (() => { S.notes = S.notes.filter((m) => m !== n); save(); return delay({ ok: true }); })();
    },
    async vote(id, on) {
      const n = find(id); const x = me();
      return guard(x, ...NEED_SIGNIN) ?? guard(n, 404, 'This note was removed.') ?? guard(can(n, x).vote || (!on && n.voters.includes(x.login)), ...(oldEnough(x) ? [400, "This note can't take votes."] : TOO_NEW())) ?? (() => {
        n.voters = n.voters.filter((v) => v !== x.login); if (on) n.voters.push(x.login); save(); return delay(view(n));
      })();
    },
    async reply(id, body) {
      const n = find(id); const x = me();
      return guard(x, ...NEED_SIGNIN) ?? guard(n && can(n, x).reply, 400, "This note can't take replies.") ?? guard(body?.trim(), 400, 'Write something first.') ?? (() => {
        const r = { id: S.nextId++, author: x.login, body: body.trim().slice(0, 4000), created: Date.now(), held: heldFor(x) };
        n.replies.push(r); save(); return delay({ ok: true, held: r.held });
      })();
    },
    async editReply(id, rid, body) {
      const r = find(id)?.replies.find((y) => y.id === +rid);
      return guard(r && me()?.login === r.author, 403, 'Only the person who wrote it can change it.') ?? guard(body?.trim(), 400, 'Write something first.') ?? (() => { r.body = body.trim().slice(0, 4000); r.edited = Date.now(); save(); return delay({ ok: true }); })();
    },
    async deleteReply(id, rid) {
      const n = find(id); const r = n?.replies.find((y) => y.id === +rid);
      return guard(r && me()?.login === r.author, 403, 'Only the person who wrote it can delete it.') ?? (() => { n.replies = n.replies.filter((y) => y !== r); save(); return delay({ ok: true }); })();
    },
    async claimFixed(id, l) {
      const n = find(id); const x = me();
      return guard(x, ...NEED_SIGNIN) ?? guard(n && can(n, x).claimFixed, 400, 'Someone has already said this is fixed; confirm it instead.') ?? guard(link(l), 400, 'Add a link that shows it, like the release notes.') ?? (() => {
        n.fixed = { by: x.login, link: l, confirms: [] }; save(); return delay(view(n));
      })();
    },
    async withdrawFixed(id) {
      const n = find(id); return guard(n && can(n, me()).withdrawFixed, 403, 'Only the person who said it can take it back.') ?? (() => { n.fixed = null; save(); return delay(view(n)); })();
    },
    async confirmFixed(id) {
      const n = find(id); const x = me();
      return guard(x, ...NEED_SIGNIN) ?? guard(n?.fixed, 400, 'Nobody has said this is fixed yet.') ?? guard(n.fixed.by !== x.login, 400, 'You said it, so other people confirm it.') ?? guard(oldEnough(x), ...TOO_NEW()) ?? (() => {
        if (!n.fixed.confirms.includes(x.login)) n.fixed.confirms.push(x.login);
        // WHY several people: one person's word could be wrong or self-serving.
        if (n.fixed.confirms.length >= RULES.confirmsNeeded) n.status = 'fixed';
        save(); return delay(view(n));
      })();
    },
    async building(id, l) {
      const n = find(id); const x = me();
      return guard(x, ...NEED_SIGNIN) ?? guard(n && can(n, x).building, 400, 'Someone already said they are building this.') ?? guard(link(l), 400, 'Add a link to the project.') ?? (() => {
        n.building = { by: x.login, link: l }; save(); return delay(view(n));
      })();
    },
    async removeBuilding(id) {
      const n = find(id); return guard(n && can(n, me()).removeBuilding, 403, 'Only they, the author or a mod can remove this.') ?? (() => { n.building = null; save(); return delay(view(n)); })();
    },
    async report(id, reason) {
      const n = find(id); const x = me();
      return guard(x, ...NEED_SIGNIN) ?? guard(n && can(n, x).report, 400, "You've already reported this.") ?? (() => { n.reports.push({ by: x.login, reason: (reason ?? '').slice(0, 500) }); save(); return delay({ ok: true }); })();
    },


    // ── "I want this too": requests (docs/server-rules.md → Requests) ──
    async requests(q = {}) {
      const x = me(); const N = await names();
      const info = (key) => {
        const [kind, ...r] = key.split(':'); const v = r.join(':');
        if (kind === 'group') return N.groups[v]?.gap ? { kind, name: N.groups[v].n, href: `g/${v}/` } : null;
        if (kind === 'app') { const gs = Object.values(N.groups).filter((g) => g.closed.includes(v)); return gs.length && gs.every((g) => g.gap) ? { kind, name: v, href: `alternatives-to/${v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}/` } : null; }
        const i = S.issues.find((y) => `issue:${y.number}` === key && y.state === 'open' && ['add-closed-app', 'new-group'].includes(y.kind));
        return i ? { kind, name: i.name, url: `https://github.com/itsdestin/opensourceeverything/issues/${i.number}`, number: i.number, type: i.kind, waiting: true } : null;
      };
      const item = (key) => { const i = info(key); if (!i) return null; const vs = S.reqVoters[key] ?? []; return { key, ...i, votes: vs.length + (S.reqExtra[key] ?? 0), mine: !!x && vs.includes(x.login) }; };
      const can = { vote: oldEnough(x) };
      if (q.keys) return delay({ items: q.keys.split(',').map(item).filter(Boolean), can });
      const keys = new Set([...Object.keys(S.reqExtra), ...Object.keys(S.reqVoters), ...S.issues.filter((y) => y.state === 'open' && ['add-closed-app', 'new-group'].includes(y.kind)).map((y) => `issue:${y.number}`)]);
      const items = [...keys].map(item).filter(Boolean).sort((a, b) => b.votes - a.votes || (b.number ?? 0) - (a.number ?? 0));
      return delay({ items: items.slice(0, Math.min(+(q.limit ?? 10), 30)), total: items.length, can });
    },
    async requestVote(key, on) {
      const x = me();
      return guard(x, ...NEED_SIGNIN) ?? guard(oldEnough(x), ...TOO_NEW()) ?? guard((await api.requests({ keys: key })).items.length, 400, "That isn't open for requests.") ?? (() => {
        const vs = (S.reqVoters[key] ??= []).filter((v) => v !== x.login); if (on) vs.push(x.login); S.reqVoters[key] = vs; save(); return delay({ ok: true });
      })();
    },

    // ── Your suggestions: the person's own issues on the pretend GitHub ──
    async mySuggestions() {
      const x = me(); if (!x) return fail(...NEED_SIGNIN);
      const status = (i) => (i.state === 'closed' ? (i.reason === 'completed' ? 'live' : 'turned-down') : i.labels.includes('approved') ? 'approved' : i.labels.includes('needs-mod') ? 'needs-mod' : 'waiting');
      return delay({ items: S.issues.filter((i) => i.author === x.login).sort((a, b) => b.created - a.created).map((i) => ({ number: i.number, name: i.name, kind: i.kind, url: `https://github.com/itsdestin/opensourceeverything/issues/${i.number}`, author: i.author, created: i.created, status: status(i), ...(i.live ? { liveUrl: location.origin + i.live } : {}), ...(i.why ? { reason: i.why } : {}) })) });
    },
    async modSuggestions() {
      if (!isMod(me())) return fail(403, 'Mods only.');
      return delay({ items: S.issues.filter((i) => i.state === 'open').sort((a, b) => a.number - b.number).map((i) => ({ number: i.number, name: i.name, kind: i.kind, url: `https://github.com/itsdestin/opensourceeverything/issues/${i.number}`, author: i.author, created: i.created,
        status: i.labels.includes('approved') ? 'approved' : i.labels.includes('needs-mod') ? 'needs-mod' : 'waiting', votes: (S.reqVoters[`issue:${i.number}`] ?? []).length + (S.reqExtra[`issue:${i.number}`] ?? 0), verdict: i.labels.includes('needs-mod') ? 'needs-mod' : i.labels.includes('robot-ok') ? 'ok' : 'unchecked' })) });
    },

    // ── Tag my project ──
    async pitchStart(link) {
      const x = me(); if (!x) return fail(...NEED_SIGNIN);
      const r = parseRepo(link); if (!r) return fail(400, 'Paste the link to its code page on GitHub, GitLab or Codeberg.');
      const N = await names(); const project = N.codes?.[r.repo];
      if (!project) return delay({ listed: false, repo: r.repo, name: r.name });
      let p = S.pitches.find((y) => y.owner === x.login && y.repo === r.repo);
      if (!p) {
        // Under their own GitHub account → proven at once. Otherwise they need the one-line file.
        // Preview only: a sample login "mozilla-firefox-sample" owns github.com/mozilla-firefox, so the signed-in-owner case can be seen.
        const own = r.host === 'github.com' && r.owner.toLowerCase() === x.login.toLowerCase().replace(/-sample$/, '');
        p = { id: S.nextId++, owner: x.login, project, repo: r.repo, proof: own ? 'own-account' : 'file', token: 'ose-' + Math.random().toString(16).slice(2, 14).padEnd(12, '0'), verified: own, status: 'draft', live: null, pending: null, updated: Date.now(), checks: 0 };
        S.pitches.push(p); save();
      }
      return delay({ listed: true, pitch: await pitchView(p, true) });
    },
    async pitchVerify(id) {
      const p = S.pitches.find((y) => y.id === +id && y.owner === me()?.login); if (!p) return fail(404, "That isn't one of your projects.");
      // Preview only: the first check says the file isn't there yet, the second finds it, so both screens can be seen.
      if (!p.verified) { p.checks = (p.checks ?? 0) + 1; if (p.checks < 2) return fail(400, "We didn't find .opensourceeverything with the right text in that project yet. Add it to the project's main page (the top folder), then check again."); p.verified = true; save(); }
      return delay(await pitchView(p, true));
    },
    async pitchSave(id, b) {
      const p = S.pitches.find((y) => y.id === +id && y.owner === me()?.login); if (!p) return fail(404, "That isn't one of your projects.");
      if (!p.verified) return fail(403, 'Prove the project is yours first.');
      const N = await names(); const groups = [...new Set(b.groups ?? [])].filter((g) => N.groups[g]);
      const t = (k) => (b[k] ?? '').trim().slice(0, 1000);
      if (!groups.length) return fail(400, 'Pick at least one group it belongs in.');
      if (!(b.differs ?? '').trim()) return fail(400, 'Write a description.');
      // WHY back to waiting on every edit: nothing a developer writes goes public until a mod has read it.
      p.pending = { groups: groups.slice(0, 5), differs: b.differs.trim().slice(0, 600), strengths: t('strengths'), weaknesses: t('weaknesses'), reusable: t('reusable'), help: t('help') };
      p.status = 'pending'; p.reason = null; p.updated = Date.now(); save(); return delay(await pitchView(p, true));
    },
    async pitchDelete(id) { S.pitches = S.pitches.filter((y) => !(y.id === +id && y.owner === me()?.login)); save(); return delay({ ok: true }); },
    async myPitches() { const x = me(); if (!x) return fail(...NEED_SIGNIN); const out = []; for (const p of S.pitches.filter((y) => y.owner === x.login)) out.push(await pitchView(p, true)); return delay({ items: out }); },
    async livePitches(ids) {
      const out = {}; for (const id of ids) { const p = S.pitches.find((y) => y.project === id && y.live && y.verified); if (p) out[id] = { by: p.owner, repo: p.repo, ...p.live, updated: p.updated }; }
      return delay(out);
    },
    async modPitches() {
      if (!isMod(me())) return fail(403, 'Mods only.');
      const out = []; for (const p of S.pitches.filter((y) => y.pending)) out.push({ ...(await pitchView(p, false)), owner: p.owner });
      return delay({ items: out });
    },
    async modPitchAct(id, action, reason) {
      const p = S.pitches.find((y) => y.id === +id);
      return guard(isMod(me()), 403, 'Mods only.') ?? guard(p?.pending, 404, 'Nothing waiting there.') ?? guard(['approve', 'reject'].includes(action), 400, 'Not a valid action.') ?? (() => {
        if (action === 'approve') { p.live = p.pending; p.pending = null; p.status = 'live'; p.reason = null; }
        else { p.pending = null; p.status = p.live ? 'live' : 'turned-down'; p.reason = (reason ?? '').slice(0, 500) || null; }
        p.updated = Date.now(); save(); return delay({ ok: true });
      })();
    },

    // ── Mods ──
    async setStatus(id, status) {
      const n = find(id);
      return guard(isMod(me()), 403, 'Only mods can close or reopen notes.') ?? guard(['open', 'fixed', 'wontfix', 'duplicate'].includes(status), 400, 'Not a valid status.') ?? (() => {
        n.status = status; if (status === 'open') n.fixed = null; save(); return delay(view(n));
      })();
    },
    async modQueue() {
      if (!isMod(me())) return fail(403, 'Mods only.');
      const v = (n) => ({ ...view(n), reports: n.reports });
      return delay({
        held: S.notes.filter((n) => n.held).map(v),
        heldReplies: S.notes.flatMap((n) => n.replies.filter((r) => r.held).map((r) => ({ ...r, note: { id: n.id, title: n.title } }))),
        reported: S.notes.filter((n) => n.reports.length && !n.held).map(v),
        claims: S.notes.filter((n) => n.fixed && isOpen(n)).map(v),
        // WHY not the ones above: a note shows in one section only.
        popular: S.notes.filter((n) => n.kind === 'missing' && isOpen(n) && !n.fixed && !n.keepFull && n.voters.length + n.extraVotes >= RULES.popularVotes).map(v),
      });
    },
    async modAct({ id, rid, action }) {
      if (!isMod(me())) return fail(403, 'Mods only.');
      const n = S.notes.find((x) => x.id === +id); const r = rid && n.replies.find((y) => y.id === +rid);
      const trust = (login) => { if (S.users[login]) S.users[login].trusted = true; };
      if (r) {
        if (action === 'approve') { r.held = false; trust(r.author); }
        if (action === 'hide') n.replies = n.replies.filter((y) => y !== r);
        if (action === 'ban') { S.banned.push(r.author); n.replies = n.replies.filter((y) => y !== r); }
      } else {
        if (action === 'approve') { n.held = false; trust(n.author); }
        if (action === 'hide') S.notes = S.notes.filter((x) => x !== n);
        if (action === 'dismiss') n.reports = [];
        if (action === 'reject-fix') n.fixed = null;
        if (action === 'keep' || action === 'partly') n.keepFull = true;
        if (action === 'ban') { S.banned.push(n.author); S.notes = S.notes.filter((x) => !(x.author === n.author && x.held)); }
      }
      save(); return delay({ ok: true });
    },
  };
  window.OI = Object.assign(window.OI || {}, { api });
})();

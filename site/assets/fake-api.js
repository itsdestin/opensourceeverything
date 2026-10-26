// A pretend server for previewing voting, notes and boards before the real one exists (built with API_URL=demo).
// It obeys docs/server-rules.md exactly, so it doubles as the blueprint the real server (Cloudflare) must match:
// same calls, same answers, same rules. Everything is kept in this browser only and starts from sample posts.
(function () {
  const KEY = 'ose-demo-v2';
  const RULES = { minAgeDays: 14, confirmsNeeded: 3, popularVotes: 25 };
  const now = Date.now(), H = 3600e3, D = 24 * H;
  const u = (login, days = 400) => ({ login, created: now - days * D, trusted: days >= 14 });
  const seed = () => ({
    me: null, nextId: 100, banned: [], mods: ['itsdestin'],
    users: Object.fromEntries(['erin', 'gus', 'hana', 'ivan', 'jo', 'kim', 'lee'].map((n) => [`${n}-sample`, u(`${n}-sample`)]).concat([['newbie-sample', u('newbie-sample', 3)]])),
    ratings: {}, // "group/project" → { login: 1 | -1 }
    notes: sampleNotes().map((n) => ({ voters: [], extraVotes: 0, status: 'open', replies: [], reports: [], body: '', ...n })),
  });
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

// A pretend server for previewing voting, notes and boards before the real one exists (built with API_URL=demo).
// It answers the same calls as the real server (worker/), keeps everything in this browser only, and starts from
// sample posts. WHY (Destin, Oct 27: build the screens first): every screen can be clicked through and approved
// before any server code is written; the real server then replaces this file without the pages changing.
(function () {
  const KEY = 'ose-demo-v1';
  const now = Date.now(), H = 3600e3, D = 24 * H;
  const u = (login, days = 400) => ({ login, created: now - days * D });
  const seed = () => ({
    me: null, nextId: 100, banned: [],
    users: { 'erin-sample': u('erin-sample'), 'gus-sample': u('gus-sample'), 'hana-sample': u('hana-sample'), 'ivan-sample': u('ivan-sample'),
      'jo-sample': u('jo-sample'), 'kim-sample': u('kim-sample'), 'lee-sample': u('lee-sample'), 'newbie-sample': u('newbie-sample', 3) },
    // ratings[group][project] = { login: 1 | -1 }
    ratings: {},
    notes: [
      { id: 1, kind: 'missing', category: 'office', group: 'documents', project: 'libreoffice-writer', closedApp: 'Google Docs', title: 'No live co-editing: two people can\'t type in one document', body: 'Collabora and OnlyOffice can do it, but they need a server.', author: 'erin-sample', created: now - 30 * D, voters: ['gus-sample', 'hana-sample', 'ivan-sample', 'jo-sample', 'kim-sample'], extraVotes: 43, status: 'open', replies: [{ id: 1, author: 'gus-sample', body: 'This is the one thing that keeps my team on Google Docs.', created: now - 20 * D }] },
      { id: 2, kind: 'missing', category: 'office', group: 'documents', project: 'onlyoffice-docs', closedApp: 'Microsoft Word', title: 'Tracked changes break after a round trip through Word', body: '', author: 'gus-sample', created: now - 9 * D, voters: ['erin-sample'], extraVotes: 28, status: 'open', replies: [] },
      { id: 3, kind: 'wish', category: 'office', group: 'documents', title: 'A phone app that edits documents, not just views them', body: 'Every open option either only views on phones or needs a server.', author: 'hana-sample', created: now - 4 * D, voters: [], extraVotes: 12, status: 'open', replies: [] },
      { id: 4, kind: 'missing', category: 'office', group: 'documents', project: 'cryptpad', title: 'Exporting to .docx loses tables', body: '', author: 'ivan-sample', created: now - 60 * D, voters: [], extraVotes: 9, status: 'fixed', fixed: { by: 'ivan-sample', link: 'https://github.com/cryptpad/cryptpad/releases', confirms: ['jo-sample', 'kim-sample', 'lee-sample'] }, replies: [{ id: 2, author: 'kim-sample', body: 'Fixed in the latest release, works for me.', created: now - 3 * D }] },
      { id: 5, kind: 'missing', category: 'office', group: 'notes', project: 'logseq', closedApp: 'Notion', title: 'No shared workspaces for a team', body: '', author: 'jo-sample', created: now - 14 * D, voters: [], extraVotes: 31, status: 'open', fixed: { by: 'lee-sample', link: 'https://github.com/logseq/logseq/releases', confirms: ['kim-sample'] }, replies: [] },
      { id: 6, kind: 'wish', category: 'office', group: 'notes', title: 'Notion-style databases that sync without a server', body: '', author: 'kim-sample', created: now - 2 * D, voters: [], extraVotes: 22, status: 'building', building: { by: 'lee-sample', link: 'https://github.com/example/example' }, replies: [] },
      { id: 7, kind: 'talk', category: 'office', group: 'documents', title: 'Which one do you use with people who only have Word?', body: 'Curious what works best when everyone else sends .docx files.', author: 'lee-sample', created: now - 6 * H, voters: [], extraVotes: 0, status: 'open', replies: [{ id: 3, author: 'erin-sample', body: 'OnlyOffice. Its files look the same in Word.', created: now - 2 * H }] },
      { id: 8, kind: 'missing', category: 'creative', group: 'photo-editing', project: 'gimp', closedApp: 'Adobe Photoshop', title: 'No generative fill', body: '', author: 'hana-sample', created: now - 11 * D, voters: [], extraVotes: 37, status: 'open', replies: [] },
      { id: 9, kind: 'wish', category: 'creative', group: 'graphic-design', closedApp: 'Canva', title: 'A template library like Canva\'s', body: 'Penpot is great for screens, but nothing has ready-made posters and social posts.', author: 'erin-sample', created: now - 21 * D, voters: [], extraVotes: 64, status: 'open', replies: [] },
      { id: 10, kind: 'missing', category: 'creative', group: 'graphic-design', project: 'penpot', closedApp: 'Canva', title: 'No one-click resize for every social network', body: '', author: 'newbie-sample', created: now - 1 * H, voters: [], extraVotes: 0, status: 'open', held: true, replies: [] },
      { id: 11, kind: 'wish', category: 'media', group: 'music', closedApp: 'Spotify', title: 'A music service with a real catalog, not just your own files', body: '', author: 'ivan-sample', created: now - 40 * D, voters: [], extraVotes: 88, status: 'open', replies: [], reports: [{ by: 'jo-sample', reason: 'Not something software alone can fix (it needs music licenses).' }] },
    ],
  });
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { return seed(); } };
  let S = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* preview only */ } };
  // Preview shortcut: ?preview-as=mod | member | new signs in as that kind of user, to try each state quickly.
  const as = new URLSearchParams(location.search).get('preview-as');
  if (as) { const days = as === 'new' ? 3 : 400; const login = `${as}-sample`; S.users[login] ??= u(login, days); S.me = login; S.isMod = as === 'mod'; save(); }
  const me = () => (S.me ? S.users[S.me] : null);
  const ageDays = (user) => Math.floor((now - user.created) / D);
  const canVote = (user) => !!user && ageDays(user) >= 14 && !S.banned.includes(user.login);
  const view = (n) => {
    const m = me();
    const votes = n.voters.length + n.extraVotes;
    return { ...n, voters: undefined, extraVotes: undefined, votes, mine: !!m && n.voters.includes(m.login),
      replies: n.replies.length, fixed: n.fixed ? { ...n.fixed, confirms: n.fixed.confirms.length, confirmedByMe: !!m && n.fixed.confirms.includes(m.login) } : null };
  };
  const visible = (n) => !n.held || (me() && (me().login === n.author || S.isMod));
  const delay = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 120));
  const fail = (status, message) => Promise.reject(Object.assign(new Error(message), { status }));
  const need = () => (me() ? null : fail(401, 'Sign in first.'));

  const api = {
    demo: true,
    async me() {
      const m = me();
      return delay({ user: m && { login: m.login, accountDays: ageDays(m), canVote: canVote(m), isMod: !!S.isMod, banned: S.banned.includes(m.login) } });
    },
    // Demo only: pick who to be, so every state (new account, mod) can be tried.
    async signIn(login = 'you-sample', days = 400) { S.users[login] ??= u(login, days); S.me = login; save(); return api.me(); },
    async signOut() { S.me = null; save(); return delay({ ok: true }); },
    async setMod(on) { S.isMod = on; save(); return delay({ ok: true }); },
    async deleteAccount() {
      const m = me(); if (!m) return need();
      S.notes = S.notes.filter((n) => n.author !== m.login);
      for (const n of S.notes) { n.voters = n.voters.filter((v) => v !== m.login); n.replies = n.replies.filter((r) => r.author !== m.login); }
      for (const g of Object.values(S.ratings)) for (const p of Object.values(g)) delete p[m.login];
      delete S.users[m.login]; S.me = null; save(); return delay({ ok: true });
    },
    async reset() { S = seed(); save(); return delay({ ok: true }); },

    async ratings(group, ids = []) {
      const m = me(); const g = S.ratings[group] ?? {};
      // WHY a steady sample count per project: so the preview shows percentages, not empty ratings.
      const out = {};
      for (const pid of new Set([...Object.keys(g), ...ids])) {
        const v = Object.values(g[pid] ?? {}); const h = [...pid].reduce((s, c) => s + c.charCodeAt(0), 0);
        out[pid] = { up: v.filter((x) => x > 0).length + (h % 40) + 3, down: v.filter((x) => x < 0).length + (h % 7), mine: m ? (g[pid]?.[m.login] ?? 0) : 0 };
      }
      return delay(out);
    },
    async rate(group, project, value) {
      const m = me(); if (!m) return need(); if (!canVote(m)) return fail(403, 'New GitHub accounts can vote once they are 14 days old.');
      ((S.ratings[group] ??= {})[project] ??= {})[m.login] = value; if (!value) delete S.ratings[group][project][m.login];
      save(); return delay({ ok: true });
    },

    async notes(q = {}) {
      let list = S.notes.filter(visible).filter((n) =>
        (!q.category || n.category === q.category) && (!q.group || n.group === q.group) && (!q.project || n.project === q.project) &&
        (!q.kind || n.kind === q.kind) && (!q.status || (q.status === 'open' ? ['open', 'building'].includes(n.status) : !['open', 'building'].includes(n.status))));
      list = list.map(view);
      list.sort(q.sort === 'new' ? (a, b) => b.created - a.created : (a, b) => b.votes - a.votes || b.created - a.created);
      return delay(list.slice(0, q.limit ?? 100));
    },
    async note(id) {
      const n = S.notes.find((x) => x.id === +id);
      if (!n || !visible(n)) return fail(404, 'This note was removed, or it never existed.');
      return delay({ ...view(n), replies: n.replies, reports: S.isMod ? n.reports ?? [] : undefined });
    },
    async addNote(n) {
      const m = me(); if (!m) return need(); if (S.banned.includes(m.login)) return fail(403, 'This account can no longer post here.');
      if (!n.title?.trim()) return fail(400, 'Give it a short title.');
      // WHY held: first posts from accounts under 14 days old wait for a mod (anti-spam, like the subreddit).
      const held = ageDays(m) < 14 && !S.notes.some((x) => x.author === m.login && !x.held);
      const note = { id: S.nextId++, ...n, title: n.title.trim().slice(0, 140), body: (n.body ?? '').trim().slice(0, 4000), author: m.login, created: Date.now(), voters: [m.login], extraVotes: 0, status: 'open', replies: [], held };
      S.notes.push(note); save(); return delay(view(note));
    },
    async vote(id, on) {
      const m = me(); if (!m) return need(); if (!canVote(m)) return fail(403, 'New GitHub accounts can vote once they are 14 days old.');
      const n = S.notes.find((x) => x.id === +id); n.voters = n.voters.filter((v) => v !== m.login); if (on) n.voters.push(m.login);
      save(); return delay(view(n));
    },
    async reply(id, body) {
      const m = me(); if (!m) return need(); if (!body?.trim()) return fail(400, 'Write something first.');
      const n = S.notes.find((x) => x.id === +id); n.replies.push({ id: S.nextId++, author: m.login, body: body.trim().slice(0, 4000), created: Date.now() });
      save(); return delay({ ok: true });
    },
    async claimFixed(id, link) {
      const m = me(); if (!m) return need();
      if (!/^https?:\/\/\S+$/.test(link ?? '')) return fail(400, 'Add a link that shows it, like the release notes.');
      const n = S.notes.find((x) => x.id === +id); n.fixed = { by: m.login, link, confirms: [] }; save(); return delay(view(n));
    },
    async confirmFixed(id) {
      const m = me(); if (!m) return need(); if (!canVote(m)) return fail(403, 'New GitHub accounts can confirm once they are 14 days old.');
      const n = S.notes.find((x) => x.id === +id);
      if (n.fixed.by === m.login) return fail(400, "You said it's fixed, so others confirm it.");
      if (!n.fixed.confirms.includes(m.login)) n.fixed.confirms.push(m.login);
      // WHY three: one person's word could be wrong or self-serving; three independent confirmations close it.
      if (n.fixed.confirms.length >= 3) n.status = 'fixed';
      save(); return delay(view(n));
    },
    async building(id, link) {
      const m = me(); if (!m) return need();
      if (!/^https?:\/\/\S+$/.test(link ?? '')) return fail(400, 'Add a link to the project.');
      const n = S.notes.find((x) => x.id === +id); n.status = 'building'; n.building = { by: m.login, link }; save(); return delay(view(n));
    },
    async setStatus(id, status) {
      if (!S.isMod) return fail(403, 'Only mods and the project\'s team can do this.');
      const n = S.notes.find((x) => x.id === +id); n.status = status; save(); return delay(view(n));
    },
    async report(id, reason) {
      const m = me(); if (!m) return need();
      const n = S.notes.find((x) => x.id === +id); (n.reports ??= []).push({ by: m.login, reason: (reason ?? '').slice(0, 500) }); save(); return delay({ ok: true });
    },

    async modQueue() {
      if (!S.isMod) return fail(403, 'Mods only.');
      const v = (n) => ({ ...view(n), reports: n.reports ?? [] });
      return delay({
        held: S.notes.filter((n) => n.held).map(v),
        reported: S.notes.filter((n) => n.reports?.length && !n.held).map(v),
        claims: S.notes.filter((n) => n.fixed && n.status === 'open').map(v),
        popular: S.notes.filter((n) => n.kind === 'missing' && n.status === 'open' && n.voters.length + n.extraVotes >= 25).map(v),
      });
    },
    async modAct(id, action) {
      if (!S.isMod) return fail(403, 'Mods only.');
      const n = S.notes.find((x) => x.id === +id);
      if (action === 'approve') n.held = false;
      if (action === 'hide') S.notes = S.notes.filter((x) => x !== n);
      if (action === 'dismiss') n.reports = [];
      if (action === 'ban') { S.banned.push(n.author); S.notes = S.notes.filter((x) => x.author !== n.author || !x.held); }
      if (action === 'reject-fix') n.fixed = null;
      save(); return delay({ ok: true });
    },
  };
  window.OI = Object.assign(window.OI || {}, { api });
})();

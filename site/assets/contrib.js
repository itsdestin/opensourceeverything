// Contributions (review Oct 26): "I want this too" + Most requested, "From the Developer" pitches, Tag my project,
// Your suggestions, and the mod page's Suggestions tab. Pages carry empty placeholders (data-request,
// data-most-requested, data-dev-pitch, data-tag, data-my-suggestions, data-mod-tabs); this fills them from the server
// (window.OI.api: the real one or the preview's pretend one). The server decides every right (docs/server-rules.md);
// this file only draws what it allows. Everything people write is shown as plain text, never as page code.
(function () {
  const OI = window.OI; const api = OI.api; const ui = OI.ui; if (!api || !ui) return;
  const BASE = OI.base || '/'; const esc = OI.esc; const toast = OI.toast;
  const $ = (s, el = document) => el.querySelector(s); const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const { getMe, signIn, oops, loadNames, dialog, picker, ago } = ui;
  const PITCH_PARTS = [['strengths', 'What it does best'], ['weaknesses', "What it doesn't do well yet"], ['reusable', 'What other builders could reuse'], ['help', 'Where help is wanted']];

  // Signing in must not lose what you clicked: remembered for this tab, finished when you're back (like social.js).
  const PENDING = 'ose-pending-c';
  const remember = (a) => { try { sessionStorage.setItem(PENDING, JSON.stringify({ ...a, at: location.pathname + location.search })); } catch { /* fine */ } };

  // ───────── "I want this too" ─────────
  const KIND = { group: 'A job nothing open fully does yet', app: 'Closed app with no open replacement', issue: 'Suggested, waiting for a mod' };
  const word = (n) => `<b>▲ ${n.votes}</b><span>want this</span>`;
  async function vote(item, then) {
    const { user, rules } = await getMe(true);
    if (!user) { remember({ type: 'request', key: item.key }); return signIn(); }
    if (!user.canVote) return toast(user.banned ? 'This account can no longer vote here.' : `You can add yours once your GitHub account is ${rules.minAgeDays} days old.`);
    try { await api.requestVote(item.key, !item.mine); item.mine = !item.mine; item.votes += item.mine ? 1 : -1; then(); } catch (e) { oops(e); }
  }

  // A single button on a group or closed-app page that nothing open covers.
  async function renderRequestButtons() {
    const slots = $$('[data-request]'); if (!slots.length) return;
    const res = await api.requests({ keys: slots.map((s) => s.dataset.key).join(',') }).catch(() => ({ items: [] }));
    for (const s of slots) {
      const item = res.items.find((x) => x.key === s.dataset.key); if (!item) continue;
      const draw = () => { s.hidden = false; s.innerHTML = `<button class="btn sm ${item.mine ? 'primary' : 'secondary'}" type="button" aria-pressed="${item.mine}">${item.mine ? `✓ ${item.votes} want this` : item.votes ? `${item.votes} want this` : 'I want this too'}</button>`; };
      s.onclick = (e) => { if (e.target.closest('button')) vote(item, draw); };
      draw();
    }
  }

  // "Most requested": ranked by votes, including suggestions still waiting for a mod.
  // WHY every request is shown as a JOB in plain words (Destin, redesign round 2: "'closed app' tags are weird... feels weird to have LinkedIn on a
  // list where everything else is a function"): a request for a closed app appears under the job it belongs to, with the closed app as a quiet
  // "Like LinkedIn" line. A job and a closed app that point at the same job are one row; its count adds both, and pressing the button counts for the job.
  async function renderMostRequested(slot) {
    const limit = +(slot.dataset.limit ?? 5);
    let res, N; try { [res, N] = await Promise.all([api.requests({ limit: limit + 10 }), loadNames()]); } catch { slot.innerHTML = '<div class="callout warn">Couldn\'t load requests just now.</div>'; return; }
    if (!res.items.length) { slot.innerHTML = `<div class="callout info">Nothing has been asked for yet. Search for an app that isn't here and ask for it, or press <b>I want this too</b> on a job nothing open covers.</div>`; return; }
    const jobOf = (it) => {
      if (it.kind === 'group') { const id = it.key.replace(/^group:/, ''); const g = N.groups[id]; return { id: `g:${id}`, title: g?.n ?? it.name, like: (g?.closed ?? []).slice(0, 3).join(', '), href: `g/${id}/` }; }
      if (it.kind === 'app') {
        const gs = Object.entries(N.groups).filter(([, g]) => g.closed.some((c) => c.toLowerCase() === it.name.toLowerCase())); const hit = gs.find(([, g]) => g.gap) ?? gs[0];
        return hit ? { id: `g:${hit[0]}`, title: hit[1].n, like: it.name, href: `g/${hit[0]}/` } : { id: `a:${it.key}`, title: it.name, like: '', href: it.href };
      }
      return { id: `i:${it.key}`, title: it.name, like: '', url: it.url };
    };
    const rows = () => {
      const by = new Map();
      for (const it of res.items) { const j = jobOf(it); const m = by.get(j.id) ?? by.set(j.id, { ...j, members: [], votes: 0, waiting: true }).get(j.id); m.members.push(it); m.votes += it.votes; m.waiting = m.waiting && !!it.waiting; if (it.kind === 'group' && j.like) m.like = j.like; }
      return [...by.values()].sort((x, y) => y.votes - x.votes).slice(0, limit);
    };
    const mine = (m) => m.members.some((x) => x.mine);
    const link = (m) => (m.url ? esc(m.url) : BASE + esc(m.href));
    const vbtn = (m, cls = '') => `<button class="vote pillvote${cls}${mine(m) ? ' on' : ''}" type="button" aria-pressed="${mine(m)}" title="${mine(m) ? 'You want this. Press to take it back.' : 'Add your voice'}"><b>▲ ${m.votes}</b><span>${mine(m) ? 'You want this' : 'want this'}</span></button>`;
    const sub = (m) => `${m.like ? `<span class="rq-like">Like ${esc(m.like)}</span>` : ''}${m.waiting ? '<span class="pill warn"><i></i>Waiting for a mod</span>' : ''}`;
    const card = (m, i) => `<div class="rq-card req-row" data-id="${esc(m.id)}"><span class="rq-medal m${Math.min(i + 1, 4)}">${i + 1}</span>
        <div class="rq-text"><a class="rt" href="${link(m)}"${m.url ? ' target="_blank" rel="noopener"' : ''}>${esc(m.title)}</a><div class="rq-sub">${sub(m)}</div></div>${vbtn(m)}</div>`;
    const lrow = (m, i) => `<div class="req-row rq-minicard" data-id="${esc(m.id)}"><span class="rq-rank" aria-hidden="true">${i + 1}</span>
        <div class="nr-main"><a class="rt" href="${link(m)}"${m.url ? ' target="_blank" rel="noopener"' : ''}>${esc(m.title)}</a><div class="rq-sub">${sub(m)}</div></div>${vbtn(m)}</div>`;
    const draw = () => {
      const all = rows(); const more = res.total > all.length && slot.dataset.more ? `<a class="btn sm secondary rq-more" href="${esc(BASE + slot.dataset.more)}">See all ${res.total}</a>` : '';
      // Home: five equal cards. Gaps page: the top three as cards, the rest as a short list.
      if (slot.dataset.layout === 'five') { slot.innerHTML = `<div class="rq-five">${all.map(card).join('')}</div>${more}`; return; }
      slot.innerHTML = `<div class="rq-pod">${all.slice(0, 3).map(card).join('')}</div>${all.length > 3 ? `<div class="rq-mini" style="--rows:${Math.ceil((all.length - 3) / 2)}">${all.slice(3).map((m, i) => lrow(m, i + 3)).join('')}</div>` : ''}${more}`;
    };
    const lastRows = () => rows();
    slot.onclick = (e) => {
      const b = e.target.closest('.vote'); if (!b) return;
      const m = lastRows().find((x) => x.id === b.closest('.req-row').dataset.id); if (!m) return;
      vote(m.members.find((x) => x.mine) ?? m.members.find((x) => x.kind === 'group') ?? m.members[0], draw);
    };
    draw();
  }

  // ───────── "From the Developer" ─────────
  const when = (t) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  function pitchBody(p) {
    return `<p class="pitch-differs">${esc(p.differs)}</p>
      ${PITCH_PARTS.filter(([k]) => p[k]).map(([k, label]) => `<div class="pitch-part"><div class="label">${label}</div><p class="small2 pre">${esc(p[k])}</p></div>`).join('')}`;
  }
  async function renderPitches() {
    const slots = $$('[data-dev-pitch]'); if (!slots.length) return;
    const ids = [...new Set(slots.map((s) => s.dataset.project))]; const all = {};
    for (let i = 0; i < ids.length; i += 60) Object.assign(all, await api.livePitches(ids.slice(i, i + 60)).catch(() => ({})));
    const { user } = await getMe();
    // ───────── The "not claimed yet" label (Destin picked a, with his exact words) ─────────
    // WHY here: this is where we learn whether a developer has claimed the project (an approved pitch). Claimed -> no label, ever.
    $$('[data-claim-line]').forEach((el) => {
      if (all[el.dataset.claimLine]) return;
      el.hidden = false;
      el.innerHTML = `This listing is managed by r/TrueOpenSource and was drafted with AI assistance. If you maintain this project, <a href="${BASE}tag/?repo=${encodeURIComponent(el.dataset.repo ?? '')}">claim this listing here</a>.`;
    });
    for (const s of slots) {
      const p = all[s.dataset.project];
      if (!p && s.dataset.mode === 'page') { s.hidden = true; continue; } // the label's link replaces "Is this your project?"
      if (s.dataset.mode === 'card') {
        if (!p) continue;
        s.hidden = false; s.innerHTML = `<span class="pill info">From the Developer</span><span class="pitch-line">${esc(p.differs)}</span>`;
      } else {
        const mine = user && p && p.by.toLowerCase() === user.login.toLowerCase();
        const tag = `${BASE}tag/?repo=${encodeURIComponent(s.dataset.repo ?? '')}`;
        s.hidden = false;
        s.innerHTML = p
          ? `<div class="sec-head fold-head"><div><h2 class="h-large">From the Developer</h2><p class="desc12">@${esc(p.by)} · ${esc(when(p.updated))} · ${p.ownerCheck === 'mods' ? 'Ownership confirmed by r/TrueOpenSource mods' : 'Owner checked through GitHub'}</p></div>${mine ? `<a class="btn sm secondary" href="${tag}">Edit</a>` : ''}</div>
             ${pitchBody(p)}`
          : `<div class="sec-head"><div><h2 class="h-large">Is this your project?</h2><p class="desc12">Tag it to tell people what it does differently, what's reusable and where you'd like help.</p></div><a class="btn sm secondary" href="${tag}">Tag my project</a></div>`;
        if (p) { s.classList.add('fold-phone'); OI.foldInit?.(s); }
      }
    }
  }

  // ───────── Tag my project ─────────
  async function renderTag(slot) {
    const N = await loadNames(); const { user } = await getMe();
    const q = new URLSearchParams(location.search);
    const st = { stage: 'start', pitch: null, link: q.get('repo') ?? '', mine: [], error: '' };
    const stepIdx = { start: 0, notlisted: 0, proof: 1, form: 2, sent: 3 };
    // WHY (Destin, redesign round 3: "too much text for the sake of text"): one sentence under the title, nothing else restated.
    const head = () => `<div class="surface identity"><div><div class="muted11">For developers</div><h1 class="h-subject">Claim your project</h1>
      <p class="desc12">Add your own description to your project's page. The AI-drafted note goes away.</p></div></div>`;
    if (!user) {
      // WHY ONE card (Destin, round 5: "sign in button? really?"; guide: Account's sign-in card): the title, one line, and a full-width filled button. Nothing else on the page.
      slot.innerHTML = `<div class="surface identity signin-card"><div><div class="muted11">For developers</div><h1 class="h-subject">Claim your project</h1>
        <p class="desc12">Sign in with GitHub so only you can speak for your project.</p></div><button class="btn md primary full" type="button" data-signin>Sign in with GitHub</button></div>`;
      return;
    }
    const load = async () => { st.mine = (await api.myPitches().catch(() => ({ items: [] }))).items; };
    const statusPill = (x) => ({ pending: '<span class="pill warn"><i></i>A mod is reading it</span>', live: '<span class="pill ok"><i></i>Shown on the site</span>', 'turned-down': '<span class="pill warn">Turned down</span>', draft: '<span class="pill info">Not sent yet</span>' }[x.status] ?? '');

    // ───────── The steps: one wide card, each step its own card inside it, done ones summarised (Destin's pick c, round 3) ─────────
    // WHY the ownership step is its own card even when automatic: a signed-in owner sees it say "Verified" and nothing to do; everyone else sees the one thing to do.
    const err = () => (st.error ? `<div class="callout warn">${esc(st.error)}</div>` : '');
    const actions = (...b) => `<div class="tg-actions">${b.join('')}</div>`;
    const step = (n, title, state, summary, body) => `<div class="lvl1 tg-step ${state}"><div class="tg-rowhead"><span class="tg-num">${state === 'done' ? '✓' : n}</span><div><h2 class="h-large">${title}</h2>${summary ? `<p class="desc12">${summary}</p>` : ''}</div></div>${body ? `<div class="tg-body">${body}</div>` : ''}</div>`;
    const bodyLink = () => `<div><label class="label" for="tagLink">Link to its code</label><input class="field" id="tagLink" placeholder="https://github.com/you/your-project" value="${esc(st.link)}"></div>
      ${err()}
      ${st.stage === 'notlisted' ? `<div class="callout info"><b>It isn't on the map yet.</b> Add it first (a short form on GitHub that a mod approves), then come back.
        <div style="margin-top:8px"><a class="btn sm primary" target="_blank" rel="noopener" href="${esc(`${OI.repo}/issues/new?template=1-add-project.yml&code=${encodeURIComponent(st.link)}&name=${encodeURIComponent(st.name ?? '')}&relation=${encodeURIComponent("Yes, I'm on its team")}`)}">Add my project</a></div></div>` : ''}
      ${actions('<button class="btn md primary" type="button" data-go>Continue</button>')}`;
    const bodyFile = () => { const p = st.pitch; return `<p class="small2">It isn't under your own GitHub account, so we need to see you can change it. Add a file named <code class="copy" data-copy="${esc(p.proofFile)}">${esc(p.proofFile)}</code> to its main folder, containing:</p>
      <code class="copy block" data-copy="${esc(p.proofText)}">${esc(p.proofText)}</code>
      <p class="fieldhint">This text works once and expires in 48 hours. Once checked, a mod also confirms you own or run the project before anything shows.</p>
      ${err()}
      ${actions('<button class="btn md secondary" type="button" data-back>Back</button>', '<button class="btn md primary" type="button" data-verify>Check</button>')}`; };
    const bodyWrite = () => { const p = st.pitch;
      return `${p.reason ? `<div class="callout warn"><b>A mod asked for a change:</b> ${esc(p.reason)}</div>` : ''}
      ${p.status === 'pending' ? '<div class="callout info">A mod is reading what you sent. Editing it now replaces what they see.</div>' : p.live ? '<div class="callout info">Your approved description stays up while a mod reads any changes.</div>' : ''}
      <div><label class="label" for="tgDiff">Description</label><textarea class="field" id="tgDiff" rows="3" maxlength="600"></textarea></div>
      <div><span class="label" id="tgL">Groups</span><div class="pick" id="tagGroups"></div></div>
      <details class="fold lvl1 tg-more"><summary><span>More</span><span class="muted11">optional</span></summary>
        <div class="tg-morebody">${PITCH_PARTS.map(([k, l]) => `<div><label class="label" for="tg_${k}">${l}</label><textarea class="field" id="tg_${k}" rows="2" maxlength="1000"></textarea></div>`).join('')}<div id="before" class="lvl1 before"></div></div></details>
      ${err()}
      <div class="tg-foot"><p class="fieldhint" data-need></p>${actions('<button class="btn md secondary" type="button" data-cancel>Cancel</button>', '<button class="btn md primary" type="button" data-send disabled>Send to a mod</button>')}</div>`; };
    const bodySent = () => `<p class="small2">${st.pitch.needsConfirm && !st.pitch.confirmed ? 'A mod will first confirm that you own or run the project (a few extra checks apply to well-known projects), then read it. ' : 'A mod will read it. '}Then it shows on <a href="${BASE}p/${esc(st.pitch.project)}/">${esc(st.pitch.projectName)}</a>.</p>${actions('<button class="btn md primary" type="button" data-done>Done</button>')}`;
    const mineBlock = () => (st.mine.length && !['form', 'proof'].includes(st.stage)
      ? `<section class="surface sec"><h2 class="h-large">Your claimed projects<span class="count">${st.mine.length}</span></h2><div class="stack">${st.mine.map((x) => `<div class="lvl1 modrow" data-id="${x.id}"><div class="nr-main"><a class="rt" href="${BASE}p/${esc(x.project)}/">${esc(x.projectName)}</a><div class="nr-meta">${statusPill(x)}${x.verified ? '' : '<span class="pill warn"><i></i>Not verified</span>'}</div></div>
        <div class="btns-row"><button class="btn sm secondary" type="button" data-edit>${x.verified ? 'Edit' : 'Finish'}</button><button class="btn sm secondary" type="button" data-remove>Remove</button></div></div>`).join('')}</div></section>` : '');
    function draw() {
      const i = stepIdx[st.stage]; const p = st.pitch;
      const cards = [step(1, 'Project', i === 0 ? 'open' : 'done', i === 0 ? '' : esc(p?.repo ?? st.link), i === 0 ? bodyLink() : '')];
      if (i >= 1) {
        const own = p.verified && p.proof === 'own-account';
        cards.push(step(2, 'Ownership', i === 1 ? 'open' : 'done', i === 1 ? '' : own ? `Verified. It's under your GitHub account, @${esc(user.login)}.` : 'Verified.', i === 1 ? bodyFile() : ''));
      }
      if (i >= 2) cards.push(step(3, 'Description', i === 2 ? 'open' : 'done', i === 3 ? 'Sent' : '', i === 2 ? bodyWrite() : ''));
      slot.innerHTML = head() + `<section class="surface sec tg-card">${cards.join('')}${i === 3 ? step(4, 'Sent', 'open', '', bodySent()) : ''}</section>` + mineBlock();
      if (i === 2) { setupForm(); wireForm(); }
    }

    function setupForm() {
      const p = st.pitch; const cur = p.pending ?? p.live ?? {};
      const mineGroups = Object.keys(N.groups).filter((g) => N.groups[g].alts.includes(p.project));
      const opts = Object.entries(N.groups).sort((a, b) => a[1].n.localeCompare(b[1].n)).map(([id, g]) => [id, g.n]);
      const pk = picker($('#tagGroups', slot), opts, { selected: cur.groups ?? mineGroups, none: 'Pick one or more groups', labelledBy: 'tgL', onChange: before,
        // WHY (Destin, round 4): a project that fits no listed group can ask for one, with its name already filled in.
        action: ['Suggest a new group…', `${OI.repo}/issues/new?template=4-new-group.yml&projects=${encodeURIComponent(p.projectName)}`] });
      function before() {
        const gs = pk.value();
        // What already exists in the chosen groups, so the description can say what is different (inside "More").
        $('#before', slot).innerHTML = gs.length ? gs.map((g) => {
          const G = N.groups[g]; const others = G.alts.filter((a) => a !== p.project).map((a) => N.projects[a] ?? a);
          return `<div class="beforeg"><div class="label">Already in ${esc(G.n)}</div><p class="small2">${others.length ? `${others.slice(0, 8).map(esc).join(', ')}${others.length > 8 ? ` and ${others.length - 8} more` : ''}` : 'Nothing else yet.'}</p></div>`;
        }).join('') : '';
      }
      before();
      $('#tgDiff', slot).value = cur.differs ?? '';
      for (const [k] of PITCH_PARTS) $(`#tg_${k}`, slot).value = cur[k] ?? '';
      st.getForm = () => ({ groups: pk.value(), differs: $('#tgDiff', slot).value, ...Object.fromEntries(PITCH_PARTS.map(([k]) => [k, $(`#tg_${k}`, slot).value])) });
    }
    // The Send button says why it is grey (guide).
    function wireForm() {
      const send = $('[data-send]', slot), need = $('[data-need]', slot);
      const update = () => {
        const f = st.getForm(); const miss = [!f.differs.trim() && 'a description', !f.groups.length && 'a group'].filter(Boolean);
        if (send) send.disabled = !!miss.length; if (need) need.textContent = miss.length ? `Still needed: ${miss.join(', ')}.` : '';
      };
      slot.addEventListener('input', update); slot.addEventListener('change', update); $('#tagGroups', slot)?.addEventListener('click', () => setTimeout(update, 0)); update();
    }

    slot.addEventListener('input', (e) => { if (e.target.id === 'tagLink') st.link = e.target.value; });
    slot.addEventListener('click', async (e) => {
      const t = e.target; st.error = '';
      try {
        const cp = t.closest('[data-copy]'); if (cp) { await navigator.clipboard?.writeText(cp.dataset.copy); return toast('Copied.'); }
        if (t.closest('[data-go]')) {
          const r = await api.pitchStart(st.link.trim());
          if (!r.listed) { st.stage = 'notlisted'; st.name = r.name; } else { st.pitch = r.pitch; st.stage = r.pitch.verified ? 'form' : 'proof'; }
          await load(); return draw();
        }
        if (t.closest('[data-back]')) { st.stage = 'start'; return draw(); }
        if (t.closest('[data-cancel]') || t.closest('[data-done]')) { st.stage = 'start'; await load(); return draw(); }
        if (t.closest('[data-verify]')) { st.pitch = await api.pitchVerify(st.pitch.id); st.stage = 'form'; await load(); return draw(); }
        if (t.closest('[data-send]')) { st.pitch = await api.pitchSave(st.pitch.id, st.getForm()); st.stage = 'sent'; await load(); return draw(); }
        const row = t.closest('[data-id]');
        if (row && t.closest('[data-edit]')) { st.pitch = st.mine.find((x) => String(x.id) === row.dataset.id); st.stage = st.pitch.verified ? 'form' : 'proof'; return draw(); }
        if (row && t.closest('[data-remove]')) return ui.confirmBox('Remove your pitch?', 'This takes it off the site and forgets that you proved the project is yours. You can tag it again later.', 'Remove', async () => { await api.pitchDelete(row.dataset.id); await load(); draw(); }, true);
      } catch (err) { if (err.status === 401) return signIn(); st.error = err.message || "That didn't work. Try again."; draw(); }
    });
    await load(); draw();
    if (st.link && q.get('repo')) $('#tagLink', slot)?.focus();
  }

  // ───────── Your suggestions ─────────
  const SUG = {
    waiting: ['info', 'Waiting for a mod', 'In the queue. A mod will look at it.'],
    'needs-mod': ['warn', 'A mod needs to look', "The robot found something a person should check. A mod will pick it up."],
    approved: ['ok', 'Approved', 'Approved. It goes live a few minutes after the change is merged.'],
    live: ['ok', 'Live', 'It is on the site now.'],
    'turned-down': ['', 'Turned down', ''],
  };
  const SUG_KIND = { 'add-project': 'Add a project', 'add-closed-app': 'Add a closed app', 'new-group': 'New group', fix: 'Fix', report: 'Report' };
  async function renderMySuggestions(slot) {
    const { user } = await getMe();
    if (!user) { slot.innerHTML = `<div class="surface sec signin-card"><p class="small2">Sign in with GitHub to see where each one stands.</p><button class="btn md primary full" type="button" data-signin>Sign in with GitHub</button></div>`; return; }
    let res; try { res = await api.mySuggestions(); } catch (e) { slot.innerHTML = `<section class="surface sec"><div class="callout warn">${esc(e.message)} <button class="btn sm secondary" type="button" data-retry>Try again</button></div></section>`; $('[data-retry]', slot).onclick = () => renderMySuggestions(slot); return; }
    slot.innerHTML = res.items.length
      ? `<section class="surface sec"><h2 class="h-large">${res.items.length} ${res.items.length === 1 ? 'suggestion' : 'suggestions'}</h2><div class="stack">${res.items.map((x) => {
        const [tone, label, text] = SUG[x.status] ?? SUG.waiting;
        return `<div class="lvl1 modrow"><div class="nr-main"><a class="rt" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>
          <div class="nr-meta"><span class="chip">${esc(SUG_KIND[x.kind] ?? 'Suggestion')}</span><span class="pill ${tone}">${tone === 'ok' ? '<i></i>' : ''}${label}</span><span class="muted11">${esc(ago(x.created))}</span></div>
          <p class="small2">${x.status === 'turned-down' ? esc(x.reason || 'A mod closed this without a reason. Open it on GitHub to read the conversation.') : esc(text)}${x.liveUrl ? ` <a href="${esc(x.liveUrl)}">See it on the site</a>.` : ''}</p></div>
          <a class="btn sm secondary" href="${esc(x.url)}" target="_blank" rel="noopener">Open on GitHub</a></div>`;
      }).join('')}</div></section>`
      : `<section class="surface sec"><h2 class="h-large">Nothing yet</h2><p class="small2">When you suggest a project, a closed app or a group, it shows up here, and you'll see when it goes live. Suggestions are made on GitHub with the same account you signed in with.</p></section>`;
  }

  // ───────── Mod page: Suggestions tab ─────────
  async function renderModTabs(bar) {
    const { user } = await getMe(); if (!user?.isMod) return;
    const posts = $('[data-mod]'); const pane = $('[data-mod-suggest]'); if (!posts || !pane) return;
    bar.hidden = false;
    const show = (which) => {
      bar.innerHTML = `<div class="fchips" role="tablist">${[['posts', 'Posts'], ['suggestions', 'Suggestions']].map(([k, v]) => `<button class="fchip${k === which ? ' sel' : ''}" type="button" role="tab" aria-selected="${k === which}" data-tab="${k}">${v}</button>`).join('')}</div>`;
      posts.hidden = which !== 'posts'; pane.hidden = which !== 'suggestions';
      if (which === 'suggestions') drawSuggest(pane);
      try { history.replaceState(null, '', which === 'posts' ? location.pathname : '#suggestions'); } catch { /* fine */ }
    };
    bar.onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab); };
    show(location.hash === '#suggestions' ? 'suggestions' : 'posts');
  }
  const CLAIM_FLAG = { fork: 'A copy (fork) of another project', 'high-profile': 'Well-known project', 'owner-unverified': 'Ownership only shown by a file', 'looks-different': 'Far fewer stars than listed' };
  const VERDICT = { ok: ['ok', 'Robot: nothing to flag'], 'needs-mod': ['warn', 'Robot: needs a mod'], unchecked: ['info', 'Robot: not checked yet'] };
  async function drawSuggest(pane) {
    pane.innerHTML = '<div class="surface sec"><div class="empty">Loading…</div></div>';
    const [sug, pit] = await Promise.all([api.modSuggestions().catch((e) => ({ error: e.message })), api.modPitches().catch((e) => ({ error: e.message }))]);
    const tokenDoc = `${OI.repo}/blob/main/docs/tokens-and-secrets.md`;
    pane.innerHTML = `
      <section class="surface sec"><div class="sec-head"><div><h2 class="h-large">Developer pitches<span class="count">${pit.items?.length ?? 0}</span></h2><p class="desc12">From "Tag my project". Each owner proved the project is theirs. Nothing shows until you approve it.</p></div></div>
        ${pit.error ? `<div class="callout warn">${esc(pit.error)}</div>` : pit.items.length ? `<div class="stack">${pit.items.map((x) => {
          const p = x.pending ?? x.live; const need = x.needsConfirm && !x.confirmed;
          return `<div class="lvl1 modrow" data-pid="${x.id}"><div class="nr-main"><a class="rt" href="${BASE}p/${esc(x.project)}/">${esc(x.projectName)}</a>
            <div class="nr-meta"><span class="chip">@${esc(x.owner)}</span><span class="chip">${x.proof === 'own-account' ? 'Under their own account' : 'Proved with a file'}</span>${x.pending ? (x.live ? '<span class="pill info">Replaces the live version</span>' : '<span class="pill warn"><i></i>New</span>') : '<span class="pill ok"><i></i>Showing now</span>'}
              <a class="chip" href="https://${esc(x.repo)}" target="_blank" rel="noopener">${esc(x.repo)}</a>${x.stars != null ? `<span class="chip">${x.stars} stars</span>` : ''}<span class="chip">account ${x.ownerDays} days old</span>
              ${(x.flags ?? []).map((f) => `<span class="pill warn"><i></i>${esc(CLAIM_FLAG[f] ?? f)}</span>`).join('')}${x.flag ? `<span class="pill warn"><i></i>Filter: ${esc(x.flag)}</span>` : ''}${x.rivalClaims ? '<span class="pill warn"><i></i>Another claim is already showing here</span>' : ''}${x.confirmed ? `<span class="pill ok"><i></i>Owner confirmed${x.confirmedBy ? ` by @${esc(x.confirmedBy)}` : ''}</span>` : ''}</div>
            ${need ? '<div class="callout warn">Before this can show, check that @' + esc(x.owner) + ' really owns or administers the project (their GitHub profile, the organization page, the project\'s own website), then press <b>Confirm owner</b>.</div>' : ''}
            <div class="pitchbox">${p ? pitchBody(p) : ''}</div></div>
            <div class="btns-row">${x.pending ? '<button class="btn sm secondary" type="button" data-pact="reject">Turn down…</button>' : ''}<button class="btn sm secondary" type="button" data-pact="revoke">Revoke…</button>${need ? '<button class="btn sm primary" type="button" data-pact="confirm-claim">Confirm owner</button>' : ''}${x.pending ? `<button class="btn sm primary" type="button" data-pact="approve"${need ? ' disabled title="Confirm the owner first"' : ''}>Approve</button>` : ''}</div></div>`;
        }).join('')}</div>` : '<div class="callout info">No pitches waiting.</div>'}</section>
      <section class="surface sec"><div class="sec-head"><div><h2 class="h-large">Suggestions on GitHub<span class="count">${sug.items?.length ?? 0}</span></h2><p class="desc12">Open suggestions, oldest first, with the robot's verdict. To approve one, open it and add the <code>approved</code> label; the robot does the rest. A one-click Approve here needs a GitHub App key, see <a href="${esc(tokenDoc)}" target="_blank" rel="noopener">what it would need</a>.</p></div></div>
        ${sug.error ? `<div class="callout warn">${esc(sug.error)}</div>` : sug.items.length ? `<div class="stack">${sug.items.map((x) => {
          const [tone, label] = VERDICT[x.verdict] ?? VERDICT.unchecked;
          return `<div class="lvl1 modrow"><div class="nr-main"><a class="rt" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>
            <div class="nr-meta"><span class="chip">${esc(SUG_KIND[x.kind] ?? 'Suggestion')}</span><span class="pill ${tone}">${tone === 'ok' ? '<i></i>' : ''}${label}</span><span class="muted11">@${esc(x.author)} · ${esc(ago(x.created))}${x.votes ? ` · ${x.votes} want this` : ''}</span>${x.status === 'approved' ? '<span class="pill ok"><i></i>Approved, waiting to be merged</span>' : ''}</div></div>
            <a class="btn sm ${x.verdict === 'ok' ? 'primary' : 'secondary'}" href="${esc(x.url)}" target="_blank" rel="noopener">${x.verdict === 'ok' ? 'Review and approve' : 'Review'} on GitHub</a></div>`;
        }).join('')}</div>` : '<div class="callout info">No open suggestions.</div>'}</section>`;
    pane.onclick = async (e) => {
      const b = e.target.closest('[data-pact]'); if (!b) return; const id = b.closest('[data-pid]').dataset.pid;
      try {
        if (b.dataset.pact === 'confirm-claim') { await api.modPitchAct(id, 'confirm-claim'); toast('Owner confirmed.'); return drawSuggest(pane); }
        if (b.dataset.pact === 'revoke') return ui.ask('Revoke this claim', 'Why? It comes off the site now, and they have to prove ownership again.', { area: true, ok: 'Revoke' }, async (v) => { await api.modPitchAct(id, 'revoke', v); drawSuggest(pane); });
        if (b.dataset.pact === 'approve') { await api.modPitchAct(id, 'approve'); toast('Approved. It is live now.'); return drawSuggest(pane); }
        ui.ask('Turn this pitch down', 'Why? The developer will see this so they can fix it.', { area: true, ok: 'Turn down' }, async (v) => { await api.modPitchAct(id, 'reject', v); drawSuggest(pane); });
      } catch (err) { oops(err); }
    };
  }

  // After signing in, finish what was clicked.
  async function finishPending() {
    let a; try { a = JSON.parse(sessionStorage.getItem(PENDING)); sessionStorage.removeItem(PENDING); } catch { return; }
    if (!a || a.at !== location.pathname + location.search) return;
    const { user } = await getMe(); if (!user) return;
    try { if (a.type === 'request') { await api.requestVote(a.key, true); toast('Signed in, and your request counted.'); renderRequestButtons(); $$('[data-most-requested]').forEach(renderMostRequested); } } catch (e) { toast(e.message); }
  }


  // ───────── Contributor preferences: "How you'd like help" ─────────
  // WHY separate from claiming (Destin, round 5: "this shouldn't be required... an optional follow-up after they claimed that they can change whenever"): after a claim is
  // approved, the owner (and only the owner) sees one quiet row in How to help. It opens a settings-style popup: a small label over a card per question, answers saved as they
  // change (the guide's Settings rule: no Save button), editable any time. Everyone else sees the answers as rows under How to help.
  const AI_OPTS = [['non-developers-welcome', 'Non-developers welcome', 'AI-written changes are fine if the person sending them stands behind them.'], ['traditional-developers-only', 'Traditional developers only', 'AI help is allowed, but the person must understand and review everything.'], ['not-accepted', 'Not accepted', 'No AI-written code or text.'], ['see-policy', 'See policy', 'Our own rules are more specific. Say them below.']];
  const AI_TICK = [['beginner', 'No AI on beginner tasks'], ['own-words', 'Write issues and pull-request descriptions yourself'], ['no-agents', 'No fully automatic agents']];
  const START = [['pr', 'Just send a pull request'], ['issue', 'Open an issue first'], ['forum', 'Start a conversation in our forum or chat'], ['email', 'Email us'], ['closed', "We're not taking outside code right now"]];
  const WANT = [['code', 'Code'], ['design', 'Design'], ['docs', 'Documentation'], ['translation', 'Translation'], ['testing', 'Testing'], ['triage', 'Sorting issues'], ['co-maintainers', 'Co-maintainers'], ['funding', 'Funding']];
  const NEWB = [['help', "Yes, we'll point you to a task and answer questions", "We'll help you"], ['self', "Yes, but you'll mostly be on your own", 'Self-guided'], ['experienced', 'Not right now: experienced contributors only', 'Experienced contributors only']];
  const DISC = [['none', 'No need to say'], ['pr', 'Mention it in the pull request'], ['form', 'Tick the box on our pull-request form'], ['commit', 'Add an "Assisted-by:" line to each commit']];
  const SIGN = [['none', 'Nothing'], ['dco', 'A sign-off line on each commit'], ['cla', 'A contributor agreement before the first merge']];
  const REVW = [['days', 'Within a few days'], ['weeks', 'Within a few weeks'], ['month', 'A month or more (small team)'], ['hide', "Don't show this"]];
  const lab = (list, v) => (list.find((o) => o[0] === v) ?? [])[1] ?? '';
  const WORDS = { start: { pr: 'Send a pull request', issue: 'Open an issue first', forum: 'Talk in their forum or chat first', email: 'Email them first', closed: 'Not taking outside code right now' }, newb: { help: "We'll help you", self: 'Newcomers welcome, self-guided', experienced: 'Experienced contributors' }, rev: { days: 'Usually within days', weeks: 'Usually within weeks', month: 'Can take a month or more' }, sign: { none: 'Nothing to sign', dco: 'Each commit needs a sign-off line from a person', cla: 'Sign their contributor agreement first' } };

  // What visitors see. The AI answers go inside the AI fold (or make one), the rest are plain rows.
  function prefRows(p, mine) {
    const row = (name, html) => `<div class="frowx prow"><div class="fx-main"><span class="fx-name">${name}</span><span class="fx-note">${html}</span></div></div>`;
    const out = [];
    if (p.start) out.push(row('Start', `${esc(WORDS.start[p.start])}${p.startLink ? ` · ${/^https?:/.test(p.startLink) ? `<a href="${esc(p.startLink)}" rel="noopener">Link</a>` : `<a href="mailto:${esc(p.startLink)}">${esc(p.startLink)}</a>`}` : ''}${p.startSmall && p.start !== 'pr' && p.start !== 'closed' ? ' · small fixes can go straight to a pull request' : ''}`));
    if (p.wanted?.length) out.push(row('Wanted', esc(p.wanted.map((w) => lab(WANT, w).toLowerCase()).join(', '))));
    if (p.newcomers) out.push(row('Newcomers', esc(WORDS.newb[p.newcomers])));
    if (p.review && p.review !== 'hide') out.push(row('Reviews', esc(WORDS.rev[p.review])));
    if (p.note) out.push(`<p class="quiet">${esc(p.note)}</p>`);
    return out.join('');
  }
  function aiExtra(p) {
    const l = [];
    if (p.ai === 'see-policy' && p.aiPolicy) l.push(esc(p.aiPolicy));
    for (const t of p.aiTicks ?? []) l.push(esc(lab(AI_TICK, t)));
    if (p.disclose?.length && !(p.disclose.length === 1 && p.disclose[0] === 'none')) l.push(`Say so: ${esc(p.disclose.filter((d) => d !== 'none').map((d) => lab(DISC, d).toLowerCase()).join(', '))}`);
    if (p.sign && p.sign !== 'none') l.push(esc(WORDS.sign[p.sign]) + (p.signLink ? ` · <a href="${esc(p.signLink)}" rel="noopener">Link</a>` : ''));
    return l.length ? `<ul class="swsteps">${l.map((x) => `<li>${x}</li>`).join('')}</ul>` : '';
  }

  async function renderPrefs() {
    const slots = $$('[data-prefs]'); if (!slots.length || !api.prefs) return;
    const ids = [...new Set(slots.map((x) => x.dataset.project))];
    let all = {}; try { all = await api.prefs(ids); } catch { /* the page still works without them */ }
    const { user } = await getMe();
    const live = user ? await api.livePitches(ids).catch(() => ({})) : {};
    for (const slot of slots) {
      const id = slot.dataset.project; let p = all[id] ?? null;
      const owner = !!user && live[id]?.by?.toLowerCase() === user.login.toLowerCase();
      const draw = () => {
        const aiFold = slot.parentElement.querySelector('.aifold');
        if (p?.ai) {
          const pill = aiFold?.querySelector('[data-ai-pill]'); if (pill) { pill.textContent = lab(AI_OPTS, p.ai); pill.className = 'pill info'; }
          const ex = aiFold?.querySelector('[data-ai-extra]'); if (ex) ex.innerHTML = aiExtra(p);
        }
        // With no AI fold from our own research, the owner's answers make one (same look).
        const own = p?.ai && !aiFold ? `<details class="foldrow lvl1 aifold"><summary><span>AI contributions</span><span class="pill info">${esc(lab(AI_OPTS, p.ai))}</span></summary><div class="foldbody">${aiExtra(p) || '<p>See their own words in the project.</p>'}</div></details>` : '';
        slot.innerHTML = own + (p ? prefRows(p) : '') + (owner ? `<button class="foldrow lvl1 setrow" type="button" data-prefs-open><span><b>${p ? 'Contributor preferences' : 'Add contributor preferences'}</b><small>How you'd like help. Only you see this row.</small></span></button>` : '');
        slot.hidden = !slot.innerHTML.trim();
      };
      draw();
      slot.onclick = (e) => { if (e.target.closest('[data-prefs-open]')) openPrefs(id, p, (n) => { p = n; draw(); }); };
    }
  }

  function openPrefs(project, cur, done) {
    const st = { ai: '', aiPolicy: '', aiTicks: [], start: '', startLink: '', startSmall: false, wanted: [], newcomers: '', disclose: [], sign: '', signLink: '', review: '', note: '', ...(cur ?? {}) };
    const radio = (name, list, withDesc) => `<div class="popts" role="radiogroup">${list.map(([v, t, d]) => `<label class="popt"><input type="radio" name="${name}" value="${v}"${st[name] === v ? ' checked' : ''}><span class="ctl r" aria-hidden="true"></span><span class="pt"><b>${esc(t)}</b>${withDesc && d ? `<small>${esc(d)}</small>` : ''}</span></label>`).join('')}</div>`;
    const checks = (name, list) => `<div class="popts">${list.map(([v, t]) => `<label class="popt"><input type="checkbox" name="${name}" value="${v}"${st[name].includes(v) ? ' checked' : ''}><span class="ctl c" aria-hidden="true">✓</span><span class="pt"><b>${esc(t)}</b></span></label>`).join('')}</div>`;
    const card = (label, body, id = '') => `<div class="pgroup"${id ? ` id="${id}"` : ''}><span class="label">${label}</span><div class="lvl1 pcard">${body}</div></div>`;
    const field = (name, ph, shown) => `<input class="field pfield" name="${name}" placeholder="${ph}" value="${esc(st[name])}"${shown ? '' : ' hidden'}>`;
    const html = `<div class="prefs">
      ${card('Can people send you code written with AI help?', radio('ai', AI_OPTS, true) + `<textarea class="field pfield" name="aiPolicy" rows="2" maxlength="200" placeholder="Your rule, in a sentence"${st.ai === 'see-policy' ? '' : ' hidden'}>${esc(st.aiPolicy)}</textarea>` + checks('aiTicks', AI_TICK))}
      ${card('What should someone do before sending you work?', radio('start', START) + field('startLink', 'Link or email', ['forum', 'email'].includes(st.start)) + `<label class="popt psmall"${['issue', 'forum'].includes(st.start) ? '' : ' hidden'}><input type="checkbox" name="startSmall"${st.startSmall ? ' checked' : ''}><span class="ctl c" aria-hidden="true">✓</span><span class="pt"><b>Small fixes like typos can go straight to a pull request</b></span></label>`)}
      ${card('What help would you most like? Up to three.', checks('wanted', WANT))}
      ${card('Are you set up for first-time contributors?', radio('newcomers', NEWB.map(([v, t]) => [v, t])))}
      ${card('If AI helped, how should people say so?', checks('disclose', DISC), 'pDisc')}
      ${card('Do contributors need to sign anything?', radio('sign', SIGN) + field('signLink', 'Link to the agreement', st.sign === 'cla'))}
      ${card('How soon do you usually look at a new pull request?', radio('review', REVW))}
      ${card('Anything else people should know?', `<textarea class="field pfield" name="note" rows="2" maxlength="200" placeholder="One short note, up to 200 characters"></textarea>`)}
      <p class="muted11 psaved" data-psaved aria-live="polite">Changes save as you make them.</p></div>`;
    const { el } = dialog("How you'd like help", html, { size: 'medium' });
    el.querySelector('textarea[name=note]').value = st.note;
    let timer = null;
    const refresh = () => {
      el.querySelector('#pDisc').hidden = st.ai === 'not-accepted';
      el.querySelector('textarea[name=aiPolicy]').hidden = st.ai !== 'see-policy';
      el.querySelector('input[name=startLink]').hidden = !['forum', 'email'].includes(st.start);
      el.querySelector('.psmall').hidden = !['issue', 'forum'].includes(st.start);
      el.querySelector('input[name=signLink]').hidden = st.sign !== 'cla';
      const full = st.wanted.length >= 3; // WHY: the question says up to three
      el.querySelectorAll('input[name=wanted]').forEach((i) => { i.disabled = full && !i.checked; });
    };
    const save = async () => {
      const note = el.querySelector('[data-psaved]');
      try { const n = await api.prefsSave(project, st); done(n); note.textContent = 'Saved'; } catch (e) { note.textContent = e.message || "Couldn't save. Try again."; }
    };
    const change = (e) => {
      const t = e.target; if (!t.name) return;
      if (t.type === 'radio') st[t.name] = t.value;
      else if (t.type === 'checkbox' && t.name === 'startSmall') st.startSmall = t.checked;
      else if (t.type === 'checkbox') st[t.name] = t.checked ? [...st[t.name], t.value] : st[t.name].filter((v) => v !== t.value);
      else st[t.name] = t.value;
      refresh();
      // Text saves a moment after typing stops; choices save at once.
      clearTimeout(timer); timer = setTimeout(save, t.type === 'radio' || t.type === 'checkbox' ? 0 : 600);
    };
    el.addEventListener('change', change); el.addEventListener('input', (e) => { if (e.target.matches('.pfield')) change(e); });
    refresh();
  }

  renderRequestButtons();
  renderPrefs();
  $$('[data-most-requested]').forEach(renderMostRequested);
  renderPitches();
  $$('[data-tag]').forEach(renderTag);
  $$('[data-my-suggestions]').forEach(renderMySuggestions);
  $$('[data-mod-tabs]').forEach(renderModTabs);
  finishPending();
})();

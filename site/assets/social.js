// Voting, notes and boards (Destin, Oct 27). Pages carry empty placeholders (data-account, data-notes, data-rate…);
// this file fills them from the server: window.OI.api, the real one (api.js) or the preview's pretend one (fake-api.js).
// The server decides who may do what (docs/server-rules.md): each note arrives with a `can` list, and this file only
// shows the buttons it allows. Everything people write is shown as plain text (links made safe), never as page code.
(function () {
  const OI = window.OI; const api = OI.api; if (!api) return;
  const BASE = OI.base || '/'; const esc = OI.esc; const toast = OI.toast;
  const $ = (s, el = document) => el.querySelector(s); const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  let names = null; const loadNames = () => names || (names = fetch(BASE + 'data/names.json').then((r) => r.json()));
  let meP = null; const getMe = (fresh) => (fresh || !meP ? (meP = api.me()) : meP); // → { user, rules }

  const ago = (t) => { const s = (Date.now() - t) / 1000; if (s < 60) return 'just now'; const m = s / 60, h = m / 60, d = h / 24;
    return m < 60 ? `${Math.floor(m)} min ago` : h < 24 ? `${Math.floor(h)} h ago` : d < 30 ? `${Math.floor(d)} ${Math.floor(d) === 1 ? 'day' : 'days'} ago` : new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); };
  const KIND = { missing: 'Missing feature', wish: 'Wish', talk: 'Discussion' };
  // WHY words on the vote button (review, Oct 27): a bare ▲ with a number didn't read as "vote" to newcomers.
  const VOTE_WORD = { missing: 'Me too', wish: 'I want this' };
  const STATUS = { fixed: ['ok', 'Fixed'], wontfix: ['', "Won't happen"], duplicate: ['', 'Duplicate'] };
  const icon = { gh: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z"/></svg>',
    up: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"/><path d="M7 10l4-7a2 2 0 0 1 2 2v4h5.5a2 2 0 0 1 2 2.3l-1.2 7a2 2 0 0 1-2 1.7H7"/></svg>' };
  icon.down = icon.up.replace('aria-hidden', 'style="transform:scaleY(-1)" aria-hidden');

  // People's words become text nodes; only http(s) links become links, marked as user content.
  function fillText(el, text) {
    el.textContent = '';
    for (const part of String(text ?? '').split(/(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)])/)) {
      if (/^https?:\/\//.test(part)) { const a = document.createElement('a'); a.href = part; a.rel = 'nofollow ugc noopener'; a.target = '_blank'; a.textContent = part.replace(/^https?:\/\//, ''); el.append(a); }
      else el.append(part);
    }
  }
  const shortLink = (l) => esc(l.replace(/^https?:\/\//, '').slice(0, 60));

  // ── Signing in, without losing what you were doing ──
  // WHY (review): clicking "Me too" while signed out used to bounce you through sign-in and drop the vote.
  // The action is remembered for this tab and finished once you're back.
  const PENDING = 'ose-pending';
  const remember = (action) => { try { if (action) sessionStorage.setItem(PENDING, JSON.stringify({ ...action, at: location.pathname + location.search })); } catch { /* fine */ } };
  function signIn(action) {
    remember(action);
    if (!api.demo) { location.href = `${api.url}/auth/login?return=${encodeURIComponent(location.href)}`; return; }
    dialog('Sign in (preview)', `<p class="small2">On the real site this opens GitHub, which asks you to share only your public username. Here, pick who to be:</p>
      <div class="stack"><button class="btn md primary" type="button" data-as="you-sample" data-days="400">An account that's a year old</button>
      <button class="btn md secondary" type="button" data-as="new-sample" data-days="3">A brand-new account (3 days old)</button></div>`, { size: 'narrow', onOpen: (el, close) => {
      el.addEventListener('click', async (e) => { const b = e.target.closest('[data-as]'); if (!b) return; await api.signIn(b.dataset.as, +b.dataset.days); close(); location.reload(); });
    } });
  }
  async function finishPending() {
    let a; try { a = JSON.parse(sessionStorage.getItem(PENDING)); sessionStorage.removeItem(PENDING); } catch { return; }
    if (!a || a.at !== location.pathname + location.search) return;
    const { user } = await getMe(); if (!user) return;
    try {
      if (a.type === 'vote') { await api.vote(a.id, true); toast('Signed in, and your vote counted.'); rerender(); }
      if (a.type === 'rate') { await api.rate(a.group, a.project, a.value); toast('Signed in, and your answer counted.'); renderRatings(); }
      if (a.type === 'note') composer(a.ctx);
      if (a.type === 'reply') { const t = $('#replyText'); if (t) { t.value = a.text ?? ''; t.focus(); } }
    } catch (e) { toast(e.message); }
  }
  // A refusal: "sign in first" opens sign-in (remembering the action); anything else shows what the server said.
  const oops = (e, action) => { if (e.status === 401) return signIn(action); toast(e.message || "That didn't work. Try again."); };

  // ── Popups (the site's Dialog look): title bar, body, buttons at the bottom right ──
  function dialog(title, bodyHtml, { size = 'medium', onOpen } = {}) {
    const scrim = document.createElement('div'); scrim.className = 'scrim open';
    scrim.innerHTML = `<div class="surface dialog ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="bar"><div class="t">${esc(title)}</div><button class="icon-btn" type="button" data-close aria-label="Close">✕</button></div><div class="body">${bodyHtml}</div></div>`;
    const close = () => scrim.remove();
    scrim.addEventListener('click', (e) => { if (e.target === scrim || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
    document.body.appendChild(scrim); onOpen?.(scrim, close); $('input,textarea,button.primary', scrim)?.focus(); return { el: scrim, close };
  }
  const confirmBox = (title, text, yes, run, danger) => dialog(title, `<p class="body2">${text}</p><div class="dlg-btns"><button class="btn md secondary" type="button" data-close>Cancel</button><button class="btn md ${danger ? 'danger' : 'primary'}" type="button" data-yes>${yes}</button></div>`,
    { size: 'narrow', onOpen: (el, close) => $('[data-yes]', el).addEventListener('click', async () => { try { await run(); close(); } catch (e) { oops(e); } }) });
  const ask = (title, label, opts, run) => dialog(title, `<div><label class="label" for="askIn">${label}</label>${opts.area ? `<textarea class="field" id="askIn" rows="5" maxlength="4000"></textarea>` : `<input class="field" id="askIn" placeholder="${esc(opts.placeholder ?? '')}" maxlength="500">`}${opts.hint ? `<p class="fieldhint">${opts.hint}</p>` : ''}</div>
      <div class="dlg-btns"><button class="btn md secondary" type="button" data-close>Cancel</button><button class="btn md primary" type="button" data-ok>${opts.ok ?? 'Send'}</button></div>`,
    { size: opts.area ? 'medium' : 'narrow', onOpen: (el, close) => { if (opts.value) $('#askIn', el).value = opts.value; $('[data-ok]', el).addEventListener('click', async () => { try { await run($('#askIn', el).value); close(); } catch (e) { oops(e); } }); } });

  // ── The account button, and a line for new accounts ──
  // WHY a numbered menu per slot: the home page has two account buttons (the hero's, and the hidden top bar's);
  // sharing one menu name made the visible avatar open the hidden menu, so nothing appeared.
  let acctN = 0;
  async function renderAccount(slot) {
    const { user } = await getMe(); const mid = `acctMenu${++acctN}`;
    if (!user) { slot.innerHTML = `<button class="btn sm secondary" type="button" data-signin>${icon.gh}Sign in</button>`; return; }
    slot.innerHTML = `<div class="dd"><button class="avatar acct-btn" type="button" data-menu="${mid}" aria-haspopup="menu" aria-expanded="false" title="@${esc(user.login)}">${esc(user.login[0].toUpperCase())}</button>
      <div class="menu acct-menu" id="${mid}" role="menu">
        <div class="menu-note">Signed in as <b>@${esc(user.login)}</b></div>
        <a class="mi" role="menuitem" href="${BASE}suggestions/">Your suggestions</a>
        <a class="mi" role="menuitem" href="${BASE}tag/">Tag my project</a>
        ${user.isMod ? `<a class="mi" role="menuitem" href="${BASE}mod/">Mod tools</a>` : ''}
        ${api.demo ? '<button class="mi" type="button" data-demo-reset>Preview: start over</button>' : ''}
        <button class="mi" type="button" data-signout>Sign out</button>
        <div class="menu-sep"></div>
        <button class="mi danger" type="button" data-delete-account>Delete my account…</button>
      </div></div>`;
  }
  // WHY (review): new accounts saw working-looking buttons that only failed when clicked. Say it once, up front.
  async function renderNewAccountLine() {
    const { user, rules } = await getMe(); const page = $('main.page'); if (!user || !page) return;
    const wait = rules.minAgeDays - user.accountDays;
    const lines = [user.banned ? 'This account can no longer post or vote here.' : null,
      !user.banned && wait > 0 ? `Your GitHub account is ${user.accountDays} days old: you can vote, rate and confirm in ${wait} ${wait === 1 ? 'day' : 'days'}.` : null,
      !user.banned && user.firstPostHeld ? 'Your first post, a note or a reply, waits for a mod before others see it. After that, your posts appear right away.' : null].filter(Boolean);
    if (lines.length) page.insertAdjacentHTML('afterbegin', `<div class="surface notice-line"><span class="pill info">New account</span><p class="small2">${lines.join(' ')}</p></div>`);
  }
  document.addEventListener('click', async (e) => {
    if (e.target.closest('[data-signin]')) return signIn();
    if (e.target.closest('[data-signout]')) { await api.signOut(); location.reload(); }
    if (e.target.closest('[data-demo-reset]')) { await api.reset(); location.reload(); }
    if (e.target.closest('[data-delete-account]')) confirmBox('Delete your account?', "This removes everything you've posted here, your votes and your answers. Your GitHub account isn't touched. This can't be undone.", 'Delete everything', async () => { await api.deleteAccount(); location.href = BASE; }, true);
  });

  // "Most voted": the alternatives in this job with the most "yes" answers, shown only once at least
  // 10 answers (yes or not really) exist across the job, so a couple of early votes never look like a verdict.
  const LIKED_MIN = 10;
  // WHY no strip any more (Destin, round 4: "a sort field would make more sense"): the same numbers now give every card a vote count and switch on "Most voted" in the sort menu.
  function drawLiked(boxes, all) {
    for (const el of boxes) {
      el.hidden = true;
      const rated = JSON.parse(el.dataset.alts).map(([id, name]) => ({ id, name, ...(all[`${el.dataset.group}/${id}`] ?? { up: 0, down: 0 }) }));
      const total = rated.reduce((n, r) => n + r.up + r.down, 0);
      if (total < LIKED_MIN) continue;
      const section = el.closest('section') ?? document;
      for (const r of rated) section.querySelectorAll(`.card[data-project="${r.id}"]`).forEach((c) => { c.dataset.votes = r.up; });
      document.querySelectorAll('[data-sort="votes"]').forEach((o) => { o.disabled = false; o.removeAttribute('title'); });
    }
  }
  // ── "Good replacement?" ratings, one per project per job: a chip on cards, the question on project pages ──
  async function renderRatings() {
    const chips = $$('[data-rating]'); const rows = $$('[data-rate]'); const liked = $$('[data-liked]');
    if (!chips.length && !rows.length && !liked.length) return;
    // WHY the liked strips join the same request: they need the same answers the card chips do, so the page asks once.
    const likedPairs = liked.flatMap((el) => JSON.parse(el.dataset.alts).map(([project]) => ({ group: el.dataset.group, project })));
    const pairs = [...new Map([...chips.map((el) => ({ group: el.dataset.group, project: el.dataset.project })), ...rows.map((el) => ({ group: el.dataset.group, project: el.dataset.project })), ...likedPairs].map((x) => [`${x.group}/${x.project}`, x])).values()];
    // The server answers at most 60 pairs per call, so ask in slices.
    const all = {};
    for (let i = 0; i < pairs.length; i += 60) Object.assign(all, await api.ratings(pairs.slice(i, i + 60)).catch(() => ({})));
    drawLiked(liked, all);
    for (const el of chips) {
      const r = all[`${el.dataset.group}/${el.dataset.project}`]; const t = r ? r.up + r.down : 0;
      // WHY hidden under 5 answers: "100%" from one person would mislead.
      if (t >= 5) { el.hidden = false; el.innerHTML = `${icon.up.replace(/14/g, '12')}${Math.round((r.up / t) * 100)}%`; el.title = `${r.up} of ${t} people say it does the job`; }
    }
    for (const el of rows) drawRate(el, all[`${el.dataset.group}/${el.dataset.project}`] ?? { up: 0, down: 0, mine: 0 });
  }
  // WHY a full question per job (Destin, Oct 27: "make this clearer"): a project listed in three jobs gets three
  // separate answers, and each names the closed apps it's compared with.
  async function drawRate(el, r) {
    const { user } = await getMe(); const t = r.up + r.down; const p = t >= 5 ? Math.round((r.up / t) * 100) : null;
    const locked = user && !user.canVote;
    el.innerHTML = `<div class="rate-q"><div class="rate-text"></div>
        <div class="rate-res">${p === null ? `<span class="muted11">${t ? `${t} ${t === 1 ? 'answer' : 'answers'} so far, not enough for a score` : 'No answers yet'}</span>`
          : `<div class="meter"><i style="width:${p}%"></i></div><span class="muted11"><b class="num">${p}%</b> of ${t} say yes</span>`}${r.mine ? `<span class="muted11"> · You said ${r.mine > 0 ? 'yes' : 'not really'}</span>` : ''}</div></div>
      <div class="rate-btns"><button class="btn sm secondary${r.mine > 0 ? ' on' : ''}${locked ? ' locked' : ''}" type="button" data-v="1" aria-pressed="${r.mine > 0}">${icon.up}Yes</button>
        <button class="btn sm secondary${r.mine < 0 ? ' on' : ''}${locked ? ' locked' : ''}" type="button" data-v="-1" aria-pressed="${r.mine < 0}">${icon.down}Not really</button></div>`;
    $('.rate-text', el).textContent = el.dataset.question || 'Does it do the job?';
    el.onclick = async (e) => {
      const b = e.target.closest('[data-v]'); if (!b) return; e.preventDefault();
      const v = +b.dataset.v === r.mine ? 0 : +b.dataset.v;
      try {
        await api.rate(el.dataset.group, el.dataset.project, v);
        const n = (await api.ratings([{ group: el.dataset.group, project: el.dataset.project }]))[`${el.dataset.group}/${el.dataset.project}`];
        if (!r.mine && v) toast('Thanks, your answer counted.');
        drawRate(el, n);
      } catch (err) { oops(err, { type: 'rate', group: el.dataset.group, project: el.dataset.project, value: v }); }
    };
  }

  // ── Notes lists ──
  function voteBtn(n, big) {
    if (n.kind === 'talk') return `<div class="vote static${big ? ' big' : ''}" aria-hidden="true"><b>${n.replies}</b><span>${n.replies === 1 ? 'reply' : 'replies'}</span></div>`;
    return `<button class="vote${n.mine ? ' on' : ''}${big ? ' big' : ''}" type="button" data-vote="${n.id}" aria-pressed="${n.mine}" ${n.can.vote || n.mine ? '' : 'data-locked'}><b>▲ ${n.votes}</b><span>${VOTE_WORD[n.kind]}</span></button>`;
  }
  const pills = (n) => {
    const st = STATUS[n.status];
    return [st ? `<span class="pill ${st[0]}">${st[0] === 'ok' ? '<i></i>' : ''}${st[1]}</span>` : '',
      n.status === 'open' && n.fixed ? '<span class="pill info">Someone says it\'s fixed</span>' : '',
      n.status === 'open' && n.building ? '<span class="pill info">Someone says they\'re building it</span>' : '',
      n.held ? '<span class="pill warn"><i></i>Waiting for a mod</span>' : ''].join('');
  };
  function noteRow(n, N, { showGroup }) {
    // WHY links (review): the project and job a note is about are places people want to go next.
    const where = [...n.projects.map((p) => `<a href="${BASE}p/${p}/">${esc(N.projects[p] ?? p)}</a>`), n.closedApps.length ? esc(`vs ${n.closedApps.join(', ')}`) : '',
      showGroup && N.groups[n.group] ? `<a href="${BASE}g/${n.group}/">${esc(N.groups[n.group].n)}</a>` : ''].filter(Boolean).join(' · ');
    return `<div class="rrow note-row" data-href="${BASE}n/?id=${n.id}">${voteBtn(n)}
      <div class="nr-main"><a class="rt" href="${BASE}n/?id=${n.id}">${esc(n.title)}</a>
        <div class="nr-meta"><span class="chip">${KIND[n.kind]}</span>${where ? `<span class="muted11 nr-where">${where}</span>` : ''}${pills(n)}<span class="muted11">${n.kind === 'talk' ? '' : `${n.replies} ${n.replies === 1 ? 'reply' : 'replies'} · `}${ago(n.created)}</span></div></div>
    </div>`;
  }
  async function renderNotes(slot, append) {
    const N = await loadNames(); const d = slot.dataset;
    const q = { category: d.category || undefined, group: d.group || undefined, project: d.project || undefined, kind: d.kind || undefined, status: d.status || 'open', sort: d.sort, limit: d.limit ? +d.limit : 20, cursor: append ? d.next : undefined };
    let res; try { res = await api.notes(q); } catch (e) { slot.innerHTML = `<div class="callout warn">Couldn't load notes. <button class="btn sm secondary" type="button" data-retry>Try again</button></div>`; $('[data-retry]', slot).onclick = () => renderNotes(slot); return; }
    d.next = res.next ?? '';
    if (!res.total) { slot.innerHTML = `<div class="empty">${esc(d.empty || 'Nothing here yet. Be the first to add one.')}</div>`; return; }
    const rows = res.items.map((n) => noteRow(n, N, { showGroup: !d.group })).join('');
    if (append) $('.ranked', slot).insertAdjacentHTML('beforeend', rows); else slot.innerHTML = `<div class="lvl2 ranked">${rows}</div><div class="more-row"></div>`;
    // WHY "See all" (review): a short list must say how much more there is.
    const more = $('.more-row', slot);
    more.innerHTML = res.next ? (d.moreHref ? `<a class="btn sm secondary" href="${esc(d.moreHref)}">See all ${res.total}</a>` : `<button class="btn sm secondary" type="button" data-load-more>Show more</button>`) : '';
    $('[data-load-more]', more)?.addEventListener('click', () => renderNotes(slot, true));
  }
  const rerender = () => { $$('[data-notes]').forEach((s) => renderNotes(s)); renderCounts(); if ($('[data-note-page]')) renderNotePage($('[data-note-page]')); };
  // Rows open their note; the vote button votes instead.
  document.addEventListener('click', async (e) => {
    const v = e.target.closest('[data-vote]');
    if (v) {
      e.preventDefault(); const on = !v.classList.contains('on');
      if (v.hasAttribute('data-locked') && on) { const { user, rules } = await getMe(); if (user) { toast(user.canVote ? "This note can't take votes." : `You can vote once your GitHub account is ${rules.minAgeDays} days old.`); return; } }
      try { const n = await api.vote(v.dataset.vote, on); v.classList.toggle('on', n.mine); v.setAttribute('aria-pressed', n.mine); $('b', v).textContent = `▲ ${n.votes}`; } catch (err) { oops(err, { type: 'vote', id: v.dataset.vote }); }
      return;
    }
    const row = e.target.closest('.note-row');
    if (row && !e.target.closest('a,button')) location.href = row.dataset.href;
  });

  // ── Adding a note ──
  // A dropdown in the site's style, for one choice or several; for several, it stays open while you tick.
  let pickN = 0;
  function picker(host, options, { single = false, selected = [], none = '', labelledBy, onChange, action } = {}) {
    const id = `pick${++pickN}`; let sel = new Set(selected);
    const label = () => { const ns = options.filter(([v]) => sel.has(v)).map(([, n]) => n); return ns.length ? (ns.length > 2 ? `${ns.slice(0, 2).join(', ')} and ${ns.length - 2} more` : ns.join(', ')) : none; };
    const draw = () => {
      host.innerHTML = `<div class="dd"><button class="select field-select${sel.size ? '' : ' empty'}" type="button" data-menu="${id}" aria-haspopup="listbox" aria-expanded="false"${labelledBy ? ` aria-labelledby="${labelledBy} ${id}b"` : ''}><span id="${id}b">${esc(label())}</span>${OI.chev}</button>
        <div class="menu pick-menu" id="${id}" role="listbox"${single ? '' : ' aria-multiselectable="true"'}>${action ? `<a class="mi suggest" href="${esc(action[1])}" target="_blank" rel="noopener">${esc(action[0])}</a><div class="menu-sep"></div>` : ''}${options.map(([v, n]) => `<button class="mi${sel.has(v) ? ' sel' : ''}" type="button" role="option" aria-selected="${sel.has(v)}" data-v="${esc(v)}">${single ? '' : `<span class="tick">${sel.has(v) ? '✓' : ''}</span>`}${esc(n)}</button>`).join('')}</div></div>`;
    };
    host.onclick = (e) => {
      const o = e.target.closest('.mi'); if (!o || !o.dataset.v) return; e.stopPropagation(); const v = o.dataset.v;
      if (single) { sel = new Set([v]); draw(); onChange?.(); return; }
      sel.has(v) ? sel.delete(v) : sel.add(v); draw(); $(`#${id}`, host).classList.add('open'); onChange?.();
    };
    draw(); return { value: () => [...sel] };
  }
  async function composer(ctx) {
    // WHY a fresh check: the visitor may have signed in or out in another tab since the page loaded.
    const { user } = await getMe(true); if (!user) return signIn({ type: 'note', ctx });
    const N = await loadNames();
    // Which jobs to offer: the one this page is about; on a project page, every job the project is listed in; on a board, the category's.
    const jobIds = ctx.groups ? ctx.groups.split(',') : ctx.group ? [ctx.group] : Object.keys(N.groups).filter((id) => !ctx.category || N.groups[id].c === ctx.category);
    const kinds = [['missing', 'Missing feature', 'Something a listed project can\'t do yet'], ['wish', 'Wish', 'A job nothing open does well'], ['talk', 'Discussion', 'A question or anything else']];
    const { el, close } = dialog('Add a note', `
      <div><span class="label">What kind of note?</span><div class="kindpick">${kinds.map(([k, t, h]) => `<label class="lvl1 kopt"><input type="radio" name="kind" value="${k}"${(ctx.kind ?? 'missing') === k ? ' checked' : ''}><b>${t}</b><span class="muted11">${h}</span></label>`).join('')}</div></div>
      ${jobIds.length > 1 ? '<div><span class="label" id="lGroup">Which job?</span><div class="pick" id="nGroup"></div></div>' : ''}
      <div class="two"><div data-for="missing"><span class="label" id="lProject">Which projects?</span><div class="pick" id="nProject"></div></div>
        <div><span class="label" id="lClosed">Compared with</span><div class="pick" id="nClosed"></div></div></div>
      <div><label class="label" for="nTitle">In one line</label><input class="field" id="nTitle" maxlength="140" autocomplete="off"></div>
      <div><label class="label" for="nBody">Details</label><textarea class="field" id="nBody" rows="4" maxlength="4000" placeholder="Optional"></textarea>
        <p class="fieldhint">Shown with your GitHub username. Plain text; links become clickable.${user.firstPostHeld ? ' Your first post waits for a mod before others see it.' : ''}</p></div>
      <div class="dlg-btns"><button class="btn md secondary" type="button" data-close>Cancel</button><button class="btn md primary" type="button" data-post>Post</button></div>`);
    const gPick = jobIds.length > 1 ? picker($('#nGroup', el), jobIds.map((id) => [id, N.groups[id].n]), { single: true, selected: [ctx.group && jobIds.includes(ctx.group) ? ctx.group : jobIds[0]], labelledBy: 'lGroup', onChange: () => fill() }) : null;
    const groupId = () => (gPick ? gPick.value()[0] : jobIds[0]);
    let pPick, cPick;
    const fill = () => {
      const g = N.groups[groupId()]; const kind = $('input[name=kind]:checked', el).value;
      $('[data-for=missing]', el).hidden = kind !== 'missing';
      pPick = picker($('#nProject', el), g.alts.map((p) => [p, N.projects[p]]), { selected: ctx.project && g.alts.includes(ctx.project) ? [ctx.project] : [], none: 'Pick at least one', labelledBy: 'lProject' });
      cPick = picker($('#nClosed', el), g.closed.map((c) => [c, c]), { selected: [], none: 'Not one in particular', labelledBy: 'lClosed' });
      $('#nTitle', el).placeholder = { missing: 'e.g. No live co-editing', wish: 'e.g. A phone app that edits, not just views', talk: 'e.g. Which one works best with Word files?' }[kind];
    };
    el.addEventListener('change', (e) => { if (e.target.name === 'kind') fill(); }); fill();
    $('[data-post]', el).addEventListener('click', async () => {
      const kind = $('input[name=kind]:checked', el).value; const g = groupId();
      try {
        const n = await api.addNote({ kind, category: N.groups[g].c, group: g, projects: kind === 'missing' ? pPick.value() : [], closedApps: cPick.value(), title: $('#nTitle', el).value, body: $('#nBody', el).value });
        close(); location.href = `${BASE}n/?id=${n.id}`;
      } catch (err) { oops(err); }
    });
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-add-note]'); if (b) composer({ ...b.dataset }); });

  // ── A board: one category's notes (or everything), with filters ──
  async function renderBoard(slot) {
    const N = await loadNames(); const cat = slot.dataset.category;
    // WHY from the address: "See all" on a group page opens its category board already filtered to that job.
    const state = { group: new URLSearchParams(location.search).get('group') ?? '', kind: '', status: 'open', sort: 'top' };
    const groups = Object.entries(N.groups).filter(([, g]) => !cat || g.c === cat);
    const opt = (k, v, cur) => `<button class="mi${k === cur ? ' sel' : ''}" type="button" data-k="${k}">${esc(v)}</button>`;
    const draw = () => {
      slot.innerHTML = `<div class="board-tools">
        <div class="fchips">${[['', 'Everything'], ['missing', 'Missing features'], ['wish', 'Wishes'], ['talk', 'Discussions']].map(([k, v]) => `<button class="fchip${state.kind === k ? ' sel' : ''}" type="button" data-kind="${k}">${v}</button>`).join('')}</div>
        <div class="tools">
          ${cat ? `<div class="dd"><button class="select sm" type="button" data-menu="bGroup">${esc(state.group ? N.groups[state.group].n : 'All jobs')}${OI.chev}</button><div class="menu" id="bGroup" data-f="group">${opt('', 'All jobs', state.group)}${groups.map(([id, g]) => opt(id, g.n, state.group)).join('')}</div></div>` : ''}
          <div class="dd"><button class="select sm" type="button" data-menu="bStatus">${state.status === 'open' ? 'Open' : 'Closed'}${OI.chev}</button><div class="menu" id="bStatus" data-f="status">${opt('open', 'Open', state.status)}${opt('closed', 'Closed: fixed, won\'t happen, duplicates', state.status)}</div></div>
          <div class="dd"><button class="select sm" type="button" data-menu="bSort">${state.sort === 'new' ? 'Newest' : 'Most wanted'}${OI.chev}</button><div class="menu" id="bSort" data-f="sort">${opt('top', 'Most wanted', state.sort)}${opt('new', 'Newest', state.sort)}</div></div>
        </div></div>
        <div data-notes data-category="${cat ?? ''}" data-group="${state.group}" data-kind="${state.kind}" data-status="${state.status}" data-sort="${state.sort}" data-empty="Nothing matches. Try another filter, or add the first note."></div>`;
      renderNotes($('[data-notes]', slot));
    };
    slot.addEventListener('click', (e) => {
      const k = e.target.closest('[data-kind]'); if (k) { state.kind = k.dataset.kind; draw(); return; }
      const m = e.target.closest('.menu [data-k]'); if (m) { state[m.closest('.menu').dataset.f] = m.dataset.k; draw(); }
    });
    draw();
  }

  // ── One note: its text, votes, status, replies ──
  async function renderNotePage(slot) {
    const id = new URLSearchParams(location.search).get('id'); const N = await loadNames(); const { user, rules } = await getMe();
    let n; try { n = await api.note(id); } catch (e) { slot.innerHTML = `<div class="surface sec"><h1 class="h-large">Note not found</h1><p class="small2">${esc(e.message)}</p><div><a class="btn md secondary" href="${BASE}boards/">See all boards</a></div></div>`; return; }
    document.title = `${n.title} · Open Source Everything`;
    const g = N.groups[n.group]; const c = n.can; const isOpen = n.status === 'open';
    const where = [...n.projects.map((p) => `<a class="chip link" href="${BASE}p/${p}/">${esc(N.projects[p] ?? p)}</a>`), ...n.closedApps.map((a) => `<span class="chip">vs ${esc(a)}</span>`),
      g && `<a class="chip link" href="${BASE}g/${n.group}/">${esc(g.n)}</a>`].filter(Boolean).join('');
    // The status box: what's been claimed, and the one thing this person can do about it.
    let status = '';
    if (n.kind === 'missing' && isOpen) {
      status = n.fixed
        ? `<div class="callout info"><b>@${esc(n.fixed.by)}</b> says this is fixed: <a href="${esc(n.fixed.link)}" rel="nofollow ugc noopener" target="_blank">${shortLink(n.fixed.link)}</a>. ${n.fixed.confirms} of ${rules.confirmsNeeded} people confirmed it.</div>
           ${c.confirmFixed ? '<button class="btn md secondary full" type="button" data-confirm>Confirm it\'s fixed</button>'
            : c.withdrawFixed ? `<p class="small2">Waiting for ${rules.confirmsNeeded - n.fixed.confirms} other ${rules.confirmsNeeded - n.fixed.confirms === 1 ? 'person' : 'people'} to confirm.</p><button class="btn md secondary full" type="button" data-withdraw>Take it back</button>`
            : !user ? '<button class="btn md secondary full" type="button" data-signin>Sign in to confirm</button>'
            : !user.canVote ? `<p class="small2">You can confirm once your GitHub account is ${rules.minAgeDays} days old.</p>` : '<p class="small2">You confirmed it.</p>'}`
        : `<p class="small2">Fixed in a newer version? Say so with a link that shows it. It closes once ${rules.confirmsNeeded} other people confirm, or a mod does.</p>${c.claimFixed || !user ? '<button class="btn md secondary full" type="button" data-claim>It\'s fixed now</button>' : ''}`;
    }
    if (n.kind === 'wish' && isOpen) status = n.building
      ? `<div class="callout info"><b>@${esc(n.building.by)}</b> says they're building this: <a href="${esc(n.building.link)}" rel="nofollow ugc noopener" target="_blank">${shortLink(n.building.link)}</a></div>${c.removeBuilding ? '<button class="btn md secondary full" type="button" data-unbuild>Remove this</button>' : ''}`
      : `<p class="small2">Building something that does this? Link it here, so people can follow along.</p>${c.building || !user ? '<button class="btn md secondary full" type="button" data-building>I\'m building this</button>' : ''}`;
    if (!isOpen) status = `<p class="small2">This note is closed: ${(STATUS[n.status]?.[1] ?? 'closed').toLowerCase()}.</p>`;
    const mod = c.close ? `<section class="surface sec"><h2 class="h-large">Mod tools</h2><div class="stack">
      ${isOpen ? '<button class="btn md secondary" type="button" data-status="fixed">Close as fixed</button><button class="btn md secondary" type="button" data-status="wontfix">Close: won\'t happen</button><button class="btn md secondary" type="button" data-status="duplicate">Close as a duplicate</button>' : '<button class="btn md secondary" type="button" data-status="open">Reopen</button>'}
      </div>${n.reports?.length ? `<div class="callout warn">${n.reports.length} report${n.reports.length === 1 ? '' : 's'}: ${n.reports.map((r) => esc(r.reason)).join(' · ')}</div>` : ''}</section>` : '';
    slot.innerHTML = `
    ${n.held ? `<div class="surface notice-line"><span class="pill warn"><i></i>Waiting for a mod</span><p class="small2">${user?.isMod ? (n.flag ? `The filter held this one: ${esc(n.flag)}. Approve or hide it in Mod tools.` : 'This is a first post from a new account. Approve or hide it in Mod tools.') : 'Only you can see this until a mod approves it, usually within a day or two. (New accounts, bad language and unusual links all wait for a mod.)'}</p></div>` : ''}
    <div class="surface identity note-id">
      <div class="row"><div class="nr-main">
        <div class="chiprow"><span class="chip">${KIND[n.kind]}</span>${pills({ ...n, held: false, fixed: null, building: null })}</div>
        <h1 class="h-subject"></h1>
        <div class="muted11">@${esc(n.author)} · ${ago(n.created)}${n.edited ? ' · edited' : ''}</div></div>
        ${voteBtn(n, true)}</div>
      <p class="body2 note-body"></p>
      <div class="replaces-row"><span class="muted11">About</span><div class="chiprow">${where}</div></div>
      ${c.edit ? '<div class="btns-row note-own"><button class="btn sm secondary" type="button" data-edit-note>Edit</button><button class="btn sm secondary" type="button" data-delete-note>Delete</button></div>' : ''}
    </div>
    <div class="cols"><div>
      <section class="surface sec"><div class="sec-head"><div><h2 class="h-large">Replies<span class="count">${n.replies.length}</span></h2></div></div>
        <div class="comments lvl2">${n.replies.length ? n.replies.map((r) => `<div class="cmt" data-rid="${r.id}"><div class="who"><span class="av">${esc(r.author[0].toUpperCase())}</span><span class="n">@${esc(r.author)}</span>${r.held ? '<span class="pill warn"><i></i>Waiting for a mod</span>' : ''}<span class="t">${ago(r.created)}${r.edited ? ' · edited' : ''}</span></div><p></p>${r.can.edit ? '<div class="acts"><button class="btn sm secondary" type="button" data-edit-reply>Edit</button><button class="btn sm secondary" type="button" data-delete-reply>Delete</button></div>' : ''}</div>`).join('') : '<div class="empty">No replies yet.</div>'}</div>
        ${c.reply || (!user && isOpen && !n.held) ? `<div class="lvl2 composer"><textarea id="replyText" placeholder="${user ? 'Write a reply…' : 'Sign in to reply'}" maxlength="4000"></textarea><button class="btn md primary" type="button" data-reply>Reply</button></div>` : ''}
      </section></div>
      <div>${status ? `<section class="surface sec"><h2 class="h-large">Status</h2>${status}</section>` : ''}${mod}
        ${c.report || !user ? '<section class="surface sec"><h2 class="h-large">Something wrong?</h2><p class="small2">Spam, rude, or not about open source? A mod will look.</p><button class="btn md secondary full" type="button" data-report>Report this note</button></section>' : ''}</div></div>`;
    // WHY fillText: titles, bodies and replies are other people's words; they are never read as page code.
    $('h1', slot).textContent = n.title; fillText($('.note-body', slot), n.body); $('.note-body', slot).hidden = !n.body;
    $$('.cmt p', slot).forEach((p, i) => fillText(p, n.replies[i].body));
    const re = () => renderNotePage(slot);
    slot.onclick = async (e) => {
      const t = e.target; const rid = t.closest('[data-rid]')?.dataset.rid; const reply = n.replies.find((r) => String(r.id) === rid);
      try {
        if (t.closest('[data-reply]')) {
          const text = $('#replyText', slot).value; if (!user) return signIn({ type: 'reply', text });
          const r = await api.reply(n.id, text); if (r.held) toast('Only you can see your reply until a mod approves it.'); re();
        }
        if (t.closest('[data-claim]')) { if (!user) return signIn(); ask("It's fixed now", 'A link that shows it', { placeholder: 'https://… release notes or changelog' }, async (v) => { await api.claimFixed(n.id, v); re(); }); }
        if (t.closest('[data-confirm]')) { await api.confirmFixed(n.id); toast('Thanks for confirming.'); re(); }
        if (t.closest('[data-withdraw]')) { await api.withdrawFixed(n.id); re(); }
        if (t.closest('[data-building]')) { if (!user) return signIn(); ask("I'm building this", 'Link to your project', { placeholder: 'https://github.com/you/project' }, async (v) => { await api.building(n.id, v); re(); }); }
        if (t.closest('[data-unbuild]')) { await api.removeBuilding(n.id); re(); }
        if (t.closest('[data-report]')) { if (!user) return signIn(); ask('Report this note', "What's wrong?", { placeholder: 'e.g. spam, or rude' }, async (v) => { await api.report(n.id, v); toast('Thanks. A mod will look.'); re(); }); }
        if (t.closest('[data-edit-note]')) dialog('Edit your note', `<div><label class="label" for="eTitle">In one line</label><input class="field" id="eTitle" maxlength="140"></div><div><label class="label" for="eBody">Details</label><textarea class="field" id="eBody" rows="5" maxlength="4000"></textarea><p class="fieldhint">Edited notes show "edited", so voters can tell.</p></div><div class="dlg-btns"><button class="btn md secondary" type="button" data-close>Cancel</button><button class="btn md primary" type="button" data-save>Save</button></div>`,
          { onOpen: (el, close) => { $('#eTitle', el).value = n.title; $('#eBody', el).value = n.body; $('[data-save]', el).addEventListener('click', async () => { try { await api.editNote(n.id, { title: $('#eTitle', el).value, body: $('#eBody', el).value }); close(); re(); } catch (err) { oops(err); } }); } });
        if (t.closest('[data-delete-note]')) confirmBox('Delete your note?', 'Its votes and replies go with it. This can\'t be undone.', 'Delete', async () => { await api.deleteNote(n.id); location.href = `${BASE}g/${n.group}/#missing`; }, true);
        if (t.closest('[data-edit-reply]')) ask('Edit your reply', 'Your reply', { area: true, value: reply.body, ok: 'Save', hint: 'Edited replies show "edited".' }, async (v) => { await api.editReply(n.id, reply.id, v); re(); });
        if (t.closest('[data-delete-reply]')) confirmBox('Delete your reply?', "This can't be undone.", 'Delete', async () => { await api.deleteReply(n.id, reply.id); re(); }, true);
        const s = t.closest('[data-status]'); if (s) { await api.setStatus(n.id, s.dataset.status); re(); }
      } catch (err) { oops(err); }
    };
  }

  // ── Mod tools ──
  async function renderMod(slot) {
    const N = await loadNames(); let q;
    try { q = await api.modQueue(); } catch (e) { slot.innerHTML = `<div class="surface sec"><h1 class="h-large">Mod tools</h1><p class="small2">${esc(e.status === 403 ? 'Only r/TrueOpenSource mods can open this page.' : e.message)}</p></div>`; return; }
    const titles = new Map();
    const row = (key, title, meta, btns, extra = '') => { titles.set(key, title); return `<div class="lvl1 modrow" data-key="${key}"><div class="nr-main"><a class="rt" href="${BASE}n/?id=${key.split('/')[0]}"></a><div class="nr-meta">${meta}</div>${extra}</div><div class="btns-row">${btns.map(([a, l, p]) => `<button class="btn sm ${p ? 'primary' : 'secondary'}" type="button" data-act="${a}">${l}</button>`).join('')}</div></div>`; };
    const nmeta = (n) => `<span class="chip">${KIND[n.kind]}</span><span class="muted11">@${esc(n.author)} · ${esc(N.groups[n.group]?.n ?? '')}${n.kind === 'talk' ? '' : ` · ${n.votes} votes`}</span>${n.flag ? `<span class="pill warn"><i></i>Filter: ${esc(n.flag)}</span>` : ''}`;
    const sec = (title, desc, items) => `<section class="surface sec"><div class="sec-head"><div><h2 class="h-large">${title}<span class="count">${items.length}</span></h2><p class="desc12">${desc}</p></div></div>${items.length ? `<div class="stack">${items.join('')}</div>` : '<div class="empty">Nothing waiting.</div>'}</section>`;
    slot.innerHTML = `<div class="surface identity"><div><div class="muted11">Mods</div><h1 class="h-subject">Mod tools</h1><p class="desc12" style="margin-top:4px">Everything waiting for a mod, most urgent first. Suggestions for the map itself arrive on GitHub.</p></div></div>
      ${sec('Waiting for approval', 'First posts from new GitHub accounts. Approving one trusts the account from then on.', [
        ...q.held.map((n) => row(`${n.id}`, n.title, nmeta(n), [['ban', 'Ban the account…'], ['hide', 'Hide'], ['approve', 'Approve', 1]])),
        ...q.heldReplies.map((r) => row(`${r.note.id}/${r.id}`, `Reply on: ${r.note.title}`, `<span class="chip">Reply</span><span class="muted11">@${esc(r.author)}</span>${r.flag ? `<span class="pill warn"><i></i>Filter: ${esc(r.flag)}</span>` : ''}`, [['ban', 'Ban the account…'], ['hide', 'Hide'], ['approve', 'Approve', 1]], '<p class="small2 reply-text"></p>'))])}
      ${sec('Reported', 'Notes someone flagged', q.reported.map((n) => row(`${n.id}`, n.title, nmeta(n), [['dismiss', 'Keep it'], ['hide', 'Hide', 1]], `<div class="callout warn">${n.reports.map((r) => esc(r.reason)).join(' · ')}</div>`)))}
      ${sec('Says it\'s fixed', 'Someone says a missing feature is fixed; it closes by itself at enough confirmations', q.claims.map((n) => row(`${n.id}`, n.title, nmeta(n), [['reject-fix', 'Not fixed'], ['fixed', 'Close as fixed', 1]], `<div class="small2">@${esc(n.fixed.by)}: <a href="${esc(n.fixed.link)}" rel="nofollow ugc noopener" target="_blank">${shortLink(n.fixed.link)}</a> · ${n.fixed.confirms} confirmed</div>`)))}
      ${sec('Should "Replaces fully" change?', 'Missing features with many votes. If it matters this much, the listing may only replace part of the job.', q.popular.map((n) => row(`${n.id}`, n.title, nmeta(n), [['keep', 'Keep "fully"'], ['partly', 'Suggest "partly"', 1]])))}`;
    $$('.modrow', slot).forEach((r) => { $('a.rt', r).textContent = titles.get(r.dataset.key); const p = $('.reply-text', r); if (p) fillText(p, q.heldReplies.find((x) => `${x.note.id}/${x.id}` === r.dataset.key).body); });
    slot.onclick = async (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const [id, rid] = b.closest('.modrow').dataset.key.split('/'); const act = b.dataset.act;
      const go = async () => { await api.modAct({ id, rid, action: act }); renderMod(slot); };
      try {
        if (act === 'ban') return confirmBox('Ban this account?', 'They can no longer post, vote or rate, and their posts waiting for approval are removed.', 'Ban', go, true);
        if (act === 'fixed') { await api.setStatus(id, 'fixed'); return renderMod(slot); }
        if (act === 'partly') {
          const n = q.popular.find((x) => String(x.id) === id);
          window.open(`${OI.repo}/issues/new?template=2-fix.yml&project=${encodeURIComponent(N.projects[n.projects[0]] ?? '')}&group=${encodeURIComponent(N.groups[n.group]?.n ?? '')}`, '_blank', 'noopener');
          toast('Opened a pre-filled "Fix something" form on GitHub in a new tab.');
        }
        await go();
      } catch (err) { oops(err); }
    };
  }

  // ── Small counts on cards: "3 missing features" ──
  async function renderCounts() {
    const slots = $$('[data-missing-count]'); if (!slots.length) return;
    const counts = await api.counts(slots[0].dataset.group).catch(() => ({}));
    for (const s of slots) { const c = counts[s.dataset.project] ?? 0; s.hidden = !c; s.textContent = c ? `${c} missing ${c === 1 ? 'feature' : 'features'}` : ''; }
  }

  // ── Start ──
  // WHY shared (contrib.js): "I want this too", Tag my project, Your suggestions and the mod Suggestions tab live in their own file
  // but use the same popups, sign-in and pickers, so they look and behave like everything else here.
  OI.ui = { dialog, confirmBox, ask, signIn, oops, getMe, picker, loadNames, ago, fillText, remember };
  if (api.demo) document.body.insertAdjacentHTML('afterbegin', '<div class="demo-ribbon">Preview: sample posts and pretend votes, saved only in this browser</div>');
  $$('[data-account]').forEach(renderAccount);
  renderNewAccountLine();
  $$('[data-notes]').forEach((s) => renderNotes(s));
  $$('[data-board]').forEach(renderBoard);
  $$('[data-note-page]').forEach(renderNotePage);
  $$('[data-mod]').forEach(renderMod);
  renderRatings(); renderCounts(); finishPending();
})();

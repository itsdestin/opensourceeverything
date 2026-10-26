// Voting, notes and boards (Destin, Oct 27). Pages carry empty placeholders (data-account, data-notes, data-rate…);
// this file fills them from the server: window.OI.api, the real one (api.js) or the preview's pretend one (fake-api.js).
// Everything people write is shown as plain text (textContent / esc), so nobody can plant code in a post.
(function () {
  const OI = window.OI; const api = OI.api; if (!api) return;
  const BASE = OI.base || '/'; const esc = OI.esc; const toast = OI.toast;
  const $ = (s, el = document) => el.querySelector(s); const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  let names = null; const loadNames = () => names || (names = fetch(BASE + 'data/names.json').then((r) => r.json()));
  let meP = null; const getMe = (fresh) => (fresh || !meP ? (meP = api.me().then((r) => r.user)) : meP);

  const ago = (t) => { const s = (Date.now() - t) / 1000; if (s < 60) return 'just now'; const m = s / 60, h = m / 60, d = h / 24;
    return m < 60 ? `${Math.floor(m)} min ago` : h < 24 ? `${Math.floor(h)} h ago` : d < 30 ? `${Math.floor(d)} days ago` : new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); };
  const KIND = { missing: 'Missing feature', wish: 'Wish', talk: 'Discussion' };
  const STATUS = { fixed: ['ok', 'Fixed'], building: ['info', 'Being built'], filled: ['ok', 'Filled'], wontfix: ['', "Won't happen"], duplicate: ['', 'Duplicate'] };
  const icon = { gh: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z"/></svg>',
    up: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"/><path d="M7 10l4-7a2 2 0 0 1 2 2v4h5.5a2 2 0 0 1 2 2.3l-1.2 7a2 2 0 0 1-2 1.7H7"/></svg>' };
  icon.down = icon.up.replace('aria-hidden', 'style="transform:scaleY(-1)" aria-hidden');

  // A failed call: "sign in first" opens sign-in; anything else says what the server said, in a toast.
  const oops = (e) => { if (e.status === 401) return signIn(); toast(e.message || "That didn't work. Try again."); };

  // ── Popups (the site's Dialog look): title bar, body, buttons at the bottom right ──
  function dialog(title, bodyHtml, { size = 'medium', onOpen } = {}) {
    const scrim = document.createElement('div'); scrim.className = 'scrim open';
    scrim.innerHTML = `<div class="surface dialog ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="bar"><div class="t">${esc(title)}</div><button class="icon-btn" type="button" data-close aria-label="Close">✕</button></div><div class="body">${bodyHtml}</div></div>`;
    const close = () => scrim.remove();
    scrim.addEventListener('click', (e) => { if (e.target === scrim || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
    document.body.appendChild(scrim); onOpen?.(scrim, close); $('input,textarea,select,button.primary', scrim)?.focus(); return { el: scrim, close };
  }

  // ── Signing in ──
  function signIn() {
    if (!api.demo) { location.href = `${api.url}/auth/login?return=${encodeURIComponent(location.href)}`; return; }
    // The preview can't reach GitHub, so it lets you pick who to be, to try every state.
    dialog('Sign in (preview)', `<p class="small2">On the real site this button opens GitHub, which asks you to share only your public username. Here, pick who to be:</p>
      <div class="stack"><button class="btn md primary" type="button" data-as="you-sample" data-days="400">An account that's a year old</button>
      <button class="btn md secondary" type="button" data-as="new-sample" data-days="3">A brand-new account (3 days old)</button></div>`, { size: 'narrow', onOpen: (el, close) => {
      el.addEventListener('click', async (e) => { const b = e.target.closest('[data-as]'); if (!b) return; await api.signIn(b.dataset.as, +b.dataset.days); close(); location.reload(); });
    } });
  }

  async function renderAccount(slot) {
    const user = await getMe();
    if (!user) { slot.innerHTML = `<button class="btn sm secondary" type="button" data-signin>${icon.gh}Sign in</button>`; return; }
    slot.innerHTML = `<div class="dd"><button class="avatar acct-btn" type="button" data-menu="acctMenu" aria-haspopup="menu" aria-expanded="false" title="@${esc(user.login)}">${esc(user.login[0].toUpperCase())}</button>
      <div class="menu acct-menu" id="acctMenu" role="menu">
        <div class="menu-note">Signed in as <b>@${esc(user.login)}</b>${user.canVote ? '' : `<br>Your GitHub account is ${user.accountDays} days old. You can vote and confirm at 14 days, and your first post waits for a mod.`}</div>
        ${user.isMod ? `<a class="mi" role="menuitem" href="${BASE}mod/">Mod tools</a>` : ''}
        ${api.demo ? `<button class="mi" type="button" data-demo-mod>${user.isMod ? 'Stop acting as a mod' : 'Preview: act as a mod'}</button><button class="mi" type="button" data-demo-reset>Preview: start over</button>` : ''}
        <button class="mi" type="button" data-signout>Sign out</button>
        <button class="mi" type="button" data-delete-account>Delete my account</button>
      </div></div>`;
  }
  document.addEventListener('click', async (e) => {
    if (e.target.closest('[data-signin]')) return signIn();
    if (e.target.closest('[data-signout]')) { await api.signOut(); location.reload(); }
    if (e.target.closest('[data-demo-mod]')) { const u = await getMe(); await api.setMod(!u.isMod); location.reload(); }
    if (e.target.closest('[data-demo-reset]')) { await api.reset(); location.reload(); }
    if (e.target.closest('[data-delete-account]')) {
      dialog('Delete your account?', `<p class="body2">This removes everything you've posted here, your votes and your ratings. Your GitHub account isn't touched. This can't be undone.</p>
        <div class="dlg-btns"><button class="btn md secondary" type="button" data-close>Keep my account</button><button class="btn md danger" type="button" data-really-delete>Delete everything</button></div>`, { size: 'narrow', onOpen: (el) => {
        $('[data-really-delete]', el).addEventListener('click', async () => { await api.deleteAccount().catch(oops); location.href = BASE; });
      } });
    }
  });

  // ── "Works as a replacement?" ratings: a chip on cards, buttons on project pages ──
  const pct = (r) => (r.up + r.down >= 5 ? `${Math.round((r.up / (r.up + r.down)) * 100)}%` : null);
  async function renderRatings() {
    const chips = $$('[data-rating]'); const rows = $$('[data-rate]'); if (!chips.length && !rows.length) return;
    const groups = new Map();
    for (const el of [...chips, ...rows]) (groups.get(el.dataset.group) ?? groups.set(el.dataset.group, new Set()).get(el.dataset.group)).add(el.dataset.project);
    const all = {}; await Promise.all([...groups].map(async ([g, ids]) => { all[g] = await api.ratings(g, [...ids]); }));
    for (const el of chips) {
      const r = all[el.dataset.group]?.[el.dataset.project]; const p = r && pct(r);
      // WHY hidden under 5 votes: "100%" from one person would mislead.
      if (p) { el.hidden = false; el.innerHTML = `${icon.up.replace(/14/g, '12')}${p}`; el.title = `${r.up} of ${r.up + r.down} people say it works as a replacement`; }
    }
    for (const el of rows) drawRate(el, all[el.dataset.group]?.[el.dataset.project] ?? { up: 0, down: 0, mine: 0 });
  }
  function drawRate(el, r) {
    el.innerHTML = `<span class="muted11">Works as a replacement?</span>
      <button class="btn sm secondary${r.mine > 0 ? ' on' : ''}" type="button" data-v="1" aria-pressed="${r.mine > 0}" aria-label="Yes">${icon.up}${r.up}</button>
      <button class="btn sm secondary${r.mine < 0 ? ' on' : ''}" type="button" data-v="-1" aria-pressed="${r.mine < 0}" aria-label="No">${icon.down}${r.down}</button>`;
    el.onclick = async (e) => {
      const b = e.target.closest('[data-v]'); if (!b) return; e.preventDefault();
      const v = +b.dataset.v === r.mine ? 0 : +b.dataset.v;
      try { await api.rate(el.dataset.group, el.dataset.project, v); const n = (await api.ratings(el.dataset.group, [el.dataset.project]))[el.dataset.project]; drawRate(el, n); } catch (err) { oops(err); }
    };
  }

  // ── Notes lists ──
  function noteRow(n, N, { showGroup }) {
    const where = [(n.projects ?? []).map((p) => N.projects[p]).join(', '), n.closedApps?.length ? `vs ${n.closedApps.join(', ')}` : null, showGroup ? N.groups[n.group]?.n : null].filter(Boolean).join(' · ');
    const st = STATUS[n.status];
    const claim = n.status === 'open' && n.fixed ? '<span class="pill info">Someone says it\'s fixed</span>' : '';
    return `<div class="rrow note-row" data-href="${BASE}n/?id=${n.id}">
      ${n.kind === 'talk' ? `<div class="vote static" aria-hidden="true"><span>💬</span>${n.replies}</div>` : `<button class="vote${n.mine ? ' on' : ''}" type="button" data-vote="${n.id}" aria-pressed="${n.mine}" title="Me too: this matters to me"><span>▲</span>${n.votes}</button>`}
      <div class="nr-main"><a class="rt" href="${BASE}n/?id=${n.id}">${esc(n.title)}</a>
        <div class="nr-meta"><span class="chip">${KIND[n.kind]}</span>${where ? `<span class="muted11">${esc(where)}</span>` : ''}${st ? `<span class="pill ${st[0]}">${st[0] === 'ok' ? '<i></i>' : ''}${st[1]}</span>` : ''}${claim}${n.held ? '<span class="pill warn"><i></i>Waiting for a mod</span>' : ''}<span class="muted11">${n.kind === 'talk' ? '' : `${n.replies} ${n.replies === 1 ? 'reply' : 'replies'} · `}${ago(n.created)}</span></div></div>
    </div>`;
  }
  async function renderNotes(slot) {
    const N = await loadNames(); const d = slot.dataset;
    const q = { category: d.category, group: d.group, project: d.project, kind: d.kind || undefined, status: d.status ?? 'open', sort: d.sort, limit: d.limit ? +d.limit : undefined };
    let list; try { list = await api.notes(q); } catch (e) { slot.innerHTML = `<div class="callout warn">Couldn't load notes. <button class="btn sm secondary" type="button" data-retry>Try again</button></div>`; $('[data-retry]', slot).onclick = () => renderNotes(slot); return; }
    if (!list.length) { slot.innerHTML = `<div class="empty">${esc(d.empty || 'Nothing here yet. Be the first to add one.')}</div>`; return; }
    slot.innerHTML = `<div class="lvl2 ranked">${list.map((n) => noteRow(n, N, { showGroup: !d.group })).join('')}</div>`;
  }
  // Rows open their note; the vote button votes instead.
  document.addEventListener('click', async (e) => {
    const v = e.target.closest('[data-vote]');
    if (v) {
      e.preventDefault();
      try { const n = await api.vote(v.dataset.vote, !v.classList.contains('on')); v.classList.toggle('on', n.mine); v.setAttribute('aria-pressed', n.mine); v.innerHTML = `<span>▲</span>${n.votes}`; } catch (err) { oops(err); }
      return;
    }
    const row = e.target.closest('.note-row');
    if (row && !e.target.closest('a,button')) location.href = row.dataset.href;
  });

  // ── A dropdown in the site's style, for one choice or several ──
  // Shows the picked names on the button; for several, the menu stays open while you tick, like a checklist.
  let pickN = 0;
  function picker(host, options, { single = false, selected = [], none = '', labelledBy, onChange } = {}) {
    const id = `pick${++pickN}`; let sel = new Set(selected);
    const label = () => { const names = options.filter(([v]) => sel.has(v)).map(([, n]) => n); return names.length ? (names.length > 2 ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} more` : names.join(', ')) : none; };
    const draw = () => {
      host.innerHTML = `<div class="dd"><button class="select field-select${sel.size ? '' : ' empty'}" type="button" data-menu="${id}" aria-haspopup="listbox" aria-expanded="false"${labelledBy ? ` aria-labelledby="${labelledBy} ${id}b"` : ''}><span id="${id}b">${esc(label())}</span>${OI.chev}</button>
        <div class="menu pick-menu" id="${id}" role="listbox"${single ? '' : ' aria-multiselectable="true"'}>${options.map(([v, n]) => `<button class="mi${sel.has(v) ? ' sel' : ''}" type="button" role="option" aria-selected="${sel.has(v)}" data-v="${esc(v)}">${single ? '' : `<span class="tick">${sel.has(v) ? '✓' : ''}</span>`}${esc(n)}</button>`).join('')}</div></div>`;
    };
    host.onclick = (e) => {
      const o = e.target.closest('.mi'); if (!o) return;
      e.stopPropagation();
      const v = o.dataset.v;
      if (single) { sel = new Set([v]); draw(); onChange?.(); return; }
      sel.has(v) ? sel.delete(v) : sel.add(v);
      draw(); $(`#${id}`, host).classList.add('open'); onChange?.();
    };
    draw();
    return { value: () => [...sel] };
  }

  // ── Adding a note ──
  async function composer(ctx) {
    // WHY a fresh check: the visitor may have signed in or out in another tab since the page loaded.
    const user = await getMe(true); if (!user) return signIn();
    const N = await loadNames();
    const groupsIn = Object.entries(N.groups).filter(([, g]) => !ctx.category || g.c === ctx.category);
    const kinds = [['missing', 'Missing feature', 'Something a listed project can\'t do yet'], ['wish', 'Wish', 'A job nothing open does well'], ['talk', 'Discussion', 'A question or anything else']];
    const { el, close } = dialog('Add a note', `
      <div><span class="label">What kind of note?</span><div class="kindpick">${kinds.map(([k, t, h], i) => `<label class="lvl1 kopt"><input type="radio" name="kind" value="${k}"${(ctx.kind ?? 'missing') === k || (!ctx.kind && i === 0) ? ' checked' : ''}><b>${t}</b><span class="muted11">${h}</span></label>`).join('')}</div></div>
      ${ctx.group ? '' : `<div><span class="label" id="lGroup">Which job?</span><div class="pick" id="nGroup" data-single></div></div>`}
      <div class="two"><div data-for="missing"><span class="label" id="lProject">Which projects?</span><div class="pick" id="nProject"></div></div>
        <div><span class="label" id="lClosed">Compared with</span><div class="pick" id="nClosed"></div></div></div>
      <div><label class="label" for="nTitle">In one line</label><input class="field" id="nTitle" maxlength="140" autocomplete="off"></div>
      <div><label class="label" for="nBody">Details</label><textarea class="field" id="nBody" rows="4" maxlength="4000" placeholder="Optional"></textarea>
        <p class="fieldhint">${user.canVote ? 'Shown with your GitHub username. Plain text only; links are fine.' : 'Your GitHub account is under 14 days old, so this waits for a mod before others see it.'}</p></div>
      <div class="dlg-btns"><button class="btn md secondary" type="button" data-close>Cancel</button><button class="btn md primary" type="button" data-post>Post</button></div>`);
    // WHY the site's own dropdowns (Destin, Oct 27): the browser's built-in ones ignored the site's font and look.
    // Projects and closed apps take several at once: one missing feature often applies to more than one of each.
    const gPick = ctx.group ? null : picker($('#nGroup', el), groupsIn.map(([id, g]) => [id, g.n]), { single: true, selected: [groupsIn[0][0]], labelledBy: 'lGroup', onChange: () => fill() });
    const groupId = () => ctx.group ?? gPick.value()[0];
    let pPick, cPick;
    const fill = () => {
      const g = N.groups[groupId()]; const kind = $('input[name=kind]:checked', el).value;
      $('[data-for=missing]', el).hidden = kind !== 'missing';
      pPick = picker($('#nProject', el), g.alts.map((p) => [p, N.projects[p]]), { selected: ctx.project && g.alts.includes(ctx.project) ? [ctx.project] : [], none: 'Pick at least one', labelledBy: 'lProject' });
      cPick = picker($('#nClosed', el), g.closed.map((c) => [c, c]), { selected: ctx.closedApp ? [ctx.closedApp] : [], none: 'Any of them', labelledBy: 'lClosed' });
      $('#nTitle', el).placeholder = { missing: 'e.g. No live co-editing', wish: 'e.g. A phone app that edits, not just views', talk: 'e.g. Which one works best with Word files?' }[kind];
    };
    el.addEventListener('change', (e) => { if (e.target.name === 'kind') fill(); }); fill();
    $('[data-post]', el).addEventListener('click', async () => {
      const kind = $('input[name=kind]:checked', el).value; const g = groupId();
      try {
        if (kind === 'missing' && !pPick.value().length) { toast('Pick the project, or projects, it applies to.'); return; }
        const n = await api.addNote({ kind, category: N.groups[g].c, group: g, projects: kind === 'missing' ? pPick.value() : [],
          closedApps: cPick.value(), title: $('#nTitle', el).value, body: $('#nBody', el).value });
        close(); location.href = `${BASE}n/?id=${n.id}`;
      } catch (err) { oops(err); }
    });
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-add-note]'); if (b) composer({ ...b.dataset }); });

  // ── A board: one category's notes, with filters ──
  async function renderBoard(slot) {
    const N = await loadNames(); const cat = slot.dataset.category;
    const state = { group: '', kind: '', status: 'open', sort: 'top' };
    const groups = Object.entries(N.groups).filter(([, g]) => !cat || g.c === cat);
    const opt = (k, v, cur) => `<button class="mi${k === cur ? ' sel' : ''}" type="button" data-k="${k}">${esc(v)}</button>`;
    const draw = () => {
      slot.innerHTML = `<div class="board-tools">
        <div class="fchips">${[['', 'Everything'], ['missing', 'Missing features'], ['wish', 'Wishes'], ['talk', 'Discussions']].map(([k, v]) => `<button class="fchip${state.kind === k ? ' sel' : ''}" type="button" data-kind="${k}">${v}</button>`).join('')}</div>
        <div class="tools">
          ${cat ? `<div class="dd"><button class="select sm" type="button" data-menu="bGroup">${esc(state.group ? N.groups[state.group].n : 'All jobs')}${OI.chev}</button><div class="menu" id="bGroup" data-f="group">${opt('', 'All jobs', state.group)}${groups.map(([id, g]) => opt(id, g.n, state.group)).join('')}</div></div>` : ''}
          <div class="dd"><button class="select sm" type="button" data-menu="bStatus">${state.status === 'open' ? 'Open' : 'Done'}${OI.chev}</button><div class="menu" id="bStatus" data-f="status">${opt('open', 'Open', state.status)}${opt('done', 'Done', state.status)}</div></div>
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
    const id = new URLSearchParams(location.search).get('id'); const N = await loadNames(); const user = await getMe();
    let n; try { n = await api.note(id); } catch (e) { slot.innerHTML = `<div class="surface sec"><h1 class="h-large">Note not found</h1><p class="small2">${esc(e.message)}</p><a class="btn md secondary" href="${BASE}boards/">See all boards</a></div>`; return; }
    document.title = `${n.title} · Open Source Everything`;
    const g = N.groups[n.group]; const st = STATUS[n.status];
    const where = [...(n.projects ?? []).map((p) => `<a class="chip" href="${BASE}p/${p}/">${esc(N.projects[p])}</a>`), ...(n.closedApps ?? []).map((c) => `<span class="chip">vs ${esc(c)}</span>`),
      g && `<a class="chip" href="${BASE}g/${n.group}/">${esc(g.n)}</a>`].filter(Boolean).join('');
    const isOpen = ['open', 'building'].includes(n.status);
    let statusCard = '';
    if (n.kind === 'missing' && isOpen) statusCard = n.fixed
      ? `<div class="callout info"><b>@${esc(n.fixed.by)}</b> says this is fixed: <a href="${esc(n.fixed.link)}" rel="noopener nofollow ugc">${esc(n.fixed.link.replace(/^https?:\/\//, '').slice(0, 60))}</a>. ${n.fixed.confirms} of 3 people confirmed it.</div>
         ${n.fixed.confirmedByMe ? '<p class="small2">You confirmed it.</p>' : '<button class="btn md secondary full" type="button" data-confirm>Confirm it\'s fixed</button>'}`
      : `<p class="small2">Fixed in a newer version? Say so with a link that shows it. It closes once 3 people confirm, or the project's team or a mod does.</p><button class="btn md secondary full" type="button" data-claim>It's fixed now</button>`;
    if (n.kind === 'wish' && n.status === 'open') statusCard = `<p class="small2">Building something that does this? Link it here, so people can follow along.</p><button class="btn md secondary full" type="button" data-building>I'm building this</button>`;
    if (n.kind === 'wish' && n.status === 'building') statusCard = `<div class="callout info"><b>@${esc(n.building.by)}</b> is building it: <a href="${esc(n.building.link)}" rel="noopener nofollow ugc">${esc(n.building.link.replace(/^https?:\/\//, '').slice(0, 60))}</a></div>`;
    if (!isOpen) statusCard = `<p class="small2">This note is ${st ? st[1].toLowerCase() : 'closed'}.</p>`;
    const modCard = user?.isMod ? `<section class="surface sec"><h2 class="h-large">Mod tools</h2><div class="stack">
      ${isOpen ? `<button class="btn md secondary" type="button" data-status="fixed">Close as fixed</button><button class="btn md secondary" type="button" data-status="wontfix">Close: won't happen</button><button class="btn md secondary" type="button" data-status="duplicate">Close as a duplicate</button>` : '<button class="btn md secondary" type="button" data-status="open">Reopen</button>'}
      </div>${n.reports?.length ? `<div class="callout warn">${n.reports.length} report${n.reports.length === 1 ? '' : 's'}: ${n.reports.map((r) => esc(r.reason)).join(' · ')}</div>` : ''}</section>` : '';
    slot.innerHTML = `
    <div class="surface identity note-id">
      <div class="row"><div class="nr-main">
        <div class="chiprow"><span class="chip">${KIND[n.kind]}</span>${st ? `<span class="pill ${st[0]}">${st[0] === 'ok' ? '<i></i>' : ''}${st[1]}</span>` : ''}${n.held ? '<span class="pill warn"><i></i>Waiting for a mod</span>' : ''}</div>
        <h1 class="h-subject"></h1>
        <div class="muted11">@${esc(n.author)} · ${ago(n.created)}</div></div>
        ${n.kind === 'talk' ? '' : `<button class="vote big${n.mine ? ' on' : ''}" type="button" data-vote="${n.id}" aria-pressed="${n.mine}" title="Me too: this matters to me"><span>▲</span>${n.votes}</button>`}</div>
      <p class="body2 note-body"></p>
      <div class="replaces-row"><span class="muted11">About</span><div class="chiprow">${where}</div></div>
    </div>
    <div class="cols"><div>
      <section class="surface sec"><div class="sec-head"><div><h2 class="h-large">Replies<span class="count">${n.replies.length}</span></h2></div></div>
        <div class="comments lvl2">${n.replies.length ? n.replies.map((r) => `<div class="cmt"><div class="who"><span class="av">${esc(r.author[0].toUpperCase())}</span><span class="n">@${esc(r.author)}</span><span class="t">${ago(r.created)}</span></div><p></p></div>`).join('') : '<div class="empty">No replies yet.</div>'}</div>
        ${isOpen || n.kind === 'talk' ? `<div class="lvl2 composer"><textarea id="replyText" placeholder="${user ? 'Write a reply…' : 'Sign in to reply'}" maxlength="4000"></textarea><button class="btn md primary" type="button" data-reply>Reply</button></div>` : ''}
      </section></div>
      <div>${statusCard ? `<section class="surface sec"><h2 class="h-large">Status</h2>${statusCard}</section>` : ''}${modCard}
        <section class="surface sec"><h2 class="h-large">Something wrong?</h2><p class="small2">Spam, rude, or not about open source? A mod will look.</p><button class="btn md secondary full" type="button" data-report>Report this note</button></section></div></div>`;
    // WHY textContent: titles, bodies and replies are other people's words; they are never read as page code.
    $('h1', slot).textContent = n.title; $('.note-body', slot).textContent = n.body; $('.note-body', slot).hidden = !n.body;
    $$('.cmt p', slot).forEach((p, i) => { p.textContent = n.replies[i].body; });
    const re = () => renderNotePage(slot);
    const ask = (title, label, placeholder, run) => dialog(title, `<div><label class="label" for="askIn">${label}</label><input class="field" id="askIn" placeholder="${placeholder}"></div><div class="dlg-btns"><button class="btn md secondary" type="button" data-close>Cancel</button><button class="btn md primary" type="button" data-ok>Send</button></div>`,
      { size: 'narrow', onOpen: (el, close) => $('[data-ok]', el).addEventListener('click', async () => { try { await run($('#askIn', el).value); close(); re(); } catch (e) { oops(e); } }) });
    slot.onclick = async (e) => {
      const t = e.target;
      try {
        if (t.closest('[data-reply]')) { if (!user) return signIn(); await api.reply(n.id, $('#replyText', slot).value); re(); }
        if (t.closest('[data-claim]')) { if (!user) return signIn(); ask("It's fixed now", 'A link that shows it', 'https://… release notes or changelog', (v) => api.claimFixed(n.id, v)); }
        if (t.closest('[data-confirm]')) { if (!user) return signIn(); await api.confirmFixed(n.id); re(); }
        if (t.closest('[data-building]')) { if (!user) return signIn(); ask("I'm building this", 'Link to your project', 'https://github.com/you/project', (v) => api.building(n.id, v)); }
        if (t.closest('[data-report]')) { if (!user) return signIn(); ask('Report this note', "What's wrong?", 'e.g. spam, or rude', async (v) => { await api.report(n.id, v); toast('Thanks. A mod will look.'); }); }
        const s = t.closest('[data-status]'); if (s) { await api.setStatus(n.id, s.dataset.status); re(); }
      } catch (err) { oops(err); }
    };
  }

  // ── Mod tools ──
  async function renderMod(slot) {
    const N = await loadNames(); let q;
    try { q = await api.modQueue(); } catch (e) { slot.innerHTML = `<div class="surface sec"><h1 class="h-large">Mod tools</h1><p class="small2">${esc(e.status === 403 ? 'Only r/TrueOpenSource mods can open this page.' : e.message)}</p></div>`; return; }
    const row = (n, btns, extra = '') => `<div class="lvl1 modrow"><div class="nr-main"><a class="rt" href="${BASE}n/?id=${n.id}"></a><div class="nr-meta"><span class="chip">${KIND[n.kind]}</span><span class="muted11">@${esc(n.author)} · ${esc(N.groups[n.group]?.n ?? '')} · ${n.votes} votes</span></div>${extra}</div><div class="btns-row">${btns.map(([a, l, p]) => `<button class="btn sm ${p ? 'primary' : 'secondary'}" type="button" data-act="${a}" data-id="${n.id}">${l}</button>`).join('')}</div></div>`;
    const sec = (title, desc, items, draw) => `<section class="surface sec"><div class="sec-head"><div><h2 class="h-large">${title}<span class="count">${items.length}</span></h2><p class="desc12">${desc}</p></div></div>${items.length ? `<div class="stack">${items.map(draw).join('')}</div>` : '<div class="empty">Nothing waiting.</div>'}</section>`;
    slot.innerHTML = `<div class="surface identity"><div><div class="muted11">Mods</div><h1 class="h-subject">Mod tools</h1><p class="desc12" style="margin-top:4px">Everything waiting for a mod, worst first. Suggestions for the map itself arrive on GitHub.</p></div></div>
      ${sec('Waiting for approval', 'First posts from GitHub accounts under 14 days old', q.held, (n) => row(n, [['ban', 'Ban the account'], ['hide', 'Hide'], ['approve', 'Approve', 1]]))}
      ${sec('Reported', 'Notes someone flagged', q.reported, (n) => row(n, [['dismiss', 'Keep it'], ['hide', 'Hide', 1]], `<div class="callout warn">${n.reports.map((r) => esc(r.reason)).join(' · ')}</div>`))}
      ${sec('Says it\'s fixed', 'Someone claims a missing feature is fixed; it closes at 3 confirmations', q.claims, (n) => row(n, [['reject-fix', 'Not fixed'], ['fixed', 'Close as fixed', 1]], `<div class="small2">@${esc(n.fixed.by)}: <a href="${esc(n.fixed.link)}" rel="noopener nofollow ugc">${esc(n.fixed.link)}</a> · ${n.fixed.confirms} of 3 confirmed</div>`))}
      ${sec('Should "Replaces fully" change?', 'Missing features with 25 or more votes. If it matters this much, the listing may only replace part of the job.', q.popular, (n) => row(n, [['keep', 'Keep "fully"'], ['partly', 'Suggest "partly"', 1]]))}`;
    $$('.modrow a.rt', slot).forEach((a) => { const id = +a.href.split('id=')[1]; a.textContent = [...q.held, ...q.reported, ...q.claims, ...q.popular].find((x) => x.id === id).title; });
    slot.onclick = async (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const n = [...q.held, ...q.reported, ...q.claims, ...q.popular].find((x) => x.id === +b.dataset.id);
      try {
        if (b.dataset.act === 'fixed') await api.setStatus(n.id, 'fixed');
        else if (b.dataset.act === 'partly') { window.open(`${OI.repo}/issues/new?template=2-fix.yml&project=${encodeURIComponent(N.projects[n.projects?.[0]] ?? '')}&group=${encodeURIComponent(N.groups[n.group]?.n ?? '')}`, '_blank', 'noopener'); return; }
        else if (b.dataset.act === 'keep') { b.closest('.modrow').remove(); return; }
        else await api.modAct(n.id, b.dataset.act);
        renderMod(slot);
      } catch (err) { oops(err); }
    };
  }

  // ── Small counts on cards: "3 missing features" ──
  async function renderCounts() {
    const slots = $$('[data-missing-count]'); if (!slots.length) return;
    const list = await api.notes({ group: slots[0].dataset.group, kind: 'missing', status: 'open', limit: 500 });
    for (const s of slots) { const c = list.filter((n) => n.projects?.includes(s.dataset.project)).length; if (c) { s.hidden = false; s.textContent = `${c} missing ${c === 1 ? 'feature' : 'features'}`; } }
  }

  // ── Start ──
  if (api.demo) document.body.insertAdjacentHTML('afterbegin', '<div class="demo-ribbon">Preview: sample posts and pretend votes, saved only in this browser</div>');
  $$('[data-account]').forEach(renderAccount);
  $$('[data-notes]').forEach(renderNotes);
  $$('[data-board]').forEach(renderBoard);
  $$('[data-note-page]').forEach(renderNotePage);
  $$('[data-mod]').forEach(renderMod);
  renderRatings(); renderCounts();
})();

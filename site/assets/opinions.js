// What people say about one feature of one app (step 2, Destin, Nov 3; decisions in docs/community-history.md).
// Tapping a ✓ ~ ✗ mark (or a blank one) opens a popup: what the AI found, the project developer's own answer, and what people say:
// everyone's yes / partly / no from the first answer on, their comments with GitHub names, and your own answer.
// WHY from 5 answers the table shows people's average instead of the AI's (Destin: "an average of reports … after a certain
// threshold"; "fine with 5, but we should still show submitted responses somehow before that").
// WHY no names on the totals (Destin: "ratings/comments section with averages, not attribution to a single person").
// Loaded only when the site has a server (SOCIAL); without one, surfaces.js shows the plain source tip as before.
(function () {
  const OI = window.OI; const api = OI?.api; const ui = OI?.ui; if (!api || !ui) return;
  const $ = (s, el = document) => el.querySelector(s); const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const THRESHOLD = 5;
  const WORD = { yes: 'Yes', partly: 'Partly', no: 'No' };
  const MARK = { yes: '✓', partly: '~', no: '✗' };
  const TONE = { yes: 'ok', partly: 'warn', no: '' };
  const FROM_WORD = { Yes: 'yes', Partly: 'partly', No: 'no' };
  const keyOf = (el) => `${el.dataset.subj}/${el.dataset.ftag}`;
  const total = (c) => c.yes + c.partly + c.no;
  // The average: yes = 1, partly = ½, no = 0, rounded to the nearest of the three (Destin's "average", not a majority).
  const average = (c) => { const t = total(c); if (!t) return null; const a = (c.yes + c.partly / 2) / t; return a >= 0.75 ? 'yes' : a > 0.25 ? 'partly' : 'no'; };
  const summary = (c) => ['yes', 'partly', 'no'].filter((v) => c[v]).map((v) => `${c[v]} ${v}`).join(' · ');
  const people = (n) => `${n} ${n === 1 ? 'person' : 'people'}`;
  const pill = (v) => `<span class="pill ${TONE[v]}">${v === 'no' ? '' : '<i></i>'}${WORD[v]}</span>`;
  // WHY a tab strip (guide: "2–4 short choices → SegmentedTabs"; reviewer Nov 3): the picked answer shows filled, not as a faint ring.
  const strip = (name, cur, locked) => `<div class="seg op-seg${locked ? ' locked' : ''}" role="group" aria-label="Your answer">${['yes', 'partly', 'no'].map((v) => `<button type="button" class="${cur === v ? 'on' : ''}" data-${name}="${v}" aria-pressed="${cur === v}">${WORD[v]}</button>`).join('')}</div>`;

  // ── The marks on the page: once 5 people have answered, each shows their average ──
  async function swapMarks() {
    const els = $$('[data-subj][data-ftag]'); if (!els.length) return;
    const keys = [...new Set(els.map(keyOf))]; const all = {};
    for (let i = 0; i < keys.length; i += 100) Object.assign(all, await api.opinions(keys.slice(i, i + 100)).catch(() => ({})));
    for (const el of els) {
      const c = all[keyOf(el)]; if (!c || total(c) < THRESHOLD) continue;
      const v = average(c); el.dataset.people = String(total(c));
      if (el.classList.contains('cell')) { el.className = `cell ${v}`; el.textContent = MARK[v]; el.title = `${el.dataset.name}: ${WORD[v]} · ${people(total(c))}`; }
      if (el.classList.contains('pillbtn')) { el.className = `pill pillbtn ${TONE[v]}`; el.innerHTML = `${v === 'no' ? '' : '<i></i>'}${WORD[v]}`; }
      // WHY the source chip goes (Destin, step-2 deck Q-7: the AI's earlier answer isn't shown once people's answer replaces it).
      if (el.classList.contains('prov')) el.hidden = true;
    }
  }

  // ── The popup ──
  async function open(el) {
    const d = { ...el.dataset }; const key = keyOf(el); const ai = FROM_WORD[d.v];
    const { el: scrim, close } = ui.dialog(d.name, '', { size: 'narrow' });
    const body = $('.body', scrim);
    // WHY "What we found" is drawn before anything loads (reviewer, Nov 3): it needs no server, so a failed load never hides it.
    const found = ai || d.src
      ? `<div class="op-sec" data-found><p class="label">What we found</p><div class="lvl1 op-card"><div class="op-row op-start">${ai ? pill(ai) : ''}${d.note ? `<p class="small2">${esc(d.note)}</p>` : ''}</div>
          ${d.quote ? `<blockquote class="tipq">“${esc(d.quote)}”</blockquote>` : ''}
          ${d.src ? `<p class="small2">Source: <a href="${esc(d.src)}" rel="noopener">${esc(d.host)}</a></p><p class="muted11">${esc(d.by)} · ${esc(d.when)} · <a href="${OI.base ?? '/'}how-we-check/">How we check</a></p>` : ''}</div></div>`
      : '';
    body.innerHTML = `<p class="small2 op-subj"><b>${esc(d.sname)}</b>${d.q ? ` · ${esc(d.q)}` : ''}</p>${found}<div data-opslot><p class="muted11">Loading what people said…</p></div>`;
    const draw = async () => {
      const slot = $('[data-opslot]', body); let o, me;
      try { [o, { user: me }] = await Promise.all([api.opinion(key), ui.getMe()]); } catch {
        // WHY only this part is replaced, red-tinted, with a filled Try again (guide: Status and notices; error-message standards).
        slot.innerHTML = '<div class="callout err op-row"><span class="small2">Couldn\'t load what people said.</span><button class="btn sm primary" type="button" data-retry>Try again</button></div>';
        $('[data-retry]', slot).onclick = draw; return;
      }
      const n = total(o); const took = n >= THRESHOLD; const avg = average(o);
      // WHY the AI's section goes once people's answer has taken over (Destin, step-2 deck Q-7: no).
      const f = $('[data-found]', body); if (f) f.hidden = took;
      const locked = !!me && !me.canVote; const mine = o.mine;
      const dev = o.dev || o.canDev
        ? `<div class="op-sec"><p class="label">From the developer</p><div class="lvl1 op-card">${o.dev ? `<div class="op-row">${pill(o.dev.v)}<span class="muted11 op-grow">@${esc(o.dev.by)} · ${ui.ago(o.dev.updated)}</span>${o.canDev ? '<button class="btn sm secondary" type="button" data-devedit>Edit</button>' : ''}</div>${o.dev.note ? '<p class="small2 op-devnote"></p>' : ''}` : ''}
          ${o.canDev ? `<div class="op-devedit"${o.dev ? ' hidden' : ''}>${o.dev ? '' : '<p class="small2">You develop this project, so your answer shows here, apart from everyone else\'s.</p>'}
            <div class="op-row"><span class="small2">Your answer</span>${strip('dev', o.dev?.v, false)}</div>
            <div><label class="label" for="opDevNote">Note (optional)</label><input class="field" id="opDevNote" maxlength="200"></div>
            <div class="dlg-btns"><button class="btn sm primary" type="button" data-devsave>Save</button></div></div>` : ''}</div></div>`
        : '';
      // WHY one card when nothing is known yet (reviewer: two empty cards were filler on the most common first visit).
      const empty = !ai && !d.src && !n;
      const head = empty ? '<p class="small2">Nobody has checked this yet. Be the first.</p>'
        : n ? `<div class="op-row"><p class="small2"><b>${people(n)}</b>: ${summary(o)}</p>${took ? `<span class="op-shows"><span class="muted11">Table shows</span>${pill(avg)}</span>` : ''}</div>${took ? '' : `<p class="muted11">At ${THRESHOLD} answers, the table shows people's answer.</p>`}`
          : '<p class="small2">No one has answered yet.</p>';
      const answer = o.canDev ? '<p class="muted11">As its developer, your answer shows above and isn\'t counted here.</p>'
        : `<div class="op-row"><span class="small2">Your answer</span>${strip('op', mine, locked)}</div>
          ${locked ? '<p class="muted11">GitHub accounts can answer once they\'re 14 days old.</p>' : ''}
          ${!me ? '<p class="muted11">Answering needs a GitHub sign-in.</p>' : ''}
          ${mine ? '<div class="lvl2 composer"><textarea id="opText" placeholder="Add a comment (optional)" maxlength="1000"></textarea><button class="btn sm primary" type="button" data-post>Post</button></div>' : ''}`;
      const cmts = o.comments.length ? `<div class="comments op-cmts">${o.comments.map((c) => `<div class="cmt" data-cid="${c.id}"><div class="who"><span class="av">${esc(c.author[0].toUpperCase())}</span><span class="n">@${esc(c.author)}</span>${c.v ? pill(c.v) : ''}${c.held ? '<span class="pill warn"><i></i>Waiting for a mod</span>' : ''}<span class="t">${ui.ago(c.created)}</span></div><p></p>${c.mine ? '<div class="acts"><button class="btn sm secondary" type="button" data-del>Delete</button></div>' : ''}</div>`).join('')}</div>` : '';
      slot.innerHTML = `${dev}<div class="op-sec"><p class="label">What people say</p><div class="lvl1 op-card">${head}${answer}${cmts}</div></div>`;
      // People's words are text, never page code (same as every comment on the site).
      o.comments.forEach((c) => ui.fillText($(`[data-cid="${c.id}"] p`, slot), c.body));
      if (o.dev?.note) $('.op-devnote', slot).textContent = o.dev.note;
      if (o.canDev && o.dev?.note) $('#opDevNote', slot).value = o.dev.note;
      let devPick = o.dev?.v ?? null;
      slot.onclick = async (e) => {
        if (e.target.closest('[data-devedit]')) { $('.op-devedit', slot).hidden = false; $('#opDevNote', slot).focus(); return; }
        // WHY the developer picks, then saves (reviewer: re-pressing an answer to save a changed note was hidden behaviour).
        const dp = e.target.closest('[data-dev]'); if (dp) { devPick = dp.dataset.dev; $$('[data-dev]', slot).forEach((x) => { x.classList.toggle('on', x === dp); x.setAttribute('aria-pressed', String(x === dp)); }); return; }
        const b = e.target.closest('[data-op],[data-post],[data-del],[data-devsave]'); if (!b || b.disabled) return;
        b.disabled = true; // WHY: a double tap while the first is still sending would answer twice
        try {
          if (b.dataset.op) { if (locked) { b.disabled = false; return; } await api.opine(key, mine === b.dataset.op ? null : b.dataset.op); }
          if (b.matches('[data-post]')) { const r = await api.comment(key, $('#opText', slot).value); if (r.held) OI.toast?.('Only you can see your comment until a mod approves it.'); }
          if (b.matches('[data-del]')) await api.deleteComment(key, b.closest('[data-cid]').dataset.cid);
          if (b.matches('[data-devsave]')) { if (!devPick) { OI.toast?.('Pick Yes, Partly or No first.'); b.disabled = false; return; } await api.devAnswer(key, devPick, $('#opDevNote', slot).value); }
          await draw(); swapMarks();
        } catch (err) { b.disabled = false; if (err.status === 401) close(); ui.oops(err, null); }
      };
    };
    draw();
  }
  // WHY the capture phase: it runs before surfaces.js's plain source tip, which stays for pages without a server.
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-subj][data-ftag]'); if (!el) return;
    e.preventDefault(); e.stopPropagation(); open(el);
  }, true);
  swapMarks();
})();

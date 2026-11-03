// What people say about one feature of one app (step 2, Destin, Nov 3; decisions in docs/community-history.md).
// Tapping a ✓ ~ ✗ mark (or a blank one) opens a popup: what the AI found, the project developer's own answer, and what people say:
// everyone's yes / partly / no from the first answer on, comments with GitHub names, and your own answer.
// WHY from 5 answers the table shows people's average instead of the AI's (Destin: "an average of reports … after a certain
// threshold"; "fine with 5, but we should still show submitted responses somehow before that").
// WHY no names on the totals (Destin: "ratings/comments section with averages, not attribution to a single person").
// WHY it is laid out like YouCoded's Marketplace "Feedback" section (FeedbackSection.tsx, CommentList.tsx): Destin, step-2 deck
// round 1 (Nov 4): "too many unique elements", "closer to native youcoded styling". Words left, small outlined buttons right,
// the picked one ringed; comments as plain rows in one shared box; one comment line with Post inside it.
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
  // The same three small outlined buttons everywhere, the picked one ringed (Marketplace's Helpful / Not for me).
  const btns = (name, cur, off) => `<div class="op-btns" role="group" aria-label="Your answer">${['yes', 'partly', 'no'].map((v) => `<button class="btn sm secondary${cur === v ? ' on' : ''}" type="button" data-${name}="${v}" aria-pressed="${cur === v}"${off ? ' disabled' : ''}>${WORD[v]}</button>`).join('')}</div>`;
  // A comment row, as in the app's comment list: initial, name, their answer, when; the words under it.
  const row = (c) => `<div class="cmt" data-cid="${c.id}"><div class="who"><span class="av">${esc(c.author[0].toUpperCase())}</span><span class="n">${esc(c.author)}</span>${c.v ? pill(c.v) : ''}${c.held ? '<span class="muted11">Held for review · only you can see it</span>' : ''}<span class="t">${ui.ago(c.created)}</span></div><p></p>${c.mine ? '<div class="acts"><button class="btn sm secondary" type="button" data-del>Delete</button></div>' : ''}</div>`;

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
    const { el: scrim, close } = ui.dialog(d.name, '', { size: 'narrow', subtitle: d.sname });
    const body = $('.body', scrim);
    // WHY "What we found" is drawn before anything loads: it needs no server, so a failed load never hides it.
    // WHY the quote is plain words, the source and date one line (step-2 deck C-1: "unnecessary copy and dead space").
    const found = ai
      ? `<div class="op-sec" data-found><p class="label">What we found</p><div class="lvl1 op-card">
          <div class="op-lead">${pill(ai)}${d.note ? `<p class="op-words">${esc(d.note)}</p>` : ''}</div>
          ${d.quote ? `<p class="op-words">“${esc(d.quote)}”</p>` : ''}
          ${d.src ? `<p class="muted11">Source: <a href="${esc(d.src)}" rel="noopener">${esc(d.host)}</a> · ${esc(d.by)} · ${esc(d.when)}</p>` : ''}</div></div>`
      : '';
    body.innerHTML = `${found}<div data-opslot><p class="muted11">Loading…</p></div>`;
    const draw = async () => {
      const slot = $('[data-opslot]', body); let o, me;
      try { [o, { user: me }] = await Promise.all([api.opinion(key), ui.getMe()]); } catch {
        // WHY only this part is replaced, red-tinted, with a filled Try again (guide: Status and notices).
        slot.innerHTML = '<div class="callout err op-row"><span class="small2">Couldn\'t load what people said.</span><button class="btn sm primary" type="button" data-retry>Try again</button></div>';
        $('[data-retry]', slot).onclick = draw; return;
      }
      const n = total(o); const took = n >= THRESHOLD;
      // WHY the AI's section goes once people's answer has taken over (Destin, step-2 deck Q-7: no).
      const f = $('[data-found]', body); if (f) f.hidden = took;
      const tooNew = !!me && !me.canVote; const mine = o.mine;
      // From the developer: their answer and note; their own Edit opens the same three buttons, a named note box and Save.
      const dev = o.dev || o.canDev
        ? `<div class="op-sec"><p class="label">From the developer</p><div class="lvl1 op-card">
            ${o.dev ? `<div class="op-row"><div class="op-lead">${pill(o.dev.v)}${o.dev.note ? '<p class="op-words op-devnote"></p>' : ''}</div>${o.canDev ? '<button class="btn sm secondary" type="button" data-devedit>Edit</button>' : ''}</div><p class="muted11">${esc(o.dev.by)} · ${ui.ago(o.dev.updated)}</p>` : ''}
            ${o.canDev ? `<div class="op-devedit"${o.dev ? ' hidden' : ''}>
              <div class="op-row"><p class="op-words">${o.dev ? 'Your answer' : 'You develop this project, so your answer shows here, apart from everyone else\'s.'}</p>${btns('dev', o.dev?.v, false)}</div>
              <div><label class="label" for="opDevNote">Note (optional)</label><input class="field" id="opDevNote" maxlength="200"></div>
              <button class="btn md primary full" type="button" data-devsave>Save</button></div>` : ''}</div></div>`
        : '';
      // The answer line: what people said on the left, your answer on the right; the reason you can't answer under the words.
      const words = n ? `<b>${people(n)}</b>: ${summary(o)}` : 'No answers yet';
      const reason = o.canDev ? 'Your answer is the one above.' : !me ? 'Sign in to answer' : tooNew ? 'GitHub accounts can answer once they\'re 14 days old.' : '';
      const votes = `<div class="op-row"><div class="op-words">${words}${reason ? `<p class="muted11">${reason}</p>` : ''}</div>${o.canDev ? '' : btns('op', mine, tooNew)}</div>`;
      const list = o.comments.length ? `<div class="lvl2 op-list">${o.comments.map(row).join('')}</div>` : '';
      const composer = o.canDev ? '' : `<div class="op-ig"><input id="opText" maxlength="1000" placeholder="${me ? 'Add a comment…' : 'Sign in to comment'}" aria-label="Write a comment"><button class="btn sm primary" type="button" data-post disabled>Post</button></div>`;
      slot.innerHTML = `${dev}<div class="op-sec"><p class="label">What people say</p><div class="lvl1 op-card">${votes}${list}${composer}</div></div>`;
      // People's words are text, never page code (same as every comment on the site).
      o.comments.forEach((c) => ui.fillText($(`[data-cid="${c.id}"] p`, slot), c.body));
      if (o.dev?.note) $('.op-devnote', slot).textContent = o.dev.note;
      if (o.canDev && o.dev?.note) $('#opDevNote', slot).value = o.dev.note;
      // WHY: a long note opened scrolled to its end read as broken ("ma files through…"); show its start.
      const input = $('#opText', slot); const post = $('[data-post]', slot);
      if (input) {
        input.oninput = () => { post.disabled = !input.value.trim(); };
        // Enter posts, as in the app's comment line.
        input.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing && !post.disabled) { e.preventDefault(); post.click(); } };
      }
      let devPick = o.dev?.v ?? null;
      slot.onclick = async (e) => {
        if (e.target.closest('[data-devedit]')) { $('.op-devedit', slot).hidden = false; e.target.closest('[data-devedit]').hidden = true; const nb = $('#opDevNote', slot); nb.focus(); nb.setSelectionRange(0, 0); nb.scrollLeft = 0; return; }
        // WHY the developer picks, then saves: changing only the note shouldn't need re-pressing an answer.
        const dp = e.target.closest('[data-dev]'); if (dp) { devPick = dp.dataset.dev; $$('[data-dev]', slot).forEach((x) => { x.classList.toggle('on', x === dp); x.setAttribute('aria-pressed', String(x === dp)); }); return; }
        const b = e.target.closest('[data-op],[data-post],[data-del],[data-devsave]'); if (!b || b.disabled) return;
        b.disabled = true; // WHY: a double tap while the first is still sending would answer twice
        try {
          if (b.dataset.op) await api.opine(key, mine === b.dataset.op ? null : b.dataset.op);
          if (b.matches('[data-post]')) { const r = await api.comment(key, input.value); if (r.held) OI.toast?.('Posted. It\'s held for review.'); }
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

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
  const BUILT = {
    'hand-built': ['Hand-built', 'Written mostly by people.'],
    'ai-assisted': ['AI-assisted', 'Written by people, with AI help.'],
    agentic: ['Agentic engineering', 'AI wrote most of the code, with a person directing, reviewing and testing it, and real development history behind it.'],
    'vibe-coded': ['Vibe-coded', 'A quick, exploratory build that has not been carefully reviewed yet.'],
  };
  const PITCH_PARTS = [['strengths', 'What it does best'], ['weaknesses', "What it doesn't do well yet"], ['reusable', 'What other builders could reuse'], ['help', 'Where help is wanted']];

  // Signing in must not lose what you clicked: remembered for this tab, finished when you're back (like social.js).
  const PENDING = 'ose-pending-c';
  const remember = (a) => { try { sessionStorage.setItem(PENDING, JSON.stringify({ ...a, at: location.pathname + location.search })); } catch { /* fine */ } };

  // ───────── "I want this too" ─────────
  const KIND = { group: 'A job nothing open fully does yet', app: 'Closed app with no open replacement', issue: 'Suggested, waiting for a mod' };
  const word = (n) => `<b>▲ ${n.votes}</b><span>I want this too</span>`;
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
      const draw = () => { s.hidden = false; s.innerHTML = `<button class="btn sm ${item.mine ? 'primary' : 'secondary'}" type="button" aria-pressed="${item.mine}">${item.mine ? '✓ You want this' : 'I want this too'}${item.votes ? ` · ${item.votes}` : ''}</button>`; };
      s.onclick = (e) => { if (e.target.closest('button')) vote(item, draw); };
      draw();
    }
  }

  // "Most requested": ranked by votes, including suggestions still waiting for a mod.
  async function renderMostRequested(slot) {
    const limit = +(slot.dataset.limit ?? 5);
    let res; try { res = await api.requests({ limit }); } catch { slot.innerHTML = '<div class="callout warn">Couldn\'t load requests just now.</div>'; return; }
    if (!res.items.length) { slot.innerHTML = `<div class="callout info">Nothing has been asked for yet. Search for an app that isn't here and ask for it, or press <b>I want this too</b> on a job nothing open covers.</div>`; return; }
    const draw = () => {
      slot.innerHTML = `<div class="stack">${res.items.map((it, i) => `<div class="rrow req-row" data-key="${esc(it.key)}">
        <span class="req-rank" aria-hidden="true">${i + 1}</span>
        <button class="vote big${it.mine ? ' on' : ''}" type="button" aria-pressed="${it.mine}">${word(it)}</button>
        <div class="nr-main"><a class="rt" href="${it.url ? esc(it.url) : BASE + esc(it.href)}"${it.url ? ' target="_blank" rel="noopener"' : ''}>${esc(it.name)}</a>
          <div class="nr-meta"><span class="chip">${esc(KIND[it.kind])}</span>${it.waiting ? '<span class="pill warn"><i></i>Waiting for a mod</span>' : ''}</div></div></div>`).join('')}</div>
        ${res.total > res.items.length && slot.dataset.more ? `<a class="btn sm secondary" href="${esc(BASE + slot.dataset.more)}">See all ${res.total}</a>` : ''}`;
    };
    // ── Redesign round (preview builds): three prettier lists, picked with ?v=a|b|c ──
    // WHY (Destin: "a lot prettier and easier to use/navigate/understand"): the kind becomes a short chip, the vote is one pill at the
    // right of its row (guide: a row's own action sits at the right), and the rank and the count are the first things the eye finds.
    const V = window.OI_V;
    const KIND_S = { group: 'Job nothing open does yet', app: 'Closed app, no open copy', issue: 'Suggested' };
    const link = (it) => (it.url ? esc(it.url) : BASE + esc(it.href));
    const vbtn = (it, cls = '') => `<button class="vote pillvote${cls}${it.mine ? ' on' : ''}" type="button" aria-pressed="${it.mine}" title="${it.mine ? 'You want this. Press to take it back.' : 'Add your voice'}"><b>▲ ${it.votes}</b><span>${it.mine ? 'You want this' : 'I want this too'}</span></button>`;
    const meta = (it) => `<div class="chiprow"><span class="chip">${KIND_S[it.kind]}</span>${it.waiting ? '<span class="pill warn"><i></i>Waiting for a mod</span>' : ''}</div>`;
    const max = Math.max(1, ...res.items.map((x) => x.votes));
    const rowA = (it, i) => `<div class="rrow req-row rqa" data-key="${esc(it.key)}"><span class="rq-rank" aria-hidden="true">${i + 1}</span>
        <div class="nr-main"><a class="rt" href="${link(it)}"${it.url ? ' target="_blank" rel="noopener"' : ''}>${esc(it.name)}</a>${meta(it)}</div>${vbtn(it)}</div>`;
    const drawV = () => {
      const more = res.total > res.items.length && slot.dataset.more ? `<a class="btn sm secondary rq-more" href="${esc(BASE + slot.dataset.more)}">See all ${res.total}</a>` : '';
      if (V === 'a') return `<div class="rq-list lvl1">${res.items.map(rowA).join('')}</div>${more}`;
      if (V === 'b') {
        const top = res.items.slice(0, 3), rest = res.items.slice(3);
        return `<div class="rq-pod scroll-x">${top.map((it, i) => `<div class="rq-card req-row" data-key="${esc(it.key)}"><span class="rq-medal m${i + 1}">${i + 1}</span>
            <a class="rt" href="${link(it)}"${it.url ? ' target="_blank" rel="noopener"' : ''}>${esc(it.name)}</a>${meta(it)}${vbtn(it, ' full')}</div>`).join('')}</div>
          ${rest.length ? `<div class="rq-list lvl1">${rest.map((it, i) => rowA(it, i + 3)).join('')}</div>` : ''}${more}`;
      }
      return `<div class="rq-list lvl1 rqc">${res.items.map((it, i) => `<div class="rrow req-row rqcrow" data-key="${esc(it.key)}" style="--share:${Math.round(100 * it.votes / max)}%"><span class="rq-rank" aria-hidden="true">${i + 1}</span>
          <div class="nr-main"><a class="rt" href="${link(it)}"${it.url ? ' target="_blank" rel="noopener"' : ''}>${esc(it.name)}</a><span class="rq-kind">${KIND_S[it.kind]}${it.waiting ? ' · waiting for a mod' : ''}</span></div>${vbtn(it)}</div>`).join('')}</div>${more}`;
    };
    const drawAny = () => { if (V) slot.innerHTML = drawV(); else draw(); };
    slot.onclick = (e) => { const b = e.target.closest('.vote'); if (!b) return; const it = res.items.find((x) => x.key === b.closest('.req-row').dataset.key); if (it) vote(it, drawAny); };
    drawAny();
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
    // ───────── Redesign round (preview builds): the "not claimed yet" label, placed by ?l=a|b|c ─────────
    // WHY it lives here: this is where we learn whether a developer has claimed the project (an approved pitch). Claimed → no label, ever.
    // a = one grey line in the project page's top card, b = a dashed "Unclaimed" chip on cards and the page, c = a tinted notice box with its button.
    const L = window.OI_L;
    if (L) {
      const claimed = (id) => !!all[id];
      $$('[data-claim-chip]').forEach((el) => { if (L === 'b' && !claimed(el.dataset.claimChip)) { el.hidden = false; el.setAttribute('data-claimtip', ''); } });
      $$('[data-claim-line]').forEach((el) => {
        if (el.tagName !== 'DIV' || claimed(el.dataset.claimLine)) return;
        const tag = `${BASE}tag/?repo=${encodeURIComponent(el.dataset.repo ?? '')}`;
        if (L === 'a') { el.hidden = false; el.innerHTML = '<p class="claimq">Managed by r/TrueOpenSource and drafted with AI assistance. <a href="#" data-claimtip data-repo="' + esc(el.dataset.repo ?? '') + '">Are you the developer?</a></p>'; }
        if (L === 'c') { el.hidden = false; el.innerHTML = `<div class="claimnote"><span>This listing is managed by r/TrueOpenSource and drafted with AI assistance. Developers can claim it and update the page.</span><a class="btn sm secondary" href="${tag}">Claim this page</a></div>`; }
      });
    }
    for (const s of slots) {
      const p = all[s.dataset.project];
      if (L && !p && s.dataset.mode === 'page') { s.hidden = true; continue; } // the label's button replaces "Is this your project?"
      if (s.dataset.mode === 'card') {
        if (!p) continue;
        s.hidden = false; s.innerHTML = `<span class="pill info">From the Developer</span><span class="pitch-line">${esc(p.differs)}</span>`;
      } else {
        const mine = user && p && p.by.toLowerCase() === user.login.toLowerCase();
        const tag = `${BASE}tag/?repo=${encodeURIComponent(s.dataset.repo ?? '')}`;
        s.hidden = false;
        s.innerHTML = p
          ? `<div class="sec-head"><div><h2 class="h-large">From the Developer</h2><p class="desc12">Written by @${esc(p.by)}, who has shown this project is theirs. A mod read it first. Updated ${esc(when(p.updated))}.</p></div>${mine ? `<a class="btn sm secondary" href="${tag}">Edit</a>` : ''}</div>
             <div class="chiprow"><span class="chip">${esc(BUILT[p.built]?.[0] ?? '')}</span></div>${pitchBody(p)}`
          : `<div class="sec-head"><div><h2 class="h-large">Is this your project?</h2><p class="desc12">Tag it to tell people what it does differently, what's reusable and where you'd like help.</p></div><a class="btn sm secondary" href="${tag}">Tag my project</a></div>`;
      }
    }
  }

  // ───────── Tag my project ─────────
  async function renderTag(slot) {
    const N = await loadNames(); const { user } = await getMe();
    const q = new URLSearchParams(location.search);
    const st = { stage: 'start', pitch: null, link: q.get('repo') ?? '', mine: [], error: '' };
    const STEPS = ['Your project', 'Prove it is yours', 'Where it belongs', 'Your pitch'];
    const stepIdx = { start: 0, notlisted: 0, proof: 1, form: 2, sent: 3 };
    const steps = () => `<ol class="steps" aria-label="Steps">${STEPS.map((t, i) => `<li${i === stepIdx[st.stage] ? ' aria-current="step" class="on"' : i < stepIdx[st.stage] ? ' class="done"' : ''}><span>${i < stepIdx[st.stage] ? '✓' : i + 1}</span>${t}</li>`).join('')}</ol>`;
    const head = (extra = '') => `<div class="surface identity"><div class="row"><div><div class="muted11">For developers</div><h1 class="h-subject">Tag my project</h1>
      <p class="desc12" style="margin-top:4px">Tell people what your project does differently. After a mod reads it, it shows on your project's page as <b>From the Developer</b>.</p></div></div>${extra}</div>`;

    if (!user) {
      slot.innerHTML = `${head()}<section class="surface sec"><h2 class="h-large">Sign in first</h2><p class="small2">Signing in with GitHub shows us who you are, so only you can speak for your project. We never ask for access to your code.</p><div><button class="btn md primary" type="button" data-signin>Sign in with GitHub</button></div></section>`;
      return;
    }
    const load = async () => { st.mine = (await api.myPitches().catch(() => ({ items: [] }))).items; };
    const statusPill = (x) => ({ pending: '<span class="pill warn"><i></i>A mod is reading it</span>', live: '<span class="pill ok"><i></i>Shown on the site</span>', 'turned-down': '<span class="pill warn">Turned down</span>', draft: '<span class="pill info">Not sent yet</span>' }[x.status] ?? '');

    function draw() {
      if (window.OI_V) return drawV();
      let html = '';
      if (st.stage === 'start' || st.stage === 'notlisted') {
        html += `${steps()}<section class="surface sec"><h2 class="h-large">Paste your project's link</h2>
          <p class="small2">The page where its code lives, on GitHub, GitLab or Codeberg.</p>
          <div><label class="label" for="tagLink">Link to its code</label><input class="field" id="tagLink" placeholder="https://github.com/you/your-project" value="${esc(st.link)}"></div>
          ${st.error ? `<div class="callout warn">${esc(st.error)}</div>` : ''}
          ${st.stage === 'notlisted' ? `<div class="callout info"><b>It isn't on the map yet.</b> Add it first (it takes a short form on GitHub; a mod approves it). Then come back here and tag it.
            <div style="margin-top:8px"><a class="btn sm primary" target="_blank" rel="noopener" href="${esc(`${OI.repo}/issues/new?template=1-add-project.yml&code=${encodeURIComponent(st.link)}&name=${encodeURIComponent(st.name ?? '')}&relation=${encodeURIComponent("Yes, I'm on its team")}`)}">Add my project</a></div></div>` : ''}
          <div class="dlg-btns"><button class="btn md primary" type="button" data-go>Continue</button></div></section>`;
      }
      if (st.stage === 'proof') {
        const p = st.pitch;
        html += `${steps()}<section class="surface sec"><h2 class="h-large">Show it's yours</h2>
          <p class="small2"><b>${esc(p.projectName)}</b> (${esc(p.repo)}) isn't under your own GitHub account, so add one small file to it. Only someone who controls the project can do that.</p>
          <ol class="howto"><li>In the project's main folder, make a file named <code class="copy" data-copy="${esc(p.proofFile)}">${esc(p.proofFile)}</code></li>
            <li>Put exactly this one line in it: <code class="copy" data-copy="${esc(p.proofText)}">${esc(p.proofText)}</code></li><li>Save it to the main branch, then check below.</li></ol>
          ${st.error ? `<div class="callout warn">${esc(st.error)}</div>` : ''}
          <div class="dlg-btns"><button class="btn md secondary" type="button" data-back>Back</button><button class="btn md primary" type="button" data-verify>Check for the file</button></div>
          <p class="fieldhint">You can remove the file once your pitch is approved.</p></section>`;
      }
      if (st.stage === 'form') {
        const p = st.pitch; const cur = p.pending ?? p.live ?? {};
        html += `${steps()}<section class="surface sec"><div class="sec-head"><div><h2 class="h-large">${esc(p.projectName)}</h2><p class="desc12">${p.proof === 'own-account' ? 'Verified: this project is under your GitHub account.' : 'Verified: your proof file was found.'}</p></div>${statusPill(p)}</div>
          ${p.reason ? `<div class="callout warn"><b>A mod asked for a change:</b> ${esc(p.reason)}</div>` : ''}
          ${p.status === 'pending' ? '<div class="callout info">A mod is reading what you sent. Editing it now replaces what they see.</div>' : p.live ? '<div class="callout info">Your approved pitch stays on the site while a mod reads any changes you make.</div>' : ''}
          <div><span class="label" id="tgL">Which groups does it belong in?</span><div class="pick" id="tagGroups"></div></div>
          <div id="before" class="lvl1 before"></div>
          <div><label class="label" for="tgDiff">What does yours do differently? <span class="req">required</span></label><textarea class="field" id="tgDiff" rows="3" maxlength="600" placeholder="Compared with the projects above, in a sentence or two."></textarea></div>
          ${PITCH_PARTS.map(([k, l]) => `<div><label class="label" for="tg_${k}">${l} <span class="opt">optional</span></label><textarea class="field" id="tg_${k}" rows="2" maxlength="1000"></textarea></div>`).join('')}
          <fieldset class="built"><legend class="label">How was it built? <span class="req">required</span></legend>${Object.entries(BUILT).map(([k, [n, d]]) => `<label class="radio"><input type="radio" name="built" value="${k}"><span><b>${n}</b><br><span class="small2">${d}</span></span></label>`).join('')}</fieldset>
          ${st.error ? `<div class="callout warn">${esc(st.error)}</div>` : ''}
          <div class="dlg-btns"><button class="btn md secondary" type="button" data-cancel>Cancel</button><button class="btn md primary" type="button" data-send>Send to a mod</button></div></section>`;
      }
      if (st.stage === 'sent') {
        html += `${steps()}<section class="surface sec"><h2 class="h-large">Sent. Thank you.</h2><p class="small2">A mod will read it. Once approved it shows on <a href="${BASE}p/${esc(st.pitch.project)}/">${esc(st.pitch.projectName)}</a> as <b>From the Developer</b>. You can edit it any time; changes are read again, and the version already live stays up until then.</p>
          <div class="dlg-btns"><button class="btn md primary" type="button" data-done>Done</button></div></section>`;
      }
      if (st.mine.length && (st.stage === 'start' || st.stage === 'notlisted' || st.stage === 'sent')) {
        html += `<section class="surface sec"><h2 class="h-large">Your tagged projects<span class="count">${st.mine.length}</span></h2><div class="stack">${st.mine.map((x) => `<div class="lvl1 modrow" data-id="${x.id}"><div class="nr-main"><a class="rt" href="${BASE}p/${esc(x.project)}/">${esc(x.projectName)}</a><div class="nr-meta">${statusPill(x)}${x.verified ? '' : '<span class="pill warn"><i></i>Not proven yet</span>'}</div></div>
          <div class="btns-row"><button class="btn sm secondary" type="button" data-edit>${x.verified ? 'Edit' : 'Finish'}</button><button class="btn sm secondary" type="button" data-remove>Remove</button></div></div>`).join('')}</div></section>`;
      }
      slot.innerHTML = head() + html;
      if (st.stage === 'form') setupForm();
    }

    function setupForm() {
      const p = st.pitch; const cur = p.pending ?? p.live ?? {};
      const mineGroups = Object.keys(N.groups).filter((g) => N.groups[g].alts.includes(p.project));
      const opts = Object.entries(N.groups).sort((a, b) => a[1].n.localeCompare(b[1].n)).map(([id, g]) => [id, g.n]);
      const pk = picker($('#tagGroups', slot), opts, { selected: cur.groups ?? mineGroups, none: 'Pick one or more groups', labelledBy: 'tgL', onChange: before });
      function before() {
        const gs = pk.value();
        // "Before you build": what already exists in the chosen groups, so the answer below can say what's different.
        $('#before', slot).innerHTML = gs.length ? gs.map((g) => {
          const G = N.groups[g]; const others = G.alts.filter((a) => a !== p.project).map((a) => N.projects[a] ?? a);
          return `<div class="beforeg"><div class="label">Before you build · ${esc(G.n)}</div>${others.length
            ? `<p class="small2">Already listed: ${others.slice(0, 8).map(esc).join(', ')}${others.length > 8 ? ` and ${others.length - 8} more` : ''}. <a href="${BASE}g/${g}/" target="_blank" rel="noopener">See the group</a></p>`
            : '<p class="small2">Nothing else is listed here yet.</p>'}${G.gap ? '<p class="small2">No open project fully does this job yet, so yours may be filling a real gap.</p>' : ''}</div>`;
        }).join('') : '';
      }
      before();
      $('#tgDiff', slot).value = cur.differs ?? '';
      for (const [k] of PITCH_PARTS) $(`#tg_${k}`, slot).value = cur[k] ?? '';
      if (cur.built) { const r = $(`input[name=built][value="${cur.built}"]`, slot); if (r) r.checked = true; }
      st.getForm = () => ({ groups: pk.value(), differs: $('#tgDiff', slot).value, built: $('input[name=built]:checked', slot)?.value, ...Object.fromEntries(PITCH_PARTS.map(([k]) => [k, $(`#tg_${k}`, slot).value])) });
    }


    // ───────── Redesign round (preview builds): "Tag my project" in three shapes, picked with ?v=a|b|c ─────────
    // WHY (Destin: "we can make this prettier"; guide: "Writing something others will read, then sending it" and "A popup that does one job is one card"):
    // every step is ONE card that holds its words, its fields and its buttons (stacked, main one on top); the extra writing folds away;
    // the page says plainly who will read it; and the Send button says why it is grey. a = one narrow card per step, b = the same card
    // beside a live preview of how the page will read, c = all four steps as one list of folding rows with the finished ones summarised.
    const V = window.OI_V;
    const NAMES4 = ['Find it', 'Prove it', 'Write it', 'Sent'];
    const cur = () => stepIdx[st.stage];
    const stepper = () => `<ol class="tg-steps" aria-label="Steps">${NAMES4.map((t, i) => `<li class="${i === cur() ? 'on' : i < cur() ? 'done' : ''}"${i === cur() ? ' aria-current="step"' : ''}><span>${i < cur() ? '✓' : i + 1}</span><b>${t}</b></li>`).join('')}</ol>`;
    const headV = () => `<div class="surface identity tg-head"><div><div class="muted11">For developers</div><h1 class="h-subject">Tag my project</h1>
      <p class="desc12">Tell people what your project does differently. After a mod reads it, it shows on your project's page as <b>From the Developer</b>.</p></div>${V === 'c' ? '' : stepper()}</div>`;
    const err = () => (st.error ? `<div class="callout warn">${esc(st.error)}</div>` : '');
    const btns = (main, rest = '') => `<div class="tg-btns">${main}${rest}</div>`;
    const innerStart = () => `<p class="small2">The page where its code lives, on GitHub, GitLab or Codeberg.</p>
      <div><label class="label" for="tagLink">Link to its code</label><input class="field" id="tagLink" placeholder="https://github.com/you/your-project" value="${esc(st.link)}"><p class="fieldhint">We never ask for access to your code.</p></div>
      ${err()}
      ${st.stage === 'notlisted' ? `<div class="callout info"><b>It isn't on the map yet.</b> Add it first (a short form on GitHub; a mod approves it), then come back and tag it.
        <div style="margin-top:8px"><a class="btn sm primary" target="_blank" rel="noopener" href="${esc(`${OI.repo}/issues/new?template=1-add-project.yml&code=${encodeURIComponent(st.link)}&name=${encodeURIComponent(st.name ?? '')}&relation=${encodeURIComponent("Yes, I'm on its team")}`)}">Add my project</a></div></div>` : ''}
      ${btns('<button class="btn md primary full" type="button" data-go>Continue</button>')}`;
    const innerProof = () => { const p = st.pitch; return `<p class="small2"><b>${esc(p.projectName)}</b> (${esc(p.repo)}) isn't under your own GitHub account, so add one small file to it. Only someone who controls the project can do that.</p>
      <ol class="howto"><li>In the project's main folder, make a file named <code class="copy" data-copy="${esc(p.proofFile)}">${esc(p.proofFile)}</code></li>
        <li>Put exactly this one line in it: <code class="copy" data-copy="${esc(p.proofText)}">${esc(p.proofText)}</code></li><li>Save it to the main branch, then check below.</li></ol>
      ${err()}<p class="fieldhint">You can remove the file once your pitch is approved.</p>
      ${btns('<button class="btn md primary full" type="button" data-verify>Check for the file</button>', '<button class="btn md secondary full" type="button" data-back>Back</button>')}`; };
    const innerForm = () => { const p = st.pitch; const c = p.pending ?? p.live ?? {};
      return `<div class="tg-ok"><span class="pill ok"><i></i>${p.proof === 'own-account' ? 'Under your GitHub account' : 'Proof file found'}</span>${statusPill(p)}</div>
      ${p.reason ? `<div class="callout warn"><b>A mod asked for a change:</b> ${esc(p.reason)}</div>` : ''}
      ${p.status === 'pending' ? '<div class="callout info">A mod is reading what you sent. Editing it now replaces what they see.</div>' : p.live ? '<div class="callout info">Your approved pitch stays on the site while a mod reads any changes you make.</div>' : ''}
      <div><label class="label" for="tgDiff">What does ${esc(p.projectName)} do differently?</label><textarea class="field" id="tgDiff" rows="3" maxlength="600" placeholder="Compared with the projects above, in a sentence or two."></textarea><p class="fieldhint">Required. It is the part people read first.</p></div>
      <div><span class="label" id="tgL">Which groups does it belong in?</span><div class="pick" id="tagGroups"></div><p class="fieldhint">Required. Pick one or more.</p></div>
      <div id="before" class="lvl1 before"></div>
      <fieldset class="built"><legend class="label">How was it built?</legend>${Object.entries(BUILT).map(([k, [n, d]]) => `<label class="radio"><input type="radio" name="built" value="${k}"><span><b>${n}</b><br><span class="small2">${d}</span></span></label>`).join('')}</fieldset>
      <details class="fold lvl1 tg-more"><summary><span>More about it</span><span class="muted11">optional</span></summary>
        <div class="tg-morebody">${PITCH_PARTS.map(([k, l]) => `<div><label class="label" for="tg_${k}">${l}</label><textarea class="field" id="tg_${k}" rows="2" maxlength="1000"></textarea></div>`).join('')}</div></details>
      ${err()}
      <p class="tg-public">Anyone can read this on ${esc(p.projectName)}'s page, once a mod has read it first.</p>
      <p class="fieldhint" data-need></p>
      ${btns('<button class="btn md primary full" type="button" data-send disabled>Send to a mod</button>', '<button class="btn md secondary full" type="button" data-cancel>Cancel</button>')}`; };
    const innerSent = () => `<p class="small2">A mod will read it. Once approved it shows on <a href="${BASE}p/${esc(st.pitch.project)}/">${esc(st.pitch.projectName)}</a> as <b>From the Developer</b>.</p>
      <ul class="tg-next"><li>You can edit it any time; changes are read again.</li><li>The older version stays up meanwhile.</li></ul>
      ${btns('<button class="btn md primary full" type="button" data-done>Done</button>')}`;
    const TITLES = { start: 'Paste your project\'s link', notlisted: 'Paste your project\'s link', proof: 'Show it\'s yours', form: null, sent: 'Sent. Thank you.' };
    const inner = () => ({ start: innerStart, notlisted: innerStart, proof: innerProof, form: innerForm, sent: innerSent })[st.stage]();
    const title = () => TITLES[st.stage] ?? esc(st.pitch.projectName);
    // b: a live sample of the page section the words will become
    const preview = () => `<section class="surface sec tg-prev" aria-label="Preview"><div><h2 class="h-large">How it will read</h2><p class="desc12">On ${st.pitch ? esc(st.pitch.projectName) : 'your project'}'s page, as <b>From the Developer</b>.</p></div>
      <div class="lvl1 tg-sample"><div class="chiprow"><span class="chip" data-pv-built>Hand-built</span></div><p class="body2" data-pv-differs>${st.pitch?.live?.differs ? esc(st.pitch.live.differs) : 'What your project does differently shows here, as you type.'}</p></div>
      <p class="fieldhint">Nothing shows until a mod has read it.</p></section>`;
    const mineBlock = () => (st.mine.length && st.stage !== 'form' && st.stage !== 'proof'
      ? `<section class="surface sec"><h2 class="h-large">Your tagged projects<span class="count">${st.mine.length}</span></h2><div class="stack">${st.mine.map((x) => `<div class="lvl1 modrow" data-id="${x.id}"><div class="nr-main"><a class="rt" href="${BASE}p/${esc(x.project)}/">${esc(x.projectName)}</a><div class="nr-meta">${statusPill(x)}</div></div>
        <div class="btns-row"><button class="btn sm secondary" type="button" data-edit>${x.verified ? 'Edit' : 'Finish'}</button><button class="btn sm secondary" type="button" data-remove>Remove</button></div></div>`).join('')}</div></section>` : '');
    function drawV() {
      let body;
      if (V === 'c') {
        const rows = NAMES4.map((n, i) => {
          const open = i === cur(); const done = i < cur();
          const summary = done ? ({ 0: st.pitch?.repo ?? '', 1: 'Proved it is yours', 2: '' })[i] ?? '' : '';
          return `<section class="surface sec tg-row ${open ? 'open' : done ? 'done' : 'later'}"><div class="tg-rowhead"><span class="tg-num">${done ? '✓' : i + 1}</span><div><h2 class="h-large">${open ? title() : n}</h2>${summary ? `<p class="desc12">${esc(summary)}</p>` : ''}</div>${open ? '' : `<span class="muted11">${done ? 'Done' : 'Next'}</span>`}</div>${open ? `<div class="tg-body">${inner()}</div>` : ''}</section>`;
        }).join('');
        body = `<div class="tg-col">${rows}</div>`;
      } else {
        const card = `<section class="surface sec tg-card"><div><h2 class="h-large">${title()}</h2></div>${inner()}</section>`;
        body = V === 'b' ? `<div class="tg-grid"><div class="tg-col">${card}</div>${preview()}</div>` : `<div class="tg-col">${card}</div>`;
      }
      slot.innerHTML = headV() + body + (V === 'b' ? '' : '') + `<div class="tg-col">${mineBlock()}</div>`;
      if (st.stage === 'form') { setupForm(); wireForm(); }
    }
    // The Send button says why it is grey (guide), and the b preview follows what is typed.
    function wireForm() {
      const send = $('[data-send]', slot), need = $('[data-need]', slot);
      const update = () => {
        const f = st.getForm(); const miss = [!f.differs.trim() && 'what it does differently', !f.groups.length && 'a group', !f.built && 'how it was built'].filter(Boolean);
        if (send) send.disabled = !!miss.length; if (need) need.textContent = miss.length ? `Still needed: ${miss.join(', ')}.` : '';
        const pd = $('[data-pv-differs]', slot); if (pd) pd.textContent = f.differs.trim() || 'What your project does differently shows here, as you type.';
        const pb = $('[data-pv-built]', slot); if (pb) pb.textContent = f.built ? BUILT[f.built][0] : 'How it was built';
      };
      slot.addEventListener('input', update); slot.addEventListener('change', update); update();
      const old = st.getForm; $('#tagGroups', slot)?.addEventListener('click', () => setTimeout(update, 0));
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
    if (!user) { slot.innerHTML = `<section class="surface sec"><h2 class="h-large">Sign in to see your suggestions</h2><p class="small2">Suggestions are made on GitHub. Signing in here with the same GitHub account shows where each one stands.</p><div><button class="btn md primary" type="button" data-signin>Sign in with GitHub</button></div></section>`; return; }
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
  const VERDICT = { ok: ['ok', 'Robot: nothing to flag'], 'needs-mod': ['warn', 'Robot: needs a mod'], unchecked: ['info', 'Robot: not checked yet'] };
  async function drawSuggest(pane) {
    pane.innerHTML = '<div class="surface sec"><div class="empty">Loading…</div></div>';
    const [sug, pit] = await Promise.all([api.modSuggestions().catch((e) => ({ error: e.message })), api.modPitches().catch((e) => ({ error: e.message }))]);
    const tokenDoc = `${OI.repo}/blob/main/docs/tokens-and-secrets.md`;
    pane.innerHTML = `
      <section class="surface sec"><div class="sec-head"><div><h2 class="h-large">Developer pitches<span class="count">${pit.items?.length ?? 0}</span></h2><p class="desc12">From "Tag my project". Each owner proved the project is theirs. Nothing shows until you approve it.</p></div></div>
        ${pit.error ? `<div class="callout warn">${esc(pit.error)}</div>` : pit.items.length ? `<div class="stack">${pit.items.map((x) => {
          const p = x.pending;
          return `<div class="lvl1 modrow" data-pid="${x.id}"><div class="nr-main"><a class="rt" href="${BASE}p/${esc(x.project)}/">${esc(x.projectName)}</a>
            <div class="nr-meta"><span class="chip">@${esc(x.owner)}</span><span class="chip">${x.proof === 'own-account' ? 'Under their own account' : 'Proved with a file'}</span><span class="chip">${esc(BUILT[p.built]?.[0] ?? '')}</span>${x.live ? '<span class="pill info">Replaces the live version</span>' : '<span class="pill warn"><i></i>New</span>'}</div>
            <div class="pitchbox">${pitchBody(p)}</div></div>
            <div class="btns-row"><button class="btn sm secondary" type="button" data-pact="reject">Turn down…</button><button class="btn sm primary" type="button" data-pact="approve">Approve</button></div></div>`;
        }).join('')}</div>` : '<div class="callout info">No pitches waiting.</div>'}</section>
      <section class="surface sec"><div class="sec-head"><div><h2 class="h-large">Suggestions on GitHub<span class="count">${sug.items?.length ?? 0}</span></h2><p class="desc12">Open suggestions, oldest first, with the robot's verdict. To approve one, open it and add the <code>approved</code> label; the robot does the rest. A one-click Approve here needs a GitHub App key, see <a href="${esc(tokenDoc)}" target="_blank" rel="noopener">what it would need</a>.</p></div></div>
        ${sug.error ? `<div class="callout warn">${esc(sug.error)}</div>` : sug.items.length ? `<div class="stack">${sug.items.map((x) => {
          const [tone, label] = VERDICT[x.verdict] ?? VERDICT.unchecked;
          return `<div class="lvl1 modrow"><div class="nr-main"><a class="rt" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>
            <div class="nr-meta"><span class="chip">${esc(SUG_KIND[x.kind] ?? 'Suggestion')}</span><span class="pill ${tone}">${tone === 'ok' ? '<i></i>' : ''}${label}</span><span class="muted11">@${esc(x.author)} · ${esc(ago(x.created))}${x.votes ? ` · ${x.votes} want this too` : ''}</span>${x.status === 'approved' ? '<span class="pill ok"><i></i>Approved, waiting to be merged</span>' : ''}</div></div>
            <a class="btn sm ${x.verdict === 'ok' ? 'primary' : 'secondary'}" href="${esc(x.url)}" target="_blank" rel="noopener">${x.verdict === 'ok' ? 'Review and approve' : 'Review'} on GitHub</a></div>`;
        }).join('')}</div>` : '<div class="callout info">No open suggestions.</div>'}</section>`;
    pane.onclick = async (e) => {
      const b = e.target.closest('[data-pact]'); if (!b) return; const id = b.closest('[data-pid]').dataset.pid;
      try {
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

  renderRequestButtons();
  $$('[data-most-requested]').forEach(renderMostRequested);
  renderPitches();
  $$('[data-tag]').forEach(renderTag);
  $$('[data-my-suggestions]').forEach(renderMySuggestions);
  $$('[data-mod-tabs]').forEach(renderModTabs);
  finishPending();
})();

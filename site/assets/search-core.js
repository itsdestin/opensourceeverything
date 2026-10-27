// Open Source Everything: the search ranking. One file shared by the browser (site.js) and the tests
// (site/test/search-eval.mjs), so what the tests measure is exactly what visitors get.
//
// WHY a hand-made ranker instead of a library: the index is ~550 items, so a plain scoring pass on every keypress
// is instant, and the site stays dependency-free. What it adds over "name contains the typed text":
// - typos ("photshop"), spacing ("one note", "whats app") and word order ("editor video");
// - phrases people type around the thing they want ("alternative to", "open source", "free", "app");
// - matches on what something is FOR, not only its name (a project is found by the closed apps it replaces,
//   its group's job and its own summary), with the name always counting most;
// - a small list of everyday words for the same thing ("excel" ~ "spreadsheet", "mail" ~ "email").
(function (root) {
  // Words that describe the search, not the thing searched for. Dropped unless nothing else is left.
  const FILLER = new Set(('alternative alternatives alternativ alt to for open source opensource foss free app apps client clients ' +
    'application applications software program programs tool tools replacement replacements replace like instead of ' +
    'the a an best good similar vs versus or and with my me i want need looking on in at by from into your our it ' +
    'that this what which how can is are some way something many much did does each every just really very also ' +
    'any her his their them she he we us should could would will there here where when see let lets dont doesnt ' +
    'wont cant thing things stuff people').split(' '));

  // Groups of words people use for the same thing. A match through one of these counts a little less than
  // the word itself, so a direct match still wins.
  const SYNONYMS = [
    ['document', 'doc', 'docs', 'word processor', 'writer', 'writing'],
    ['spreadsheet', 'sheet', 'sheets', 'excel', 'calc', 'table'],
    ['presentation', 'slide', 'slides', 'deck', 'powerpoint', 'keynote'],
    ['email', 'mail', 'inbox', 'e-mail'],
    ['message', 'messaging', 'messenger', 'texting', 'sms', 'chat'],
    ['password', 'passwords', 'credential', 'vault'],
    ['two factor', '2fa', 'otp', 'authenticator', 'mfa', 'totp'],
    ['photo', 'photos', 'picture', 'pictures', 'image', 'images', 'pic', 'pics'],
    ['video', 'videos', 'movie', 'movies', 'film', 'films', 'clip'],
    ['music', 'song', 'songs', 'audio', 'sound'],
    ['note', 'notes', 'notebook', 'notetaking', 'note taking'],
    ['task', 'tasks', 'todo', 'to do', 'kanban', 'project management'],
    ['calendar', 'schedule', 'scheduling', 'booking', 'appointment'],
    ['map', 'maps', 'navigation', 'gps', 'directions'],
    ['ai', 'llm', 'chatbot', 'gpt', 'large language model', 'language model'],
    ['cloud', 'drive', 'sync', 'storage'],
    ['browser', 'web browser'],
    ['operating system', 'os', 'distro', 'distribution'],
    ['stream', 'streaming', 'livestream', 'broadcast'],
    ['record', 'recording', 'recorder', 'capture'],
    ['edit', 'editor', 'editing'],
    ['ecommerce', 'e-commerce', 'shop', 'store', 'online store'],
    ['analytics', 'stats', 'statistics', 'tracking'],
    ['book', 'books', 'ebook', 'ebooks', 'e-book', 'kindle', 'audiobook'],
    ['rss', 'feed', 'feeds', 'news reader'],
    ['form', 'forms', 'survey', 'surveys', 'questionnaire', 'poll'],
    ['budget', 'budgeting', 'finance', 'money', 'expenses'],
    ['invoice', 'invoices', 'invoicing', 'billing'],
    ['transcribe', 'transcription', 'speech to text', 'speech', 'dictation', 'voice to text'],
    ['link', 'links', 'url', 'urls'],
    ['speech', 'voice', 'audio', 'spoken'],
    ['local', 'offline', 'own computer', 'own device', 'on device'],
    ['computer', 'laptop', 'desktop', 'pc', 'mac'],
    ['automatic', 'automatically', 'automated', 'automate', 'scheduled'],
    ['privacy', 'private', 'encrypted', 'encryption', 'secure', 'without tracking', 'no tracking', 'not tracking',
      'doesnt track', 'without cookies', 'no cookies', 'doesnt log', 'no logs', 'without logging', 'untracked'],
    ['personal', 'personalized', 'personalised', 'personalize', 'personalise', 'customizable', 'customize', 'customise', 'tailored'],
    ['video call', 'video calls', 'video chat', 'video meeting', 'videoconference', 'video conference'],
    ['team', 'company', 'work', 'workplace', 'coworkers', 'colleagues', 'business', 'office'],
    ['large', 'big', 'huge'],
    ['remote', 'remote desktop', 'remote control', 'vnc', 'remotely', 'far away', 'from anywhere', 'from far away'],
    ['family', 'mom', 'mum', 'dad', 'parents', 'parent', 'grandma', 'grandpa', 'grandparents', 'relatives'],
    ['phone', 'mobile', 'smartphone'],
    ['self hosted', 'selfhosted', 'self host', 'server', 'host myself', 'run myself', 'host it myself', 'my own server',
      'own server', 'own hardware', 'run it myself', 'host my own', 'on my server'],
  ];

  // Closed apps whose names are everyday words. Typing "make" or "square" doesn't mean the app Make or Square POS,
  // so these never trigger the "you named an app" boosts below (they still match normally).
  const EVERYDAY = new Set(('make square threads pocket buffer mode outlier render fly segment clover monday keep rev orbit ' +
    'common room canny loops cursor windsurf teams word pages numbers keynote ' +
    'photos maps music meet drive news books play').split(' '));

  // The words for each device code, and how a result names it ("Runs on iPhone").
  const DEVICE_WORDS = { windows: 'windows pc', mac: 'mac macos apple', linux: 'linux chromebook chromeos', android: 'android chromebook chromeos',
    ios: 'ios iphone ipad apple', web: 'web browser online', server: 'server selfhosted' };
  // WHY a separate table for what a typed word MEANS: "chromebook" runs web apps, Android apps and Linux apps, and "ipad" is
  // an iPhone-class device here. Only unambiguous words: "web" and "browser" are also whole categories, so they are left out.
  const DEVICE_INTENT = { windows: ['windows'], linux: ['linux'], mac: ['mac'], macos: ['mac'], macbook: ['mac'], android: ['android'],
    iphone: ['ios'], ipad: ['ios'], ios: ['ios'], chromebook: ['web', 'android', 'linux'], chromeos: ['web', 'android', 'linux'] };
  const DEVICE_NAMES = { windows: 'Windows', mac: 'Mac', linux: 'Linux', android: 'Android', ios: 'iPhone', web: 'the web', server: 'your own server' };

  const norm = (s) => String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9+]+/g, ' ').trim();
  const words = (s) => norm(s).split(' ').filter(Boolean);
  const compact = (s) => norm(s).replace(/ /g, '');
  // WHY a light stemmer: "editor", "editing" and "edits" should meet at "edit" without a dictionary.
  const stem = (w) => w.length <= 4 ? w : w.replace(/(ings|ing|ers|er|ors|or|ies|es|s|ed|ly)$/, (m) => (m === 'ies' ? 'y' : '')) || w;

  // Map each synonym (stemmed, one or two words) to the stems of its whole group.
  const SYN = new Map();
  // Phrases that are one idea ("to do", "note taking", "speech to text") become one word of their group ("task", "note").
  const CANON = new Map();
  for (const group of SYNONYMS) {
    const keys = group.map((g) => words(g).map(stem).join(' '));
    for (const k of keys) SYN.set(k, new Set([...(SYN.get(k) || []), ...keys]));
    // WHY the first one-word member: it is also a key here, so the merged word still finds its relatives.
    const one = group.find((g) => !/[ -]/.test(g)) || words(group[0]).join('');
    for (const k of keys) if (k.includes(' ') && !CANON.has(k)) CANON.set(k, one);
  }

  // Damerau-Levenshtein distance, stopping early once it passes max. WHY three reused rows instead of a fresh
  // table: it runs thousands of times per keystroke, and allocating made it the slowest part of search.
  let R0 = new Int32Array(64), R1 = new Int32Array(64), R2 = new Int32Array(64);
  function dist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    if (b.length + 1 > R0.length) { R0 = new Int32Array(b.length + 1); R1 = new Int32Array(b.length + 1); R2 = new Int32Array(b.length + 1); }
    let prev2 = R0, prev = R1, cur = R2;
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      cur[0] = i; let rowMin = i;
      for (let j = 1; j <= b.length; j++) {
        const c = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
        if (i > 1 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) v = Math.min(v, prev2[j - 2] + 1);
        cur[j] = v; if (v < rowMin) rowMin = v;
      }
      if (rowMin > max) return max + 1;
      const t = prev2; prev2 = prev; prev = cur; cur = t;
    }
    return prev[b.length];
  }
  const typoAllowance = (len) => (len >= 8 ? 2 : len >= 4 ? 1 : 0);

  // WHY a shared vocabulary: every distinct word on the site is compared with each typed word ONCE per
  // keystroke (exact, stem, start, typo), and items then just look the answers up. Comparing word by word inside
  // every item made long searches take ~35 ms each; this keeps every keystroke instant on phones too.
  function makeVocab() {
    const index = new Map(), list = [], stems = [];
    const id = (w) => { let i = index.get(w); if (i === undefined) { i = list.length; index.set(w, i); list.push(w); stems.push(stem(w)); } return i; };
    // One searchable text: its word ids, stems, the text with spaces removed, and with spaces kept (for word pairs).
    // role: which part of the item this is, so results can say why they matched ("Runs on Linux").
    const field = (text, weight, role = 'name') => {
      const w = words(text), s = w.map(stem);
      return { ids: Int32Array.from(w.map(id)), sset: new Set(s), c: compact(text), t: ' ' + w.join(' ') + ' ', weight, role };
    };
    return { list, stems, field };
  }

  // How well one typed word matches every vocabulary word: ex (exact, stem, start) and fz (also typos).
  function wordTable(vocab, q, qs, partial) {
    const n = vocab.list.length, ex = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const w = vocab.list[i];
      if (w === q) ex[i] = 1;
      else if (vocab.stems[i] === qs) ex[i] = 0.95;
      else if (partial && q.length >= 2 && w.startsWith(q)) ex[i] = q.length >= 3 ? 0.85 : 0.6;
    }
    let fz = null;
    const fuzzy = () => {
      if (fz) return fz;
      fz = Float32Array.from(ex);
      const max = typoAllowance(q.length);
      if (max) for (let i = 0; i < n; i++) {
        if (fz[i] >= 0.75) continue;
        const w = vocab.list[i];
        if (dist(q, w, max) <= max) fz[i] = 0.75;
        else if (w.length > q.length && dist(q, w.slice(0, q.length), max) <= max) fz[i] = Math.max(fz[i], 0.6);
      }
      return fz;
    };
    // For whole-phrase checks: which vocabulary words count as "this word is here" (exact, stem or start).
    const hit = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (ex[i] >= 0.8) hit[i] = 1;
    return { q, qs, partial, ex, fuzzy, hit };
  }

  // How well one typed word matches one field (0 = not at all, 1 = exactly).
  function wordMatch(wt, f, allowFuzzy) {
    const table = allowFuzzy ? wt.fuzzy() : wt.ex;
    let best = 0;
    for (let i = 0; i < f.ids.length; i++) { const v = table[f.ids[i]]; if (v > best) { best = v; wt.at = f.ids[i]; if (v === 1) return 1; } }
    // Spacing differences: "onenote" vs "one note", "whatsapp" vs "whats app". In names, three-letter words
    // count too ("llm" in AnythingLLM), a little lower: buried in a longer word, they're a weaker sign.
    // WHY partial: only the word still being typed is a fragment; earlier words are whole ("type" in "private
    // search that doesnt log what i type" is not the start of "Typesense").
    const q = wt.q;
    if (wt.partial && best < 0.8 && q.length >= 4 && f.c.includes(q)) { best = 0.8; wt.at = -1; }
    else if (wt.partial && best < 0.75 && q.length === 3 && f.weight >= 0.9 && f.c.includes(q)) { best = 0.75; wt.at = -1; }
    return best;
  }

  // Turn the raw search.json into searchable items. Done once, when the index first loads.
  function prepare(raw) {
    const vocab = makeVocab(), field = vocab.field;
    const items = [];
    for (const x of raw.closed) items.push({ kind: 'closed', n: x.n, u: x.u, label: x.g, pop: 0,
      fields: [field(x.n, 1), field(x.g, 0.45, 'group'), field(x.j, 0.35, 'job')], groups: [x.g], jobs: [x.j] });
    // WHY the group's id as a near-name: ids are the short words people type ("2fa", "crm", "pdf", "vpn").
    for (const x of raw.groups) items.push({ kind: 'group', n: x.n, u: x.u, label: x.c, pop: 0,
      fields: [field(x.n, 1), field(x.u.replace(/^g\/|\/$/g, '').replace(/-/g, ' '), 0.9), field((x.x || []).join(' '), 0.7, 'replaces'), field(x.j, 0.6, 'job'),
        field((x.k || []).join(' '), 0.5, 'phrases'), field(x.c, 0.35, 'category')], phrases: (x.k || []).map((p) => field(p, 1, 'phrase')),
      closed: x.x || [], jobs: [x.j], phraseText: x.k || [], cat: x.c });
    for (const x of raw.projects) {
      const gs = (x.gi || []).map((i) => raw.groups[i]).filter(Boolean);
      // WHY a middling guess when stars are unknown: those are mostly big projects hosted off GitHub (GIMP, Krita,
      // LibreOffice), which shouldn't rank as if nobody used them.
      items.push({ kind: 'project', n: x.n, u: x.u, label: x.g, dead: !!x.dead, easy: !!x.ez, // WHY: easy-setup projects get a tiny lift (Oct 26), never enough to beat a real match
        pop: Math.log10((x.st ?? 3000) + 1) / 6, ed: x.r != null ? Math.max(0, 5 - x.r) / 5 : 0,
        // WHY devices as a field: "linux note app" should favour apps that run on Linux, and say so.
        fields: [field(x.n, 1), Object.assign(field(gs.flatMap((g) => g.x || []).join(' '), 0.6, 'replaces'), { replaces: true }),
          Object.assign(field(gs.map((g) => g.n).join(' '), 0.5, 'group'), { group: true }),
          field(gs.map((g) => g.j).join(' '), 0.4, 'job'), field((x.k || []).join(' '), 0.45, 'phrases'),
          field((x.pl || []).map((p) => DEVICE_WORDS[p] || '').join(' '), 0.6, 'device'), field(x.s, 0.3, 'summary'),
          // WHY (forks stream): an old name ("kbin", "OpenOffice") finds the project that continues it; each old name is its own field so
          // "Looking for kbin? ..." can say which one matched.
          ...(x.o || []).map((o) => field(o, 0.85, 'old'))],
        old: (x.o || []).map((o, i) => ({ name: o, text: (x.ot || [])[i] })),
        phrases: (x.k || []).map((p) => field(p, 1, 'phrase')),
        closed: gs.flatMap((g) => g.x || []), groups: gs.map((g) => g.n), jobs: gs.map((g) => g.j), phraseText: x.k || [], pl: x.pl || [] });
    }
    for (const it of items) { it.nc = compact(it.n); it.nn = norm(it.n); }
    items.vocab = vocab;
    return items;
  }

  function parseQuery(text) {
    let ws = words(text);
    // WHY merge first: "to do" would otherwise lose "to" as a filler word and become just "do".
    for (const n of [3, 2]) {
      for (let i = 0; i + n <= ws.length; i++) {
        const key = ws.slice(i, i + n).map(stem).join(' ');
        if (CANON.has(key)) ws.splice(i, n, CANON.get(key));
      }
    }
    const kept = ws.filter((w) => !FILLER.has(w));
    if (kept.length) ws = kept;
    // WHY remember the device but keep the word in the search: "linux" still helps find Linux apps by text, and the
    // device also reorders projects afterwards (see deviceAdjust), so a Mac-only app doesn't top "photo editor for linux".
    const dev = new Set(); if (ws.length > 1) for (const w of ws) for (const c of DEVICE_INTENT[w] || []) dev.add(c);
    return { ws, ss: ws.map(stem), phrase: ws.join(' '), c: ws.join(''), dev };
  }

  // WHY a nudge, not a filter: platform lists are incomplete, and an app that can run in a browser or on your own server
  // may still be usable. Running on the named device lifts a project, not running there lowers it (it can drop out if it was a weak match), below a real
  // name/phrase match. Only with 2+ words, so a lone "linux" still finds the Linux group and distros by name.
  function deviceAdjust(it, q) {
    if (!q.dev.size || it.kind !== 'project' || !it.pl.length) return 0;
    if (it.pl.some((p) => q.dev.has(p))) return 0.12;
    return it.pl.some((p) => p === 'web' || p === 'server') ? -0.12 : -0.3;
  }

  // Score one item for a parsed query. 0 means "not a result".
  const PRIOR = { group: 0.3, closed: 0.1, project: 0 };
  function score(it, q) {
    const s0 = scoreText(it, q);
    return s0 > 0 ? Math.max(0.05, s0 + deviceAdjust(it, q)) : s0;
  }
  function scoreText(it, q) {
    const short = q.c.length <= 2;
    // WHY check the name with spaces removed first: "drop box", "libre office" and "you tube" are the name,
    // just spaced differently, even though "box" alone matches nothing.
    const nameHit = q.c.length >= 4 && (it.nc === q.c || (q.ws.length > 1 && it.nc.startsWith(q.c)) ||
      (q.ws.length > 1 && q.c.length >= 6 && it.nc.includes(q.c)) || // "one note" in "Microsoft OneNote"
      // A typo and odd spacing at once ("libre ofice"): compare without spaces, allowing the usual typos.
      (q.ws.length > 1 && q.c.length >= 6 && dist(q.c, it.nc.slice(0, q.c.length), typoAllowance(q.c.length)) <= typoAllowance(q.c.length)));
    let total = 0, missed = 0, onName = 0, groupWords = 0, typoNamed = false, replacesNamed = false;
    for (let i = 0; i < q.ws.length; i++) {
      let best = 0, named = false, inGroup = false;
      for (const f of it.fields) {
        if (short && f.weight < 1) continue; // one or two letters only match names
        // WHY typos only count against names: a typo matching some word in a description is mostly noise.
        let m = wordMatch(q.wt[i], f, !short && (f.weight >= 0.9 || (f.weight >= 0.6 && q.ws[i].length >= 5 && it.kind !== 'group')));
        // WHY only direct matches earn the "whole name" bonus: a related word ("voice" for "speech") is a hint,
        // not proof that the name is what was asked for.
        if (f.weight >= 0.9 && m >= 0.8) named = true;
        // A misspelled app name inside a longer search ("dropbx that I run myself") still names that app.
        // "Strong" = the whole word or a typo of a whole word (not a prefix, not inside another word), and not
        // an everyday word that happens to be an app's name.
        const strong = (m >= 0.95 || m === 0.75) && q.ws[i].length >= 4 && !EVERYDAY.has(q.ws[i]);
        if (f.weight === 1 && strong && it.kind === 'closed') typoNamed = true;
        if (f.replaces && strong) replacesNamed = true;
        if (f.group && m >= 0.8) inGroup = true; // also direct matches only
        // A related everyday word ("excel" for "spreadsheet") counts, a little less than the word itself.
        if (m < 0.7) for (const parts of q.alts[i]) if (parts.every((p) => f.sset.has(p))) { m = Math.max(m, 0.85); break; }
        best = Math.max(best, m * f.weight);
      }
      if (inGroup) groupWords++;
      if (named) onName++;
      if (best === 0) missed++;
      total += best;
    }
    // WHY every word must land somewhere, mostly: "video editor" should not list every video app, but one
    // stray word ("teh gimp", "privacy phone") shouldn't hide an otherwise good match. Those rank lower instead.
    // Long searches ("help my mom with her computer from far away") need only ~40% of their words to land.
    const need = q.ws.length >= 4 ? Math.ceil(q.ws.length * 0.4) : Math.ceil(q.ws.length / 2);
    if (missed && !nameHit && (q.ws.length < 2 || q.ws.length - missed < need) && !(typoNamed && it.kind === 'closed')) return 0;
    // WHY a bonus for words side by side: "self-hosted google drive" means the app Google Drive, so projects
    // that replace exactly that beat ones that merely mention Google somewhere.
    if (q.ws.length > 1) {
      let adj = 0;
      for (const f of it.fields) for (const pair of q.pairs) if (f.t.includes(pair)) adj = Math.max(adj, f.weight);
      total += adj * 0.5;
    }
    // WHY whole phrases count extra: "android without google" landing in one written phrase is a much
    // stronger sign than the same three words scattered across a description.
    if (q.ws.length > 1 && it.phrases && it.phrases.length) {
      let bestCover = 0;
      for (const ph of it.phrases) {
        let hit = 0;
        for (let i = 0; i < q.ws.length; i++) { const h = q.wt[i].hit; for (let k = 0; k < ph.ids.length; k++) if (h[ph.ids[k]]) { hit++; break; } }
        if (hit >= 2) bestCover = Math.max(bestCover, hit / q.ws.length);
      }
      total += bestCover * 0.45 * q.ws.length;
    }
    let s = nameHit ? Math.max(1, total / q.ws.length) : (total / q.ws.length) * (1 - missed / (2 * q.ws.length));
    // WHY: when the search names the project's group ("password manager"), every project in it is equally
    // relevant and small wording differences in descriptions shouldn't decide; the editors' order (best-first) does.
    // Kept below the group page itself, which is the better first stop; only an exact name match lifts it.
    if (it.kind === 'project' && groupWords === q.ws.length) {
      return 0.8 + (it.ed || 0) * 0.4 + it.pop * 0.08 + (it.easy ? 0.03 : 0) + (it.nn === q.phrase || it.nc === q.c ? 1.2 : 0) - (it.dead ? 0.1 : 0);
    }
    // The name itself, as a whole, is the strongest signal.
    if (it.nn === q.phrase || it.nc === q.c) s += 1.2;
    else if (it.nn.startsWith(q.phrase + ' ')) s += 0.6;
    // WHY whole words beat word starts: "word" means Microsoft Word, not WordPress.
    else if (onName >= q.ws.length) s += 0.5;
    else if (it.nn.startsWith(q.phrase) || it.nc.startsWith(q.c)) s += 0.3;
    else if (q.c.length >= 3 && it.nc.includes(q.c)) s += 0.2;
    // Part of the search is the name ("dating" for the Dating group): worth something even if the rest isn't.
    else if (onName) s += 0.25 * onName / q.ws.length;
    // WHY groups get a head start: for a general word ("browser", "keyboard"), the group page listing every
    // option is a better first stop than one project that happens to have the word in its name.
    // Only when every word matched: a group that matches half the search shouldn't outrank a project that
    // matches all of it ("self hosted photos" → Immich, not every photo group).
    if (!missed) s += PRIOR[it.kind];
    // WHY: a search that names a closed app plus a wish ("dropbox that I host myself") is about that app:
    // its own page stays visible, and projects that replace it rise above ones that only match the wish.
    if (q.ws.length > 1 && it.kind === 'closed' && typoNamed) s = Math.max(s, 0.7);
    if (q.ws.length > 1 && replacesNamed) s += 0.25;
    // Popular, living projects edge out obscure or abandoned ones when everything else is equal.
    s += it.pop * 0.08 + (it.ed || 0) * 0.1 + (it.easy ? 0.03 : 0);
    if (it.dead) s -= 0.1;
    return s;
  }

  const LIMITS = { closed: 5, group: 4, project: 6 };
  const MIN = 0.3;

  // How strong a match is, in words people understand. WHY fixed steps, not a percentage: a number like 73%
  // suggests a precision the scores don't have. Steps were set by looking at where right and wrong first results
  // fall across the 398 test searches: e.g. 90% of non-answers to short searches score under 1.25, so "Best"
  // starts at 1.3. Longer searches spread each point over more words and score lower, so they get lower steps.
  const TIERS = {
    short: [[1.3, 4, 'Best match'], [1.0, 3, 'Strong match'], [0.75, 2, 'Good match'], [0, 1, 'Partial match']],
    long: [[1.0, 4, 'Best match'], [0.8, 3, 'Strong match'], [0.6, 2, 'Good match'], [0, 1, 'Partial match']],
    veryLong: [[0.9, 4, 'Best match'], [0.7, 3, 'Strong match'], [0.5, 2, 'Good match'], [0, 1, 'Partial match']],
  };
  function strength(score, nWords = 1) {
    const t = TIERS[nWords >= 5 ? 'veryLong' : nWords >= 3 ? 'long' : 'short'].find(([min]) => score >= min);
    return { level: t[1], strength: t[2] };
  }

  // Why an item matched, in a few short plain phrases: [{ text, kind }]. Only run for results being shown.
  function explain(it, q) {
    const out = new Map(); // text -> kind
    const add = (text, kind) => { if (text && !out.has(text)) out.set(text, kind); };
    // A written phrase that covers several of the typed words is the clearest reason, so it goes first.
    if (it.phrases && q.ws.length > 1) {
      let best = -1, bestHits = 1;
      it.phrases.forEach((ph, k) => {
        let hits = 0;
        for (const wt of q.wt) { for (let j = 0; j < ph.ids.length; j++) if (wt.hit[ph.ids[j]]) { hits++; break; } }
        if (hits > bestHits) { bestHits = hits; best = k; }
      });
      if (best >= 0) add(`“${it.phraseText[best]}”`, 'phrase');
    }
    const vocab = it.fields[0] && q.vocab;
    for (let i = 0; i < q.ws.length; i++) {
      let top = 0, f0 = null, word = null;
      for (const f of it.fields) {
        const m = wordMatch(q.wt[i], f, f.weight >= 0.9) * f.weight;
        if (m > top) { top = m; f0 = f; word = q.wt[i].at >= 0 ? vocab.list[q.wt[i].at] : q.ws[i]; }
      }
      if (!f0) continue;
      const has = (list) => list.find((x) => words(x).some((w) => w === word || stem(w) === stem(word) || w.startsWith(word))) || list[0];
      if (f0.role === 'old') add((it.old.find((o) => words(o.name).some((w) => w === word || stem(w) === stem(word) || w.startsWith(word))) || it.old[0]).text, 'old');
      else if (f0.role === 'name') add('Name', 'name');
      else if (f0.role === 'device') add(`Runs on ${it.pl.filter((p) => (DEVICE_WORDS[p] || '').split(' ').includes(word)).map((p) => DEVICE_NAMES[p]).join(', ') || DEVICE_NAMES[it.pl[0]]}`, 'device');
      else if (f0.role === 'replaces') add(`${it.kind === 'group' ? 'Covers' : 'Replaces'} ${has(it.closed)}`, 'replaces');
      else if (f0.role === 'group') add(`In ${has(it.groups)}`, 'group');
      else if (f0.role === 'job') add(has(it.jobs), 'job');
      else if (f0.role === 'phrases') add(`“${has(it.phraseText)}”`, 'phrase');
      else if (f0.role === 'category') add(it.cat, 'group');
      else if (f0.role === 'summary') add(`Description mentions “${word}”`, 'summary');
    }
    return [...out].slice(0, 3).map(([text, kind]) => ({ text, kind }));
  }

  // Search. By default returns what the dropdown shows: sections in the order to show them (the section holding the
  // best match first), each with its best-scoring items: [{ kind, items: [{ n, u, label, score }] }].
  // With { all: true }: every result in one ranked list, each with its strength and why it matched (results page).
  function search(items, text, opts = {}) {
    const q = parseQuery(text);
    if (!q.c) return [];
    // Work done once per keystroke, then shared by every item: word tables, related words, word pairs.
    q.wt = q.ws.map((w, i) => wordTable(items.vocab, w, q.ss[i], i === q.ws.length - 1 || w.length >= 5));
    q.alts = q.ss.map((st, i) => [...(SYN.get(st) || []), ...((i + 1 < q.ss.length && SYN.get(st + ' ' + q.ss[i + 1])) || [])].map((a) => a.split(' ')));
    q.pairs = q.ws.slice(1).map((w, i) => ' ' + q.ws[i] + ' ' + w + ' ');
    q.vocab = items.vocab;
    const by = { closed: [], group: [], project: [] };
    for (const it of items) {
      const s = score(it, q);
      if (s >= MIN) by[it.kind].push({ n: it.n, u: it.u, label: it.label, kind: it.kind, score: s, it });
    }
    // WHY a cut relative to each section's best match: once a group fits well, half-matching groups ("Video
    // calls" for "video editor") are clutter. Per section, so the projects under a good group still show.
    for (const k of Object.keys(by)) {
      const top = Math.max(0, ...by[k].map((x) => x.score));
      by[k] = by[k].filter((x) => x.score >= top * 0.45).sort((a, b) => b.score - a.score || a.n.localeCompare(b.n));
    }
    const finish = (x) => ({ n: x.n, u: x.u, label: x.label, kind: x.kind, score: x.score, ...strength(x.score, q.ws.length) });
    if (opts.all) {
      return Object.values(by).flat().sort((a, b) => b.score - a.score || a.n.localeCompare(b.n))
        .map((x) => ({ ...finish(x), why: explain(x.it, q), pl: x.it.pl || [] }));
    }
    const sections = Object.entries(by).map(([kind, list]) => ({ kind, items: list.slice(0, LIMITS[kind]).map(finish) })).filter((sec) => sec.items.length);
    // WHY sections follow their best match: "video editor" should open on the Video editing group, "gimp" on GIMP.
    return sections.sort((a, b) => b.items[0].score - a.items[0].score);
  }

  root.OISearch = { prepare, search, parseQuery, norm, stem, dist, strength, TIERS };
})(typeof window !== 'undefined' ? window : globalThis);

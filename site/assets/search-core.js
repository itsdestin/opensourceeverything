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
    'that this what which how can is are some way something').split(' '));

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
    ['encrypted', 'encryption', 'private', 'privacy', 'secure'],
    ['large', 'big', 'huge'],
    ['remote', 'remote desktop', 'remote control', 'vnc'],
    ['phone', 'mobile', 'smartphone'],
    ['self hosted', 'selfhosted', 'self host', 'server'],
  ];

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

  // Damerau-Levenshtein distance, stopping early once it passes max.
  function dist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    const d = [];
    for (let i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (let j = 0; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      let rowMin = Infinity;
      for (let j = 1; j <= b.length; j++) {
        const c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        rowMin = Math.min(rowMin, d[i][j]);
      }
      if (rowMin > max) return max + 1;
    }
    return d[a.length][b.length];
  }
  const typoAllowance = (len) => (len >= 8 ? 2 : len >= 4 ? 1 : 0);

  // One searchable text: its words, their stems, and the whole thing with spaces removed.
  function field(text, weight) {
    const w = words(text);
    return { w, s: w.map(stem), c: compact(text), weight };
  }

  // How well one query word matches one field (0 = not at all, 1 = exactly).
  function wordMatch(q, qs, f, allowFuzzy) {
    let best = 0;
    for (let i = 0; i < f.w.length; i++) {
      const w = f.w[i], s = f.s[i];
      if (w === q) return 1;
      if (s === qs) best = Math.max(best, 0.95);
      else if (q.length >= 2 && w.startsWith(q)) best = Math.max(best, q.length >= 3 ? 0.85 : 0.6);
      else if (allowFuzzy && best < 0.75) {
        const max = typoAllowance(q.length);
        if (max && dist(q, w, max) <= max) best = Math.max(best, 0.75);
        else if (max && w.length > q.length && dist(q, w.slice(0, q.length), max) <= max) best = Math.max(best, 0.6);
      }
    }
    // Spacing differences: "onenote" vs "one note", "whatsapp" vs "whats app". In names, three-letter words
    // count too ("llm" in AnythingLLM), a little lower: buried in a longer word, they're a weaker sign.
    if (best < 0.8 && q.length >= 4 && f.c.includes(q)) best = 0.8;
    else if (best < 0.75 && q.length === 3 && f.weight >= 0.9 && f.c.includes(q)) best = 0.75;
    return best;
  }

  // Turn the raw search.json into searchable items. Done once, when the index first loads.
  function prepare(raw) {
    const items = [];
    for (const x of raw.closed) items.push({ kind: 'closed', n: x.n, u: x.u, label: x.g, pop: 0,
      fields: [field(x.n, 1), field(x.g, 0.45), field(x.j, 0.35)] });
    // WHY the group's id as a near-name: ids are the short words people type ("2fa", "crm", "pdf", "vpn").
    for (const x of raw.groups) items.push({ kind: 'group', n: x.n, u: x.u, label: x.c, pop: 0,
      fields: [field(x.n, 1), field(x.u.replace(/^g\/|\/$/g, '').replace(/-/g, ' '), 0.9), field((x.x || []).join(' '), 0.7), field(x.j, 0.6), field(x.c, 0.35)] });
    for (const x of raw.projects) {
      const gs = (x.gi || []).map((i) => raw.groups[i]).filter(Boolean);
      // WHY a middling guess when stars are unknown: those are mostly big projects hosted off GitHub (GIMP, Krita,
      // LibreOffice), which shouldn't rank as if nobody used them.
      items.push({ kind: 'project', n: x.n, u: x.u, label: x.g, dead: !!x.dead,
        pop: Math.log10((x.st ?? 3000) + 1) / 6, ed: x.r != null ? Math.max(0, 5 - x.r) / 5 : 0,
        fields: [field(x.n, 1), field(gs.flatMap((g) => g.x || []).join(' '), 0.6), field(gs.map((g) => g.n).join(' '), 0.5),
          field(gs.map((g) => g.j).join(' '), 0.4), field(x.s, 0.3)] });
    }
    for (const it of items) { it.nc = compact(it.n); it.nn = norm(it.n); }
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
    return { ws, ss: ws.map(stem), phrase: ws.join(' '), c: ws.join('') };
  }

  // Score one item for a parsed query. 0 means "not a result".
  const PRIOR = { group: 0.3, closed: 0.1, project: 0 };
  function score(it, q) {
    const short = q.c.length <= 2;
    // WHY check the name with spaces removed first: "drop box", "libre office" and "you tube" are the name,
    // just spaced differently, even though "box" alone matches nothing.
    const nameHit = q.c.length >= 4 && (it.nc === q.c || (q.ws.length > 1 && it.nc.startsWith(q.c)) ||
      // A typo and odd spacing at once ("libre ofice"): compare without spaces, allowing the usual typos.
      (q.ws.length > 1 && q.c.length >= 6 && dist(q.c, it.nc.slice(0, q.c.length), typoAllowance(q.c.length)) <= typoAllowance(q.c.length)));
    let total = 0, missed = 0, onName = 0;
    for (let i = 0; i < q.ws.length; i++) {
      let best = 0, named = false;
      for (const f of it.fields) {
        if (short && f.weight < 1) continue; // one or two letters only match names
        // WHY typos only count against names: a typo matching some word in a description is mostly noise.
        let m = wordMatch(q.ws[i], q.ss[i], f, !short && f.weight >= 0.9);
        // WHY only direct matches earn the "whole name" bonus: a related word ("voice" for "speech") is a hint,
        // not proof that the name is what was asked for.
        if (f.weight >= 0.9 && m >= 0.8) named = true;
        // A related everyday word ("excel" for "spreadsheet") counts, a little less than the word itself.
        if (m < 0.7) {
          const one = SYN.get(q.ss[i]);
          const two = i + 1 < q.ws.length ? SYN.get(q.ss[i] + ' ' + q.ss[i + 1]) : null;
          for (const alt of [...(one || []), ...(two || [])]) {
            const parts = alt.split(' ');
            if (parts.every((p) => f.s.includes(p))) { m = Math.max(m, 0.85); break; }
          }
        }
        best = Math.max(best, m * f.weight);
      }
      if (named) onName++;
      if (best === 0) missed++;
      total += best;
    }
    // WHY every word must land somewhere, mostly: "video editor" should not list every video app, but one
    // stray word ("teh gimp", "privacy phone") shouldn't hide an otherwise good match. Those rank lower instead.
    if (missed && !nameHit && (q.ws.length < 2 || missed * 2 > q.ws.length)) return 0;
    // WHY a bonus for words side by side: "self-hosted google drive" means the app Google Drive, so projects
    // that replace exactly that beat ones that merely mention Google somewhere.
    if (q.ws.length > 1) {
      let adj = 0;
      for (const f of it.fields) {
        const text = ' ' + f.w.join(' ') + ' ';
        for (let i = 0; i + 1 < q.ws.length; i++) if (text.includes(' ' + q.ws[i] + ' ' + q.ws[i + 1] + ' ')) adj = Math.max(adj, f.weight);
      }
      total += adj * 0.5;
    }
    let s = nameHit ? Math.max(1, total / q.ws.length) : (total / q.ws.length) * (1 - missed / (2 * q.ws.length));
    // The name itself, as a whole, is the strongest signal.
    if (it.nn === q.phrase || it.nc === q.c) s += 1.2;
    else if (it.nn.startsWith(q.phrase + ' ')) s += 0.6;
    // WHY whole words beat word starts: "word" means Microsoft Word, not WordPress.
    else if (onName >= q.ws.length) s += 0.5;
    else if (it.nn.startsWith(q.phrase) || it.nc.startsWith(q.c)) s += 0.3;
    else if (q.c.length >= 3 && it.nc.includes(q.c)) s += 0.2;
    // WHY groups get a head start: for a general word ("browser", "keyboard"), the group page listing every
    // option is a better first stop than one project that happens to have the word in its name.
    // Only when every word matched: a group that matches half the search shouldn't outrank a project that
    // matches all of it ("self hosted photos" → Immich, not every photo group).
    if (!missed) s += PRIOR[it.kind];
    // Popular, living projects edge out obscure or abandoned ones when everything else is equal.
    s += it.pop * 0.08 + (it.ed || 0) * 0.1;
    if (it.dead) s -= 0.1;
    return s;
  }

  const LIMITS = { closed: 5, group: 4, project: 6 };
  const MIN = 0.3;

  // Returns sections in the order to show them (the section holding the best match first), each with
  // its best-scoring items: [{ kind, items: [{ n, u, label, score }] }].
  function search(items, text) {
    const q = parseQuery(text);
    if (!q.c) return [];
    const by = { closed: [], group: [], project: [] };
    for (const it of items) {
      const s = score(it, q);
      if (s >= MIN) by[it.kind].push({ n: it.n, u: it.u, label: it.label, score: s });
    }
    // WHY a cut relative to each section's best match: once a group fits well, half-matching groups ("Video
    // calls" for "video editor") are clutter. Per section, so the projects under a good group still show.
    for (const k of Object.keys(by)) {
      const top = Math.max(0, ...by[k].map((x) => x.score));
      by[k] = by[k].filter((x) => x.score >= top * 0.45);
    }
    const sections = Object.entries(by).map(([kind, list]) => ({
      kind, items: list.sort((a, b) => b.score - a.score || a.n.localeCompare(b.n)).slice(0, LIMITS[kind]),
    })).filter((sec) => sec.items.length);
    // WHY sections follow their best match: "video editor" should open on the Video editing group, "gimp" on GIMP.
    return sections.sort((a, b) => b.items[0].score - a.items[0].score);
  }

  root.OISearch = { prepare, search, parseQuery, norm, stem, dist };
})(typeof window !== 'undefined' ? window : globalThis);

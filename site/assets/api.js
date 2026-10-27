// The site's connection to the real server (api.opensourceeverything.org, worker/). Same calls and answers as the
// preview's pretend server (fake-api.js); the rules behind them are in docs/server-rules.md.
// WHY credentials + the X-OSE header: the sign-in cookie lives on the server's address, and the header (with the
// server's Origin check) proves a change came from this site, not from another website the visitor has open.
(function () {
  const URL_ = window.OI_API_URL;
  async function call(method, path, body) {
    let r;
    try {
      r = await fetch(URL_ + path, { method, credentials: 'include', headers: body ? { 'Content-Type': 'application/json', 'X-OSE': '1' } : method === 'GET' ? {} : { 'X-OSE': '1' }, body: body ? JSON.stringify(body) : undefined });
    } catch { throw Object.assign(new Error("Couldn't reach the server. Check your connection and try again."), { status: 0 }); }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || "That didn't work. Try again."), { status: r.status });
    return data;
  }
  const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')).toString();
  const n = (id) => `/notes/${encodeURIComponent(id)}`;
  const api = {
    url: URL_,
    me: () => call('GET', '/me'),
    signOut: () => call('POST', '/auth/logout'),
    deleteAccount: () => call('DELETE', '/me'),
    ratings: (pairs) => call('POST', '/ratings/query', { pairs }),
    rate: (group, project, value) => call('POST', '/ratings', { group, project, value }),
    notes: (q = {}) => call('GET', `/notes?${qs(q)}`),
    counts: (group) => call('GET', `/counts?${qs({ group })}`),
    note: (id) => call('GET', n(id)),
    addNote: (note) => call('POST', '/notes', note),
    editNote: (id, { title, body }) => call('PATCH', n(id), { title, body }),
    deleteNote: (id) => call('DELETE', n(id)),
    vote: (id, on) => call('POST', `${n(id)}/vote`, { on }),
    reply: (id, body) => call('POST', `${n(id)}/replies`, { body }),
    editReply: (id, rid, body) => call('PATCH', `${n(id)}/replies/${encodeURIComponent(rid)}`, { body }),
    deleteReply: (id, rid) => call('DELETE', `${n(id)}/replies/${encodeURIComponent(rid)}`),
    claimFixed: (id, link) => call('POST', `${n(id)}/fixed`, { link }),
    withdrawFixed: (id) => call('DELETE', `${n(id)}/fixed`),
    confirmFixed: (id) => call('POST', `${n(id)}/fixed/confirm`, {}),
    building: (id, link) => call('POST', `${n(id)}/building`, { link }),
    removeBuilding: (id) => call('DELETE', `${n(id)}/building`),
    report: (id, reason) => call('POST', `${n(id)}/report`, { reason }),
    setStatus: (id, status) => call('POST', `${n(id)}/status`, { status }),
    modQueue: () => call('GET', '/mod/queue'),
    modAct: (a) => call('POST', '/mod/act', a),
    // "I want this too", Your suggestions, Tag my project, mod Suggestions (docs/server-rules.md)
    requests: (q = {}) => call('GET', `/requests?${qs(q)}`),
    requestVote: (key, on) => call('POST', '/requests/vote', { key, on }),
    mySuggestions: () => call('GET', '/me/suggestions'),
    modSuggestions: () => call('GET', '/mod/suggestions'),
    pitchStart: (url) => call('POST', '/pitches/start', { url }),
    pitchVerify: (id) => call('POST', `/pitches/${encodeURIComponent(id)}/verify`, {}),
    pitchSave: (id, body) => call('PUT', `/pitches/${encodeURIComponent(id)}`, body),
    pitchDelete: (id) => call('DELETE', `/pitches/${encodeURIComponent(id)}`),
    myPitches: () => call('GET', '/pitches/mine'),
    livePitches: (ids) => call('GET', `/pitches/live?${qs({ projects: ids.join(',') })}`),
    modPitches: () => call('GET', '/mod/pitches'),
    modPitchAct: (id, action, reason) => call('POST', `/mod/pitches/${encodeURIComponent(id)}`, { action, reason }),
  };
  window.OI = Object.assign(window.OI || {}, { api });
})();

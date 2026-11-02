// The plain JSON API for assistants and scripts that don't speak MCP: GET /v1/... Same seven tools as the connector
// (agent.js), same answers. Read-only; open to every website (GET only, no sign-in, no cookies).
//   /v1/search?q=&device=&setup=&limit=      /v1/apps/<slug>?device=&setup=      /v1/groups/<id>      /v1/projects/<id>
//   /v1/gaps?category=&coverage=             /v1/compare?ids=a,b,c               /v1/projects/<id>/contribute
// Described for machines in /openapi.json (built by site/src/openapi.mjs).
import { TOOLS, ToolError, loadData } from './agent.js';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' };
const reply = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS, ...extra } });

export async function handleV1(req, env, url, { limited } = {}) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'GET') return reply({ error: 'GET only.' }, 405, { Allow: 'GET, OPTIONS' });
  const q = url.searchParams; const parts = url.pathname.replace(/^\/v1\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [kind, id, sub] = parts;
  let call;
  if (kind === 'search' && parts.length === 1) call = ['search', { query: q.get('q') ?? '', device: q.get('device') ?? undefined, setup: q.get('setup') ?? undefined, limit: q.get('limit') }];
  else if (kind === 'apps' && id && parts.length === 2) call = ['alternatives_to', { app: id, device: q.get('device') ?? undefined, setup: q.get('setup') ?? undefined, limit: q.get('limit') }];
  else if (kind === 'groups' && id && parts.length === 2) call = ['get_group', { id, device: q.get('device') ?? undefined, setup: q.get('setup') ?? undefined }];
  else if (kind === 'projects' && id && parts.length === 2) call = ['get_project', { id }];
  else if (kind === 'projects' && id && sub === 'contribute' && parts.length === 3) call = ['how_to_contribute', { project_id: id }];
  else if (kind === 'gaps' && parts.length === 1) call = ['list_gaps', { category: q.get('category') ?? undefined, coverage: q.get('coverage') ?? undefined, limit: q.get('limit') }];
  else if (kind === 'compare' && parts.length === 1) call = ['compare', { project_ids: q.get('ids') ?? '' }];
  else return reply({ error: 'Not found. See /openapi.json for the list of calls.' }, 404);
  if (limited && await limited(req, env)) return reply({ error: 'Slow down a little, then try again.' }, 429, { 'Retry-After': '30' });
  try {
    const D = await loadData(env);
    // WHY cached for 5 minutes: the data only changes when the site is rebuilt, and repeated questions then cost nothing.
    return reply(TOOLS[call[0]](D, call[1]), 200, { 'Cache-Control': 'public, max-age=300' });
  } catch (e) {
    if (e instanceof ToolError) return reply({ error: e.message }, /^No (app|group|project)/.test(e.message) ? 404 : 400);
    console.error(e);
    return reply({ error: 'The map is not available right now. Try again in a minute.' }, 503);
  }
}

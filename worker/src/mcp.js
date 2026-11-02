// The AI connector: POST /mcp, the "Streamable HTTP" way of speaking MCP (the standard assistants like Claude and ChatGPT
// use to add outside tools). Read-only: it can only look things up in the map (tools in agent.js).
//
// WHY written by hand instead of Cloudflare's `agents` package or the official SDK (checked Oct 26 against Cloudflare's
// docs: createMcpHandler needs `agents`, `@modelcontextprotocol/server` and `zod`): our server is STATELESS and only
// answers a few message types, which is about 80 lines of plain JSON. A hand-written version adds no packages to keep
// patched, a far smaller download, and a fraction of the start-up work, which matters because a free Worker only gets
// 10 ms of computing per request. If we ever need sign-in or live streaming, switching to the SDK is straightforward:
// the tools in agent.js don't change.
//
// What it speaks (MCP spec 2025-06-18, "Transports"): every message is its own POST; requests get one JSON answer;
// notifications get 202 with no body; GET/DELETE get 405 (we offer no server-pushed stream and keep no sessions).
import { TOOLS, TOOL_DEFS, SERVER_INSTRUCTIONS, ToolError, loadData } from './agent.js';

const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
export const SERVER_INFO = { name: 'open-source-everything', title: 'Open Source Everything', version: '1.0.0' };

// WHY open to every website (and not just ours): the map is public, read-only and uses no sign-in or cookies, so a
// web-based MCP tool (or someone's own page) calling it can see nothing they couldn't fetch directly. The spec asks
// servers to check the Origin header to stop "DNS rebinding" attacks on PRIVATE servers; that risk is about reaching
// something private, and there is nothing private here.
export const OPEN_CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id', 'Access-Control-Max-Age': '86400' };

const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
const err = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

// One JSON-RPC message in, one answer out (null = it was a notification, no answer).
async function handleMessage(msg, env) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return err(msg?.id, -32600, 'Not a valid MCP message.');
  const { id, method, params } = msg;
  const isNotification = id === undefined || id === null;
  if (isNotification) return null; // notifications/initialized, notifications/cancelled...: nothing to do, we keep no state
  switch (method) {
    case 'initialize': {
      const v = VERSIONS.includes(params?.protocolVersion) ? params.protocolVersion : VERSIONS[0];
      return ok(id, { protocolVersion: v, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO, instructions: SERVER_INSTRUCTIONS });
    }
    case 'ping': return ok(id, {});
    case 'tools/list': return ok(id, { tools: TOOL_DEFS });
    case 'tools/call': {
      const name = params?.name;
      if (!Object.hasOwn(TOOLS, name)) return err(id, -32602, `Unknown tool "${name}". Tools: ${Object.keys(TOOLS).join(', ')}.`);
      try {
        const D = await loadData(env);
        const out = TOOLS[name](D, params.arguments ?? {});
        return ok(id, { content: [{ type: 'text', text: JSON.stringify(out) }] });
      } catch (e) {
        // A wrong question is the assistant's to read and fix (isError), not a protocol failure.
        if (e instanceof ToolError) return ok(id, { isError: true, content: [{ type: 'text', text: e.message }] });
        console.error(e);
        return ok(id, { isError: true, content: [{ type: 'text', text: 'The map is not available right now. Try again in a minute.' }] });
      }
    }
    default: return err(id, -32601, `Method not found: ${method}`);
  }
}

export async function handleMcp(req, env, { limited } = {}) {
  const base = { ...OPEN_CORS, 'Cache-Control': 'no-store' };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: base });
  if (req.method !== 'POST') return new Response(JSON.stringify(err(null, -32000, 'This server answers POST only (no streams, no sessions).')), { status: 405, headers: { ...base, Allow: 'POST, OPTIONS', 'Content-Type': 'application/json' } });
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...base, 'Content-Type': 'application/json' } });
  let msg;
  try { msg = await req.json(); } catch { return reply(err(null, -32700, 'Not valid JSON.'), 400); }
  // WHY the limit is checked after reading the message: a "notifications/initialized" is free, only real questions count.
  const list = Array.isArray(msg) ? msg : [msg];
  if (list.length > 20) return reply(err(null, -32600, 'Too many messages in one request.'), 400);
  if (list.some((m) => m?.id != null) && limited && await limited(req, env)) return reply(err(null, -32000, 'Slow down a little, then try again.'), 429);
  const answers = (await Promise.all(list.map((m) => handleMessage(m, env)))).filter(Boolean);
  if (!answers.length) return new Response(null, { status: 202, headers: base });
  return reply(Array.isArray(msg) ? answers : answers[0]);
}

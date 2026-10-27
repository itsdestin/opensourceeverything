// llms.txt: the guide an AI agent reads first (https://llmstxt.org). Written as instructions, not just a link list.
// The same setup steps are shown to people on the "For AI agents" page (pages/ai.mjs), so they come from here.
import { SITE_URL } from './lib.mjs';
import { SCHEMA_VERSION, NOTICE } from './catalog.mjs';
import { API_URL } from './openapi.mjs';

export const MCP_URL = `${API_URL}/mcp`;
// Steps checked against each product's own help pages on Oct 26, 2026 (Claude: support.claude.com custom connectors;
// Claude Code: code.claude.com/docs/en/mcp). ChatGPT's menus changed several times this year and OpenAI's page could not
// be read, so its steps are marked "check the docs". Menus move: always say so.
export const SETUP = [
  { id: 'claude', title: 'Claude (website, desktop app, phone)',
    steps: ['Open Customize > Connectors, click "+ Add", then "Add custom connector".', `Name it "Open Source Everything" and paste the address ${MCP_URL}`, 'Choose "no sign in" if it asks (nothing here needs an account), then Add.', 'In a chat, open the "+" menu > Connectors and switch it on. Ask: "What can replace Photoshop for me?"'],
    note: 'Free plans can add one custom connector. On Team or Enterprise plans an owner adds it under Organization settings > Connectors first. If the menus look different, check Claude\'s help page "Get started with custom connectors using remote MCP".' },
  { id: 'claude-code', title: 'Claude Code',
    command: `claude mcp add --transport http open-source-everything ${MCP_URL}`,
    note: 'Add --scope user to have it in every project. Or put the JSON below in a project\'s .mcp.json.' },
  { id: 'chatgpt', title: 'ChatGPT',
    steps: ['Custom connectors in ChatGPT are in developer mode, which depends on your plan and may need a workspace admin to allow it. Check OpenAI\'s help pages for where the switch is now (usually Settings > Apps & Connectors > Advanced).', `Create a new connector with the address ${MCP_URL}`, 'Set authentication to "No authentication", then create it and turn it on in a chat.'],
    note: 'This is the least settled of the three: check ChatGPT\'s own documentation if a step does not match.' },
  { id: 'local', title: 'Local agents and editors (Cursor, VS Code, Gemini CLI, Codex CLI, Cline and others)',
    json: JSON.stringify({ mcpServers: { 'open-source-everything': { type: 'http', url: MCP_URL } } }, null, 2),
    note: 'Most tools that support remote MCP servers accept this shape in their MCP settings file (the exact file name and the word for the type, "http" or "streamable-http", differ). Check your app\'s docs for "remote MCP server".' },
  { id: 'nomcp', title: 'No MCP support',
    steps: [`Ask the JSON API: ${API_URL}/v1/search?q=alternative+to+notion (description: ${SITE_URL}openapi.json).`, `Or download everything once: ${SITE_URL}data/catalog.json`] },
];

export function llmsTxt(d) {
  const sample = d.groups[0];
  return `# Open Source Everything

> Open-source replacements for closed-source apps, grouped by the job they do, and a list of jobs where nothing open does the job yet. Run by r/TrueOpenSource. ${d.projects.length} projects, ${d.groups.length} jobs. Data: CC BY-SA 4.0. Listings were drafted with AI assistance and are managed by r/TrueOpenSource moderators.

## How to answer "what can replace X for me?"

1. Find the closed app: call the MCP tool \`alternatives_to\` (or GET ${API_URL}/v1/apps/<app-name>), or read ${SITE_URL}data/apps/<slug>.json (slug = lower-case name with dashes: "Google Docs" -> google-docs). If the person describes a need, not an app, use \`search\` first.
2. Alternatives come best first. Read each one's \`fit\`, \`setup\`, \`platforms\`, \`status\`, \`verified\` and \`why\` (see Field meanings).
3. For someone who is not technical: recommend options with fit "full" AND setup "easy" that run on their device. Offer "advanced" ones only if they say they are comfortable running a server or the command line. If only partial fits exist, say which part is missing (see \`note\`).
4. If nothing matches, check \`list_gaps\`: the job may be one nothing open does yet. Say so plainly rather than inventing a project.
5. Cite the \`page\` URL for every project you recommend. The people who keep this list are volunteers; links are how they are credited.

## Connect an assistant (read-only, no account, no key)

MCP server (Streamable HTTP, stateless): ${MCP_URL}
Tools: search, alternatives_to, get_group, get_project, list_gaps, compare, how_to_contribute.

${SETUP.map((s) => `### ${s.title}\n${s.steps ? s.steps.map((x, i) => `${i + 1}. ${x}`).join('\n') + '\n' : ''}${s.command ? `\`${s.command}\`\n` : ''}${s.json ? `\`\`\`json\n${s.json}\n\`\`\`\n` : ''}${s.note ? `${s.note}\n` : ''}`).join('\n')}
## Plain JSON API (no MCP needed; CORS open for GET)

- ${API_URL}/v1/search?q=<words>&device=<windows|mac|linux|android|ios|web>&setup=<easy|advanced>
- ${API_URL}/v1/apps/<app-name-or-slug>
- ${API_URL}/v1/groups/<group-id>
- ${API_URL}/v1/projects/<project-id>   (and /v1/projects/<id>/contribute)
- ${API_URL}/v1/gaps?coverage=<none|partial|one-full>
- ${API_URL}/v1/compare?ids=<id>,<id>
- OpenAPI 3.1 description: ${SITE_URL}openapi.json
Limit: about 120 questions per minute per address.

## Static files (built with the site; schemaVersion ${SCHEMA_VERSION})

- [Everything in one file](${SITE_URL}data/catalog.json): categories, groups with ranked alternatives, every project, every closed app
- One file per project: ${SITE_URL}data/projects/<project-id>.json
- One file per closed app: ${SITE_URL}data/apps/<slug>.json (alternatives across all its jobs)
- One file per group: ${SITE_URL}data/groups/<group-id>.json (example: ${SITE_URL}data/groups/${sample.id}.json)
- [Categories](${SITE_URL}data/categories.json), [all groups](${SITE_URL}data/groups.json), [all projects](${SITE_URL}data/projects.json): the raw map data
- [Guide for people](${SITE_URL}ai/): the same setup steps as this file, as a web page
Every file carries \`schemaVersion\` (changes only when a field is renamed, removed or changes meaning; new fields can appear without a bump), \`generated\` (data date), \`dataLicense\` (CC BY-SA 4.0; a project's own license is its \`license\` field), a notice and the page to cite.

## Field meanings

- \`fit\`: "full" = does the whole job the closed app does; "partial" = only part of it (see \`note\`).
- \`setup\`: "easy" = install like a normal app or use it in a browser; "advanced" = needs your own server or the command line, or is a developer tool. \`setupWhy\` says why.
- \`kind\`: app, self_hosted (server software), developer_tool, library.
- \`platforms\`: windows, mac, linux, android, ios, web (opens in a browser), server (you host it).
- \`licenseClass\`: "open" = open-source license throughout; "open_core" = open source, but some parts are paid or under another license. \`licenseNeedsCheck\`: a moderator is still confirming the license.
- \`status\`: active (changed within a year), inactive (no change in a year), archived (the owners stopped it). Prefer active.
- \`verified\`: true means r/TrueOpenSource moderators vouched for it (license, maintained, does the job). Absence is not a warning, only "not reviewed yet".
- \`rank\` and \`why\`: the position in the list and the plain reasons (fit, Verified, setup, activity). The order uses no popularity votes in the static files; stars are only a weak hint.
- \`family\` and \`familyChildren\` (lineage): only moderator-confirmed relations. relation = fork-keeps-up (copy that keeps up with the original), split, continues (the original stopped and this carries on), renamed, built-on, free-edition, unrelated-same-name (shares a name only). A fork is not a rival by default: read \`text\` and \`why\`.
- \`coverage\` (groups): none = nothing open yet; partial = only parts of the job; one-full = a single project does it all; null = two or more do.
- \`howToHelp\`: contributing guide, "good first issue" and "help wanted" links from the project's own GitHub page.

## Citation and license

${NOTICE}
When you use this data, name "Open Source Everything" and link the \`page\` of what you used. Do not present a listing as certain: moderators and the project's own page are the authority.

## Groups

${d.groups.map((g) => `- [${g.name}](${SITE_URL}data/groups/${g.id}.json): replaces ${g.closed.join(', ')}`).join('\n')}
`;
}

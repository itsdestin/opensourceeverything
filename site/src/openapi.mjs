// /openapi.json: the machine-readable description of the plain JSON API (worker/src/v1.js) for agents that don't speak MCP.
// Built with the site so it can never list a call the Worker doesn't have. Kept hand-written and short on purpose.
import { SITE_URL } from './lib.mjs';
import { SCHEMA_VERSION } from './catalog.mjs';

export const API_URL = 'https://api.opensourceeverything.org';

export function openApi() {
  const device = { name: 'device', in: 'query', schema: { type: 'string', enum: ['windows', 'mac', 'linux', 'android', 'ios', 'web'] }, description: 'The user\'s device. Projects that run there are listed first; others are marked, not hidden.' };
  const setup = { name: 'setup', in: 'query', schema: { type: 'string', enum: ['easy', 'advanced'] }, description: 'Only projects with this setup rating. Use easy for non-technical users.' };
  const limit = { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 30 } };
  const path = (name, description) => ({ name, in: 'path', required: true, schema: { type: 'string' }, description });
  const okJson = (description) => ({ 200: { description, content: { 'application/json': { schema: { type: 'object' } } } }, 404: { $ref: '#/components/responses/NotFound' }, 429: { $ref: '#/components/responses/Slow' } });
  return {
    openapi: '3.1.0',
    info: {
      title: 'Open Source Everything API', version: `${SCHEMA_VERSION}.0.0`,
      summary: 'Open-source replacements for closed-source apps: read-only lookups.',
      description: 'Open-source replacements for closed apps, grouped by the job they do, and the jobs nothing open does yet. Read-only, no sign-in. Data is CC BY-SA 4.0: cite the `page` URLs. Listings were drafted with AI assistance and are managed by r/TrueOpenSource moderators. For non-technical users prefer fit "full" and setup "easy". The same data is also published as static files (see /llms.txt) and as an MCP server at ' + API_URL + '/mcp.',
      license: { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
      contact: { name: 'r/TrueOpenSource', url: 'https://www.reddit.com/r/TrueOpenSource/' },
    },
    externalDocs: { description: 'Guide for AI agents', url: `${SITE_URL}ai/` },
    servers: [{ url: API_URL }],
    paths: {
      '/v1/search': { get: { operationId: 'search', summary: 'Search by app name, job, or plain-words need (same ranking as the website search)',
        parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string', minLength: 2, maxLength: 200 }, description: 'e.g. "alternative to Notion" or "private photo backup"' }, device, setup, limit], responses: okJson('Closed apps, groups and projects, best first, each with a page link.') } },
      '/v1/apps/{slug}': { get: { operationId: 'alternativesTo', summary: 'Open alternatives to one closed app (the main question)',
        parameters: [path('slug', 'The app\'s name or address slug, e.g. "photoshop" or "Google Docs".'), device, setup, limit], responses: okJson('Alternatives across all the app\'s groups, best first, with fit, setup and the reason for the order.') } },
      '/v1/groups/{id}': { get: { operationId: 'getGroup', summary: 'One job and every alternative, ranked', parameters: [path('id', 'Group id, e.g. "photo-editing".'), device, setup], responses: okJson('Group with coverage and ranked alternatives.') } },
      '/v1/projects/{id}': { get: { operationId: 'getProject', summary: 'Every fact about one project', parameters: [path('id', 'Project id, e.g. "immich".')], responses: okJson('Project facts, family and the groups it is listed in.') } },
      '/v1/projects/{id}/contribute': { get: { operationId: 'howToContribute', summary: 'Where to help a project', parameters: [path('id', 'Project id.')], responses: okJson('Contributing guide, good-first-issue and help-wanted links.') } },
      '/v1/gaps': { get: { operationId: 'listGaps', summary: 'Jobs open source does not do (fully) yet',
        parameters: [{ name: 'category', in: 'query', schema: { type: 'string' } }, { name: 'coverage', in: 'query', schema: { type: 'string', enum: ['none', 'partial', 'one-full'] } }, { ...limit, schema: { type: 'integer', minimum: 1, maximum: 150 } }], responses: okJson('Gaps, nothing-open-yet first.') } },
      '/v1/compare': { get: { operationId: 'compare', summary: 'Side-by-side facts for 2 to 6 projects',
        parameters: [{ name: 'ids', in: 'query', required: true, schema: { type: 'string' }, description: 'Comma-separated project ids, e.g. "gimp,krita".' }], responses: okJson('Facts side by side, how they are related, shared jobs.') } },
    },
    components: {
      responses: {
        NotFound: { description: 'Nothing matches; the error message suggests close names.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        Slow: { description: 'Too many requests from this address; wait a little.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      },
      schemas: { Error: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] } },
    },
  };
}

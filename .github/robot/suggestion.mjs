// The suggestion robot. Reads one GitHub issue made from a form in .github/ISSUE_TEMPLATE/.
//   node .github/robot/suggestion.mjs check <event.json>  → writes robot-comment.md: what it checked, what a mod should look at
//   node .github/robot/suggestion.mjs apply <event.json>  → adds the change to data/edits.json (assemble.mjs applies it)
// WHY (Destin, Oct 27): anyone can suggest a change without coding; mods approve with one label, the robot does the editing.
// The license and age checks are the mod bot's own (checker/), so the site and the subreddit agree.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
const [mode, eventFile] = process.argv.slice(2);
const issue = JSON.parse(readFileSync(eventFile, 'utf8')).issue;
const labels = issue.labels.map((l) => (typeof l === 'string' ? l : l.name));
const type = ['add-project', 'fix', 'add-closed-app', 'new-group', 'report'].find((t) => labels.includes(t));

// An issue form's body is "### <label>\n\n<answer>" per field; empty answers read "_No response_".
const fields = {};
for (const part of (issue.body ?? '').split(/^### /m).slice(1)) {
  const [label, ...rest] = part.split('\n');
  const v = rest.join('\n').trim();
  fields[label.trim()] = v === '_No response_' ? '' : v;
}
const field = (label) => fields[label] ?? '';
const checked = (label) => [...field(label).matchAll(/- \[[xX]\] (.+)/g)].map((m) => m[1].trim());

const groups = read('data/groups.json').groups;
const projects = read('data/projects.json').projects;
const categories = read('data/categories.json').categories;
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
// WHY these forms of a name: the site's buttons fill in a page path ("g/documents/") or a name; people type names.
const findGroup = (s) => { const k = norm(s.replace(/^.*\/g\/|^g\//, '').replace(/\/$/, '')); return groups.find((g) => norm(g.id) === k || norm(g.name) === k); };
const findProject = (s) => { const k = norm(s.replace(/^.*\/p\/|^p\//, '').replace(/\/$/, '')); return projects.find((p) => norm(p.id) === k || norm(p.name) === k); };
const DEVICES = { windows: 'windows', mac: 'mac', linux: 'linux', android: 'android', iphone: 'ios', 'in your browser': 'web', 'in your browser (no install)': 'web', 'your own server': 'server' };
const devicesFrom = (list) => [...new Set(list.map((d) => DEVICES[d.toLowerCase().trim()]).filter(Boolean))];
const codeOf = (u) => u.trim().replace(/^https?:\/\/(www\.)?/, '').replace(/\.git$|\/$/g, '');

// ── What the suggestion asks for, as one edit; problems a mod must know about go in `issues` ──
function understand() {
  const issues = []; let edit = null;
  if (type === 'add-project') {
    const g = findGroup(field('Group'));
    const code = codeOf(field('Link to its code'));
    if (!g) issues.push(`No group called "${field('Group')}". A mod should pick the right one, or suggest a new group first.`);
    if (!/^(github\.com|gitlab\.com|codeberg\.org)\/[^/]+\/[^/]+$/.test(code)) issues.push('The code link should be a GitHub, GitLab or Codeberg project page.');
    const dup = projects.find((p) => norm(p.code) === norm(code) || norm(p.name) === norm(field('Project name')));
    if (dup) issues.push(`Already listed as [${dup.name}](https://itsdestin.github.io/opensourceeverything/p/${dup.id}/). If it belongs in another group too, a mod can add it there.`);
    edit = { type: 'add-project', name: field('Project name'), code, website: field('Its website') || null, group: g?.id ?? null,
      fit: /partly/i.test(field('How much of the job does it do?')) ? 'partial' : 'full', note: field("What's missing compared with the closed apps?") || null,
      summary: field('What it is').replace(/\s+/g, ' '), platforms: devicesFrom(checked('Works on')),
      replaces: field('Closed apps it replaces').split(',').map((s) => s.trim()).filter(Boolean), byTeam: /^yes/i.test(field('Are you involved with it?')) };
  } else if (type === 'fix') {
    const p = findProject(field('Project')); const g = field('Group') ? findGroup(field('Group')) : null;
    if (!p) issues.push(`No project called "${field('Project')}" on the site.`);
    const what = field("What's wrong?"); const v = field('What it should be');
    const kind = { 'The devices it works on': 'platforms', 'Replaces fully / partly': 'fit', 'The short note under its card': 'note', 'Its description': 'summary', 'Its website or download link': 'link', 'Its license': 'license' }[what];
    if (!kind) issues.push('"Something else" can\'t be applied automatically; a mod will make this change by hand.');
    if ((kind === 'fit' || kind === 'note') && !g) issues.push('Fully / partly and the card note belong to one group; which group is missing or not found.');
    const value = kind === 'platforms' ? devicesFrom(v.split(/[,\n]/)) : kind === 'fit' ? (/partly|partial/i.test(v) ? 'partial' : /fully|full/i.test(v) ? 'full' : null) : kind === 'link' ? (v.match(/https?:\/\/\S+/)?.[0] ?? null) : v.trim();
    if (kind && (value === null || (Array.isArray(value) && !value.length))) issues.push(`Couldn't read the new value from "${v.slice(0, 80)}".`);
    edit = { type: 'fix', project: p?.id ?? null, group: g?.id ?? null, field: kind ?? 'other', value, proof: field('Where you saw this') || null };
  } else if (type === 'add-closed-app') {
    const g = findGroup(field('Group')); const app = field('Closed app').trim();
    if (!g) issues.push(`No group called "${field('Group')}".`);
    const where = groups.find((x) => x.closed.some((c) => norm(c) === norm(app)));
    if (where) issues.push(`${app} is already in the group "${where.name}".`);
    edit = { type: 'add-closed-app', group: g?.id ?? null, app };
  } else if (type === 'new-group') {
    const name = field('Name of the job').trim(); const cat = categories.find((c) => c.name === field('Category'));
    if (groups.some((g) => norm(g.name) === norm(name))) issues.push(`A group called "${name}" already exists.`);
    if (!cat) issues.push('Category not found.');
    edit = { type: 'new-group', id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name, job: field('In one line, what people do with it').replace(/\.$/, ''),
      category: cat?.id ?? null, closed: field('Closed apps that do this job').split(',').map((s) => s.trim()).filter(Boolean) };
  } else if (type === 'report') {
    const p = findProject(field('Project'));
    if (!p) issues.push(`No project called "${field('Project')}" on the site.`);
    edit = { type: 'remove-project', project: p?.id ?? null, reason: field("What's the problem?") };
    issues.push('Reports are always judged by a mod. Approving this one takes the project off the map.');
  } else {
    issues.push('This issue was not made from one of the suggestion forms.');
  }
  return { edit, issues };
}

// ── The mod bot's checks for a new project: license, age, activity ──
async function projectChecks(code) {
  const lines = [];
  const m = code.match(/^(github\.com|gitlab\.com|codeberg\.org)\/([^/]+)\/([^/]+)$/);
  if (!m) return lines;
  const { checkProject } = await import(join(ROOT, 'checker/dist/check.js'));
  const r = await checkProject({ host: m[1].split('.')[0], owner: m[2], name: m[3] }, { token: process.env.GITHUB_TOKEN });
  if (!r.supported) return [`- ⚠️ ${r.reason}`];
  lines.push(r.license === 'open' ? `- ✅ Open-source license: ${r.facts.licenseSpdx}` : `- ❌ License: ${r.facts.licenseSpdx ?? 'none found'}. Only OSI-approved licenses can be listed.`);
  for (const v of r.violations) lines.push(`- ❌ ${v.message.replace('Front-page projects', 'Listed projects').replace('Project posts', 'Listed projects')}`);
  if (!r.violations.length) lines.push('- ✅ Old enough, and worked on over several days');
  if (r.site.archived) lines.push('- ❌ The repository is archived (no longer maintained).');
  return lines;
}

const { edit, issues } = understand();
if (mode === 'check') {
  const checks = edit?.type === 'add-project' && edit.code ? await projectChecks(edit.code).catch((e) => [`- ⚠️ Couldn't run the license check: ${String(e).slice(0, 120)}`]) : [];
  const bad = issues.length || checks.some((l) => l.startsWith('- ❌'));
  const body = `<!-- suggestion-robot -->\n**Robot check** (it re-runs when the issue is edited)\n\n` +
    (checks.length ? `${checks.join('\n')}\n\n` : '') +
    (issues.length ? `${issues.map((i) => `- ⚠️ ${i}`).join('\n')}\n\n` : '') +
    (bad ? 'A mod will take a look. If something above is wrong, edit the issue and the robot checks again.'
      : 'Everything the robot can check looks fine. **Mods:** add the `approved` label and the robot prepares the change.') +
    `\n\n<details><summary>What the robot understood</summary>\n\n\`\`\`json\n${JSON.stringify(edit, null, 1)}\n\`\`\`\n</details>`;
  writeFileSync('robot-comment.md', body);
  console.log(body);
} else if (mode === 'apply') {
  // WHY refuse when the robot couldn't read it: an approved but unreadable suggestion must not write half an edit.
  const blocking = !edit || Object.entries(edit).some(([k, v]) => ['group', 'project', 'category'].includes(k) && v === null && !(edit.type === 'fix' && k === 'group' && !['fit', 'note'].includes(edit.field))) || (edit.type === 'fix' && edit.field === 'other');
  if (blocking) { console.error('Not applied: the suggestion needs a mod to fix it by hand.\n' + issues.join('\n')); process.exit(2); }
  // WHY read the license now: the site shows it, and a GitLab or Codeberg project stays "being checked" until a mod confirms.
  if (edit.type === 'add-project') {
    const m = edit.code.match(/^github\.com\/([^/]+)\/([^/]+)$/);
    if (m) {
      const { checkProject } = await import(join(ROOT, 'checker/dist/check.js'));
      const r = await checkProject({ host: 'github', owner: m[1], name: m[2] }, { token: process.env.GITHUB_TOKEN }).catch(() => null);
      if (r?.supported && r.license === 'open') edit.license = r.facts.licenseSpdx;
    }
  }
  const file = join(ROOT, 'data/edits.json');
  const all = existsSync(file) ? read('data/edits.json') : { note: '', edits: [] };
  all.note = 'Changes approved by mods from suggestions on GitHub. prefill/assemble.mjs applies them, in order, after everything else. Each names its issue.';
  all.edits = all.edits.filter((e) => e.issue !== issue.number);
  all.edits.push({ issue: issue.number, by: issue.user?.login ?? null, date: new Date().toISOString().slice(0, 10), ...edit });
  writeFileSync(file, JSON.stringify(all, null, 1) + '\n');
  console.log(`Applied #${issue.number} (${edit.type}).`);
}

// Seeds the "What's missing" boards with a SHORT list of obvious, popular requests, posted under Destin's own GitHub
// account (Destin, Oct 26: "simplify the list significantly… only things with obvious popular demand… no 'from the
// editors' label, just put all of the starting items under my name").
//
// It REPLACES the first seed (one note per "Replaces partly" line, ~200 notes, posted by the map's own account):
//   1. deletes the old seeded notes that nobody has voted on or replied to (the account is id -1),
//   2. makes sure Destin's user row exists (GitHub id 192376128, from `gh api users/itsdestin`; a real sign-in keeps it),
//   3. adds the notes below, skipping any he already has (same group and title), so running it twice is safe.
//
// NOT RUN against any database by the people who wrote it. To run it later, from this folder:
//   node seed-notes.mjs > seed-notes.sql
//   npx wrangler d1 execute opensourceeverything --remote --file seed-notes.sql
// Then see which old notes were kept because people had voted on them (they stay until a mod decides):
//   npx wrangler d1 execute opensourceeverything --remote --command "SELECT id, grp, title FROM notes WHERE author_id = -1"
// Try it on the local test database first by replacing --remote with --local.
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const groups = new Map(JSON.parse(readFileSync(new URL('data/groups.json', ROOT), 'utf8')).groups.map((g) => [g.id, g]));
const projects = new Set(JSON.parse(readFileSync(new URL('data/projects.json', ROOT), 'utf8')).projects.map((p) => p.id));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

// WHY these ids: GitHub's own numbers for Destin's account.
const DESTIN = { id: 192376128, login: 'itsdestin', created: Date.parse('2024-12-20T20:38:20Z') };
const OLD_SEED_ACCOUNT = -1; // WHY -1: the first seed used an id GitHub never hands out, so no real person could be it

// kind: 'missing' = something a listed project can't do yet; 'wish' = something nobody has built. Chosen because lots of
// people ask for each one when they leave the closed app, and because each is true of the project today.
const NOTES = [
  { group: 'documents', kind: 'missing', projects: ['libreoffice-writer'], closed: ['Google Docs', 'Microsoft Word'],
    title: 'Live co-editing in LibreOffice',
    body: "Two people can't type in the same document at once in the desktop app. Collabora and OnlyOffice can do it in a browser, but you have to run a server." },
  { group: 'documents', kind: 'missing', projects: ['libreoffice-writer'], closed: ['Microsoft Word'],
    title: 'Word files that look exactly the same when opened in LibreOffice',
    body: 'Layouts, fonts and tables sometimes shift when a .docx from Word is opened, which makes it risky to swap for anything that goes to other people.' },
  { group: 'spreadsheets', kind: 'missing', projects: ['libreoffice-calc'], closed: ['Microsoft Excel'],
    title: 'Excel files with macros and complex formulas that work unchanged',
    body: 'Simple spreadsheets open fine; ones that depend on Excel macros or newer formulas often break.' },
  { group: 'photo-editing', kind: 'missing', projects: ['gimp'], closed: ['Adobe Photoshop'],
    title: 'Opening Photoshop (PSD) files with every layer and effect intact',
    body: 'Layers, text and effects from a .psd file can come through flattened or changed.' },
  { group: 'photo-editing', kind: 'missing', projects: ['gimp'], closed: ['Adobe Photoshop'],
    title: 'Built-in AI tools: generative fill and one-click background removal',
    body: "Photoshop's AI tools are the feature people miss most after switching." },
  { group: 'video-editing', kind: 'wish', projects: [], closed: ['CapCut'],
    title: 'Automatic captions and ready-made templates like CapCut has',
    body: 'Phone-first video makers want one tap for captions and styles. The open editors are more powerful but slower to learn.' },
  { group: 'cloud-storage', kind: 'missing', projects: ['nextcloud'], closed: ['Dropbox', 'Google Drive'],
    title: 'A setup anyone can do without technical skills',
    body: 'Dropbox and Google Drive start with a sign-up. Running your own takes a server and some know-how.' },
  { group: 'maps', kind: 'missing', projects: ['organic-maps', 'osmand'], closed: ['Google Maps'],
    title: 'Live traffic and how busy a place is, like Google Maps',
    body: 'Offline maps and directions work well; real-time traffic and busy-hours information are missing.' },
  { group: 'phone-os', kind: 'missing', projects: ['grapheneos'], closed: ['Google Android'],
    title: 'Banking and wallet apps that work without Google services',
    body: "Some banking, payment and wallet apps refuse to run on phones without Google's certification." },
  { group: 'video-calls', kind: 'missing', projects: ['jitsi-meet'], closed: ['Zoom'],
    title: 'Big meetings (50+ people) that stay smooth like Zoom',
    body: 'Small calls work well; very large meetings need a lot of server power and careful setup.' },
  { group: 'smart-home', kind: 'wish', projects: [], closed: ['Amazon Alexa', 'Google Home'],
    title: 'A voice assistant as good as Alexa or Google Home',
    body: 'Home Assistant runs the house, but talking to it as naturally as the closed assistants is still rough.' },
  { group: 'pdf', kind: 'wish', projects: [], closed: ['Adobe Acrobat'],
    title: 'Editing the text inside a PDF as easily as in Acrobat',
    body: 'Merging, splitting and signing are covered; changing the words on a page is not.' },
  { group: 'cad', kind: 'missing', projects: ['freecad', 'librecad'], closed: ['AutoCAD'],
    title: 'Opening and saving AutoCAD (DWG) files reliably',
    body: 'Most of the industry shares DWG files, which is a closed format. Open programs work around it with DXF, which loses detail.' },
];

// WHY checks: a typo here would put a note on a page that doesn't exist.
for (const n of NOTES) {
  if (!groups.has(n.group)) throw new Error(`no group ${n.group}`);
  for (const p of n.projects) if (!projects.has(p)) throw new Error(`no project ${p}`);
  if (n.kind === 'missing' && !n.projects.length) throw new Error(`"${n.title}" is 'missing' but names no project`);
}

const now = Date.now();
const out = [
  `-- Replaces the first seeded notes with ${NOTES.length} starting requests posted by @${DESTIN.login}. Generated ${new Date(now).toISOString()}.`,
  // 1. old seed: only notes nobody has voted on or replied to. Votes by real people are never thrown away silently.
  // (votes/replies by the seed account itself don't exist; its notes carry no votes of its own.)
  `DELETE FROM notes WHERE author_id = ${OLD_SEED_ACCOUNT}
  AND NOT EXISTS (SELECT 1 FROM votes WHERE votes.note_id = notes.id)
  AND NOT EXISTS (SELECT 1 FROM replies WHERE replies.note_id = notes.id)
  AND NOT EXISTS (SELECT 1 FROM fixed_confirms WHERE fixed_confirms.note_id = notes.id);`,
  `DELETE FROM users WHERE id = ${OLD_SEED_ACCOUNT} AND NOT EXISTS (SELECT 1 FROM notes WHERE author_id = ${OLD_SEED_ACCOUNT});`,
  // 2. Destin's account. INSERT OR IGNORE: if he has already signed in, his real row is left as it is.
  `INSERT OR IGNORE INTO users (id, login, github_created, trusted, joined) VALUES (${DESTIN.id}, ${q(DESTIN.login)}, ${DESTIN.created}, 1, ${now});`,
];
NOTES.forEach((n, i) => {
  const g = groups.get(n.group);
  out.push(`INSERT INTO notes (kind, category, grp, projects, closed_apps, title, body, author_id, created, held)
  SELECT ${q(n.kind)}, ${q(g.category)}, ${q(g.id)}, ${q(JSON.stringify(n.projects))}, ${q(JSON.stringify(n.closed))}, ${q(n.title)}, ${q(n.body)}, ${DESTIN.id}, ${now - i * 1000}, 0
  WHERE NOT EXISTS (SELECT 1 FROM notes WHERE grp = ${q(g.id)} AND title = ${q(n.title)} AND author_id = ${DESTIN.id});`);
});
console.log(out.join('\n'));
console.error(`${NOTES.length} notes`);

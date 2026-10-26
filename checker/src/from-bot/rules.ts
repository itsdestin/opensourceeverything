// Pure rule logic for r/TrueOpenSource. No Reddit or network calls live here,
// so every rule can be unit-tested with plain inputs.

// WHY: these are the four "how it was built" labels (rule 4). Only posts with
// one of them are project posts that get the GitHub checks. "Showcase" is
// included because only AutoModerator's weekly thread should carry it; a
// regular user picking it is posting a project and gets the same checks
// (independent review, 2026-10-26: otherwise it would skip every check).
const PROJECT_FLAIRS = ['hand-built', 'ai-assisted', 'agentic engineering', 'vibe-coded', 'showcase'];

// Flair text can carry emoji codes (":rocket: Vibe-coded") or odd casing.
export function normalizeFlair(text: string | undefined): string {
  return (text ?? '').replace(/:[a-z0-9_+-]+:/gi, '').trim().toLowerCase();
}

export function isProjectFlair(text: string | undefined): boolean {
  return PROJECT_FLAIRS.includes(normalizeFlair(text));
}

export type RepoRef = { host: 'github' | 'gitlab' | 'codeberg'; owner: string; name: string };

export type RepoFacts = {
  exists: boolean;
  // A repository with no commits at all.
  empty: boolean;
  createdAt: Date | undefined;
  firstCommitAt: Date | undefined;
  // Number of distinct calendar days (UTC) with commits, among recent commits.
  activeDays: number;
  licenseSpdx: string | undefined;
  hasReadme: boolean;
};

export type CheckConfig = {
  minAgeDays: number;
  minActiveDays: number;
};

export type Violation = {
  rule: string;
  // Shown to the author in the bot's comment, and to mods in the notification.
  message: string;
};

// WHY: the scheme is optional because people often type "github.com/me/tool"
// and Reddit links it anyway; a word boundary keeps "notgithub.com" out.
const REPO_PATTERN =
  /(?:https?:\/\/)?(?<![\w.])(?:www\.)?(github\.com|gitlab\.com|codeberg\.org)\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/gi;

// GitHub paths that look like owner/repo but aren't repositories.
const NOT_OWNERS = new Set([
  'orgs', 'topics', 'marketplace', 'sponsors', 'settings', 'features', 'about',
  'apps', 'enterprise', 'login', 'collections', 'search', 'explore', 'users',
]);

export function extractRepoRefs(text: string): RepoRef[] {
  const found = new Map<string, RepoRef>();
  // WHY: Reddit's editor escapes underscores as "my\_repo"; strip the escapes
  // so the real repository name is read.
  const clean = text.replace(/\\/g, '');
  for (const match of clean.matchAll(REPO_PATTERN)) {
    const domain = (match[1] ?? '').toLowerCase();
    const owner = match[2] ?? '';
    // WHY: "…/tool." at the end of a sentence must read as "tool".
    const name = (match[3] ?? '').replace(/\.git$/i, '').replace(/[.-]+$/, '');
    if (!owner || !name || NOT_OWNERS.has(owner.toLowerCase())) continue;
    const host = domain.startsWith('github') ? 'github' : domain.startsWith('gitlab') ? 'gitlab' : 'codeberg';
    const key = `${host}/${owner}/${name}`.toLowerCase();
    if (!found.has(key)) found.set(key, { host, owner, name });
  }
  return [...found.values()];
}

export function repoKey(ref: RepoRef): string {
  return `${ref.host}/${ref.owner}/${ref.name}`.toLowerCase();
}

const DOWNLOAD_PATTERN = /https?:\/\/\S+\.(?:exe|msi|dmg|pkg|apk|appimage|deb|rpm|zip)(?:[?#]\S*)?(?=\s|\)|$)/i;

// WHY: rule 3 / malware guard. A download link with no source link is the
// classic "open source" disguise.
export function isDownloadOnly(text: string): boolean {
  return DOWNLOAD_PATTERN.test(text) && extractRepoRefs(text).length === 0;
}

// Links that aren't Reddit, a known code host or a download. Used so a project
// hosted somewhere else (Sourcehut, Gitea, a self-hosted forge…) goes to a
// person instead of being held for "no source link".
export function hasOtherLink(text: string): boolean {
  const links = text.replace(/\\/g, '').match(/https?:\/\/[^\s)\]]+/gi) ?? [];
  return links.some(
    (l) =>
      !/^https?:\/\/([a-z0-9-]+\.)*(reddit\.com|redd\.it|redditmedia\.com|github\.com|gitlab\.com|codeberg\.org)\b/i.test(l) &&
      !DOWNLOAD_PATTERN.test(l),
  );
}

// WHY: OSI-approved licenses as GitHub reports them (SPDX ids). Anything not
// here (including "NOASSERTION", GitHub's "can't tell") goes to a human.
const OSI_LICENSES = new Set([
  '0BSD', 'AFL-3.0', 'AGPL-3.0', 'AGPL-3.0-only', 'AGPL-3.0-or-later', 'Apache-2.0',
  'Artistic-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'BSD-3-Clause-Clear', 'BSL-1.0',
  'CDDL-1.0', 'CECILL-2.1', 'ECL-2.0', 'EPL-1.0', 'EPL-2.0', 'EUPL-1.1', 'EUPL-1.2',
  'GPL-2.0', 'GPL-2.0-only', 'GPL-2.0-or-later', 'GPL-3.0', 'GPL-3.0-only', 'GPL-3.0-or-later',
  'ISC', 'LGPL-2.1', 'LGPL-2.1-only', 'LGPL-2.1-or-later', 'LGPL-3.0', 'LGPL-3.0-only',
  'LGPL-3.0-or-later', 'LPPL-1.3c', 'MIT', 'MIT-0', 'MPL-2.0', 'MS-PL', 'MS-RL', 'MulanPSL-2.0',
  'NCSA', 'OFL-1.1', 'OSL-3.0', 'PostgreSQL', 'UPL-1.0', 'Unlicense', 'Zlib',
]);

export type LicenseVerdict = 'open' | 'missing' | 'unclear';

export function licenseVerdict(spdx: string | undefined): LicenseVerdict {
  if (!spdx) return 'missing';
  return OSI_LICENSES.has(spdx) ? 'open' : 'unclear';
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Rules 3 and 5 for one repository. "Unclear" licenses are not violations;
// the caller sends those to the mod queue instead of holding the post.
export function evaluateRepo(facts: RepoFacts, now: Date, cfg: CheckConfig): Violation[] {
  if (!facts.exists) {
    return [{ rule: '3', message: "The linked repository couldn't be found. Is it public, and is the link right?" }];
  }
  if (facts.empty) {
    return [{ rule: '3', message: "The linked repository is empty, so there's no code to look at yet." }];
  }
  const violations: Violation[] = [];
  if (licenseVerdict(facts.licenseSpdx) === 'missing') {
    violations.push({
      rule: '3',
      message:
        "GitHub couldn't find a license file in the repository. Project posts need an open-source license (MIT, Apache-2.0, GPL-3.0…) in a LICENSE file at the top level.",
    });
  }
  // WHY: use the older of "repo created" and "first commit", so a project
  // moved into a fresh repo still counts its real history.
  const starts = [facts.createdAt, facts.firstCommitAt].filter((d): d is Date => d !== undefined);
  const start = starts.length ? new Date(Math.min(...starts.map((d) => d.getTime()))) : undefined;
  const ageDays = start ? Math.floor((now.getTime() - start.getTime()) / DAY_MS) : 0;
  if (ageDays < cfg.minAgeDays) {
    violations.push({
      rule: '5',
      message: `The project is ${ageDays} day${ageDays === 1 ? '' : 's'} old. Front-page projects need to be at least ${cfg.minAgeDays} days old.`,
    });
  }
  // WHY: the day count only sees recent commits, so an old project with a
  // burst of recent work could read low. Old projects need only 2 days.
  const neededDays = ageDays >= 90 ? Math.min(2, cfg.minActiveDays) : cfg.minActiveDays;
  if (facts.activeDays < neededDays) {
    violations.push({
      rule: '5',
      message: `Work on the project spans ${facts.activeDays} day${facts.activeDays === 1 ? '' : 's'}. Front-page projects need work spread over at least ${cfg.minActiveDays} days.`,
    });
  }
  if (!facts.hasReadme) {
    violations.push({ rule: '5', message: 'The repository has no README.' });
  }
  return violations;
}

// Distinct UTC calendar days among commit dates.
export function countActiveDays(dates: Date[]): number {
  return new Set(dates.map((d) => d.toISOString().slice(0, 10))).size;
}

// WHY: deliberately no language check (rule 7). Rule 7 is a polite request,
// and an automatic hold on non-English posts would read as hostility toward
// non-English speakers (Destin, 2026-10-25: "do not want xenophobia allegations").

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Rule 8: case-insensitive keyword match; returns the first keyword found.
// WHY: whole-word only, so "r/opensourcegames" or "r/OpenSource_Projects"
// (subs our users cross-post to) don't count as "r/opensource".
export function findDramaKeyword(text: string, keywords: string[]): string | undefined {
  return keywords.find((k) => k && new RegExp(`(?<![a-z0-9_])${escapeRegex(k)}(?![a-z0-9_])`, 'i').test(text));
}

// Rule 2: a comment that is nothing but "slop" (with a word or two around it).
// WHY: defenses like "definitely not slop" or questions like "is this slop?"
// are the opposite of what rule 2 targets, so negations and questions pass.
export function isSlopOnly(body: string): boolean {
  if (body.includes('?')) return false;
  const words: string[] = body.toLowerCase().match(/[a-z']+/g) ?? [];
  if (words.some((w) => ['not', 'no', 'never', 'nothing'].includes(w) || w.endsWith("n't"))) return false;
  return words.length > 0 && words.length <= 4 && words.includes('slop');
}

export function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean))];
}

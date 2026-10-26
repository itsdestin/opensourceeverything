import { countActiveDays, type RepoFacts, type RepoRef } from './rules.js';

// Reads the public facts the rules need from GitHub's API.
// WHY: GitLab/Codeberg aren't checked yet; callers send those posts to the
// mod queue for a human look instead of guessing.

const API = 'https://api.github.com';

function headers(token: string | undefined): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'trueopensource-bot',
  };
  // WHY: without a token GitHub allows ~60 requests an hour, shared with every
  // other app on Reddit's servers; a token raises that to 5,000.
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

// Anything that stops us from reading GitHub reliably. Callers treat it as
// "a person should look", never as a reason to hold a post.
export class GitHubUnavailableError extends Error {}

async function get(url: string, token: string | undefined): Promise<Response> {
  let res: Response;
  try {
    // WHY: a hung request must not leave a post unchecked forever.
    res = await fetch(url, { headers: headers(token), signal: AbortSignal.timeout(10_000) });
  } catch (error) {
    throw new GitHubUnavailableError(`GitHub request failed for ${url}: ${String(error)}`);
  }
  if (res.status === 403 || res.status === 429 || res.status >= 500) {
    throw new GitHubUnavailableError(`GitHub returned ${res.status} for ${url}`);
  }
  return res;
}

async function json<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch (error) {
    throw new GitHubUnavailableError(`GitHub sent unreadable data: ${String(error)}`);
  }
}

// "Link: <...&page=7>; rel="last"" → the last page's URL.
function lastPageUrl(link: string | null): string | undefined {
  if (!link) return undefined;
  for (const part of link.split(',')) {
    const m = part.match(/<([^>]+)>;\s*rel="last"/);
    if (m) return m[1];
  }
  return undefined;
}

type CommitJson = { commit?: { author?: { date?: string }; committer?: { date?: string } } };

function commitDate(c: CommitJson): Date | undefined {
  const s = c.commit?.author?.date ?? c.commit?.committer?.date;
  return s ? new Date(s) : undefined;
}

export async function fetchGitHubFacts(ref: RepoRef, token: string | undefined): Promise<RepoFacts> {
  const base = `${API}/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.name)}`;
  const repoRes = await get(base, token);
  if (repoRes.status === 404) {
    return { exists: false, empty: false, createdAt: undefined, firstCommitAt: undefined, activeDays: 0, licenseSpdx: undefined, hasReadme: false };
  }
  const repo = await json<{ created_at?: string; license?: { spdx_id?: string } | null }>(repoRes);

  // Recent commits, to count how many different days work happened on.
  const recentRes = await get(`${base}/commits?per_page=100`, token);
  // WHY: GitHub answers 409 for a repository with no commits at all.
  if (recentRes.status === 409) {
    return {
      exists: true, empty: true, createdAt: repo.created_at ? new Date(repo.created_at) : undefined,
      firstCommitAt: undefined, activeDays: 0, licenseSpdx: undefined, hasReadme: false,
    };
  }
  const recent = recentRes.ok ? await json<CommitJson[]>(recentRes) : [];
  const recentDates = recent.map(commitDate).filter((d): d is Date => d !== undefined);

  // The oldest commit: ask for one commit per page and jump to the last page.
  let firstCommitAt: Date | undefined;
  const oneRes = await get(`${base}/commits?per_page=1`, token);
  const last = lastPageUrl(oneRes.headers.get('link'));
  if (last) {
    const lastRes = await get(last, token);
    const oldest = lastRes.ok ? await json<CommitJson[]>(lastRes) : [];
    firstCommitAt = oldest[0] ? commitDate(oldest[0]) : undefined;
  } else if (recentDates.length) {
    // Fewer than two pages: the oldest is already in the recent list.
    firstCommitAt = new Date(Math.min(...recentDates.map((d) => d.getTime())));
  }

  const readmeRes = await get(`${base}/readme`, token);
  const spdx = repo.license?.spdx_id ?? undefined;

  return {
    exists: true,
    empty: false,
    createdAt: repo.created_at ? new Date(repo.created_at) : undefined,
    firstCommitAt,
    // WHY: count the first commit's day too, so a long-running project whose
    // last 100 commits fell on a couple of days still shows its spread.
    activeDays: countActiveDays(firstCommitAt ? [...recentDates, firstCommitAt] : recentDates),
    licenseSpdx: spdx,
    hasReadme: readmeRes.ok,
  };
}

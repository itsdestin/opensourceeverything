import { GitHubUnavailableError } from './from-bot/github.js';
import type { RepoRef } from './from-bot/rules.js';

// Facts the Alternatives Map shows that the mod bot doesn't need: popularity, whether the project is
// archived, when it last changed, how many people worked on it, and whether commits credit an AI assistant.
// WHY separate from the bot's github.ts: those files are shared copies (see from-bot/README.md); the
// site adds to them rather than changing them.

export type SiteFacts = {
  stars: number;
  archived: boolean;
  lastPushAt: Date | undefined;
  // undefined when GitHub couldn't count them (very large projects answer with an error).
  contributors: number | undefined;
  commitsSampled: number;
  commitsCreditingAi: number;
  // Names of the assistants credited, e.g. ["Claude", "Copilot"]. A neutral fact, never a verdict.
  aiAssistants: string[];
};

type Fetch = typeof fetch;
const API = 'https://api.github.com';

async function get(fetchImpl: Fetch, url: string, token: string | undefined): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'alternatives-map' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(10_000) });
  } catch (error) {
    throw new GitHubUnavailableError(`GitHub request failed for ${url}: ${String(error)}`);
  }
  if (res.status === 403 || res.status === 429 || res.status >= 500) {
    throw new GitHubUnavailableError(`GitHub returned ${res.status} for ${url}`);
  }
  return res;
}

// "Link: <...&page=7>; rel="last"" → 7. GitHub's way of saying how many pages (here: people) there are.
export function lastPageNumber(link: string | null): number | undefined {
  const m = link?.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
  return m?.[1] ? Number(m[1]) : undefined;
}

// WHY trailers and tool footers only: a commit *mentioning* "copilot" in its message isn't credit.
// These are the lines assistants (or their users) add on purpose.
const ASSISTANTS: [string, RegExp][] = [
  ['Claude', /claude/i], ['Copilot', /copilot/i], ['Cursor', /cursor/i], ['Aider', /aider/i],
  ['Codex', /codex|chatgpt|openai/i], ['Gemini', /gemini/i], ['Devin', /devin/i], ['Windsurf', /windsurf|codeium/i],
];
export function creditedAssistants(message: string): string[] {
  const credits = message.split('\n').filter((l) =>
    /^\s*co-authored-by:/i.test(l) || /generated (with|by)/i.test(l) || /^\s*assisted-by:/i.test(l));
  const found = new Set<string>();
  for (const line of credits) for (const [name, re] of ASSISTANTS) if (re.test(line)) found.add(name);
  // aider marks its commits with an "aider: " prefix rather than a trailer.
  if (/^aider: /i.test(message)) found.add('Aider');
  return [...found];
}

export async function fetchGitHubSiteFacts(ref: RepoRef, token: string | undefined, fetchImpl: Fetch = fetch): Promise<SiteFacts> {
  const base = `${API}/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.name)}`;
  const repoRes = await get(fetchImpl, base, token);
  const repo = repoRes.ok
    ? ((await repoRes.json()) as { stargazers_count?: number; archived?: boolean; pushed_at?: string })
    : {};

  const peopleRes = await get(fetchImpl, `${base}/contributors?per_page=1&anon=1`, token);
  let contributors: number | undefined;
  if (peopleRes.status === 204) contributors = 0;
  else if (peopleRes.ok) contributors = lastPageNumber(peopleRes.headers.get('link')) ?? ((await peopleRes.json()) as unknown[]).length;

  const commitsRes = await get(fetchImpl, `${base}/commits?per_page=100`, token);
  const commits = commitsRes.ok ? ((await commitsRes.json()) as { commit?: { message?: string } }[]) : [];
  const assistants = new Set<string>();
  let crediting = 0;
  for (const c of commits) {
    const names = creditedAssistants(c.commit?.message ?? '');
    if (names.length) crediting++;
    names.forEach((n) => assistants.add(n));
  }

  return {
    stars: repo.stargazers_count ?? 0,
    archived: repo.archived ?? false,
    lastPushAt: repo.pushed_at ? new Date(repo.pushed_at) : undefined,
    contributors,
    commitsSampled: commits.length,
    commitsCreditingAi: crediting,
    aiAssistants: [...assistants].sort(),
  };
}

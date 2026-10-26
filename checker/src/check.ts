import { fetchGitHubFacts } from './from-bot/github.js';
import { evaluateRepo, licenseVerdict, type CheckConfig, type LicenseVerdict, type RepoFacts, type RepoRef, type Violation } from './from-bot/rules.js';
import { fetchGitHubSiteFacts, type SiteFacts } from './site-facts.js';

// One call that answers everything the site asks about a project: the subreddit's own checks
// (shared with the mod bot, same thresholds) plus the site's extra facts.

export type ProjectCheck =
  | { supported: false; ref: RepoRef; reason: string }
  | { supported: true; ref: RepoRef; facts: RepoFacts; site: SiteFacts; license: LicenseVerdict; violations: Violation[] };

// WHY the bot's defaults: a project that passes here also passes the subreddit's front-page rule.
export const DEFAULT_CONFIG: CheckConfig = { minAgeDays: 30, minActiveDays: 3 };

export async function checkProject(
  ref: RepoRef,
  opts: { token?: string; now?: Date; config?: CheckConfig; fetchImpl?: typeof fetch } = {},
): Promise<ProjectCheck> {
  if (ref.host !== 'github') {
    // WHY: the bot doesn't read GitLab or Codeberg yet either; both send these to a person.
    return { supported: false, ref, reason: `${ref.host === 'gitlab' ? 'GitLab' : 'Codeberg'} projects are checked by a mod for now.` };
  }
  const facts = await fetchGitHubFacts(ref, opts.token);
  const site = facts.exists
    ? await fetchGitHubSiteFacts(ref, opts.token, opts.fetchImpl)
    : { stars: 0, archived: false, lastPushAt: undefined, contributors: undefined, commitsSampled: 0, commitsCreditingAi: 0, aiAssistants: [] };
  return {
    supported: true,
    ref,
    facts,
    site,
    license: licenseVerdict(facts.licenseSpdx),
    violations: evaluateRepo(facts, opts.now ?? new Date(), opts.config ?? DEFAULT_CONFIG),
  };
}

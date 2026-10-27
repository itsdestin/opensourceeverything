// The "family" facts GitHub can tell us for free, added to the batch lookups the pre-fill and the weekly refresh already make
// (prefill/github-facts.mjs and prefill/fetch-links.mjs): is this repository a fork, of what, how many forks, latest release.
// WHY its own file: two scripts ask GitHub the same extra question; one definition keeps them identical, and keeps this
// stream's change to github-facts.mjs down to a few clearly marked lines.
//
// No extra requests: these are extra fields in the same GraphQL query (cost: nothing).
export const FAMILY_FIELDS = 'parent { nameWithOwner url } forkCount latestRelease { name tagName publishedAt }';

// Turn GitHub's answer into the small record we keep. isFork comes from the caller's own query (github-facts already asks for it).
export function familyOf(d) {
  if (!d) return {};
  return {
    forkOf: d.parent?.url ?? null,
    forkCount: d.forkCount ?? null,
    latest: d.latestRelease ? { name: d.latestRelease.name || d.latestRelease.tagName, date: d.latestRelease.publishedAt } : null,
  };
}

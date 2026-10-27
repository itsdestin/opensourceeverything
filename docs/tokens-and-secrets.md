---
status: active
---
# Tokens and secrets production needs (none are created yet)

Everything below is optional unless marked. Nothing here has been created; this is the list of what to make, by whom,
with the least power that works.

| Name | Where it goes | What it is | Without it |
|---|---|---|---|
| `ROBOT_PAT` | GitHub repo secret | A **fine-grained personal access token** for `itsdestin/opensourceeverything` only: Contents (read and write), Pull requests (read and write). | The robot's pull requests are opened with the built-in token, and GitHub does not start the **Site** check for those (a deliberate GitHub safeguard). Mods see no green tick; they can press "Run workflow" or push an empty commit. Everything else works. |
| `GITHUB_READ_TOKEN` (Worker) | `wrangler secret put GITHUB_READ_TOKEN` | A fine-grained token with **public repository read only** (no permissions needed). | The server reads GitHub's public pages without a key: 60 calls an hour per address, shared by every visitor. "Your suggestions", "Most requested" and the mod Suggestions tab then go quiet for a while when busy (answers are cached for 5 minutes to make this rare). |
| Approve button (later) | Worker secret or a GitHub App | A **GitHub App** (or fine-grained token) with **Issues: write** on this repo only. | The mod Suggestions tab links to each issue, where a mod adds the `approved` label by hand. With the App, the tab could have a real Approve button. Not built. |
| Pitch proof files | none | The Worker fetches `.opensourceeverything` from a project's public repo. | n/a |

GitHub sign-in (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) already exists; see `worker/wrangler.toml`.

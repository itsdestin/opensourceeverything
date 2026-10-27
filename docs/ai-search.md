# Meaning search (trial, switched off by default)

Result of the offline trial (Oct 26, 2026): blending meaning-based matching into the word ranker helps a little.
First-right on the blind set (60 plain-language needs written before the code was read): word-only 67%, blended 70%
(K=0.5) to 72% (K=1). Other sets unchanged at K=0.5; K=1 lost 1 to 2 points on two of them. Small, and about 2 to 3
searches out of 60, so it is not a clear win; turn it on only if that is worth a server call on weak searches.

Parts: `site/src/embed-text.mjs` (text per item), `site/embed-items.mjs` (writes `data/search-vectors.json`),
`worker/src/search.js` (GET /search), `site/assets/search-ai.js` (blend, only when the best word match is under 1.1).
Evaluate: `EMBED_PYTHON=<python with fastembed> node site/test/search-ai-eval.mjs`.

Switch on: deploy the Worker (it needs the `[ai]` binding in wrangler.toml), then build the site with `AI_SEARCH=1`
plus the normal `API_URL`. Regenerate vectors after data changes: `node site/embed-items.mjs --check`, then
`--local` (python + fastembed) or `--cloudflare` (needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN with Workers AI: Read).
The first real deploy must confirm the Workers AI answer for a probe text matches the local model (pooling "cls").

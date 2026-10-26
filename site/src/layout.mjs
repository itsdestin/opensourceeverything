// The frame every page shares: <head>, the top strip (home + search) and the footer chips.
import { esc, url, ICON, SITE_URL, SUBREDDIT, REPO, SOCIAL, DEMO, API_URL } from './lib.mjs';

export function topStrip({ search = true } = {}) {
  return `<div class="top">
  <a class="icon-btn" href="${url()}" title="Home" aria-label="Open Source Everything home">${ICON.home}</a>
  <div class="grow"></div>
  ${search ? `<div class="searchwrap" data-search>
    <div class="searchpill">${ICON.search}<input type="search" placeholder="Search a closed app or open project…" autocomplete="off" aria-label="Search"></div>
    <div class="menu search-menu" role="listbox"></div>
  </div>` : ''}
  ${SOCIAL ? '<div class="acct" data-account></div>' : ''}
</div>`;
}

export function footer() {
  // WHY separate chips (Destin, Oct 27): each footer link is its own glass chip, not words in one bar.
  return `<div class="footer">
  <a class="footchip" href="${url('gaps/')}">Gaps</a>
  ${SOCIAL ? `<a class="footchip" href="${url('boards/')}">Boards</a>` : ''}
  <a class="footchip" href="${url('about/')}">How this works</a>
  <a class="footchip" href="${url('about/#open-source')}">What counts as open source</a>
  <a class="footchip" href="${url('licenses/')}">Licenses explained</a>
  <a class="footchip" href="${url('credits/')}">Data license: CC BY-SA 4.0</a>
  <a class="footchip" href="${url('credits/')}">Credits</a>
  <a class="footchip" href="${url('privacy/')}">Privacy</a>
  <a class="footchip" href="${SUBREDDIT}" rel="noopener">r/TrueOpenSource</a>
  <a class="footchip" href="${REPO}" rel="noopener">This site's code</a>
</div>`;
}

export function page({ path, title, description, body, styles = [], scripts = [], search = true, jsonLd }) {
  const full = title ? `${title} · Open Source Everything` : 'Open Source Everything: open-source replacements for the apps you use';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE_URL}${path}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE_URL}${path}">
<meta property="og:site_name" content="Open Source Everything">
<link rel="icon" href="${url('assets/icon.svg')}" type="image/svg+xml">
<link rel="stylesheet" href="${url('assets/fonts.css')}">
<link rel="stylesheet" href="${url('assets/site.css')}">
${styles.map((s) => `<link rel="stylesheet" href="${url('assets/' + s)}">`).join('\n')}
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
<script>window.OI = { base: ${JSON.stringify(url())}, repo: ${JSON.stringify(REPO)}, chev: ${JSON.stringify(ICON.chev)} };</script>
</head>
<body>
${topStrip({ search })}
<main class="page">
${body}
${footer()}
</main>
<div class="toast" id="toast" role="status"></div>
<script src="${url('assets/site.js')}" defer></script>
${SOCIAL ? `<script src="${url(DEMO ? 'assets/fake-api.js' : 'assets/api.js')}" defer></script>${DEMO ? '' : `<script>window.OI_API_URL = ${JSON.stringify(API_URL)};</script>`}` : ''}
${scripts.map((s) => `<script src="${url('assets/' + s)}" defer></script>`).join('\n')}
${SOCIAL ? `<script src="${url('assets/social.js')}" defer></script>` : ''}
</body>
</html>`;
}

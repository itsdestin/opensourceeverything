// The frame every page shares: <head>, the top strip (home + search) and the footer chips.
import { esc, url, ICON, SITE_URL, SUBREDDIT, REPO, SOCIAL, DEMO, API_URL } from './lib.mjs';

// WHY a version on every code and style file (Oct 27): Cloudflare tells browsers to keep them for 4 hours, so after an
// update people kept running old code (Sign in did nothing). A new address per build makes browsers fetch the new files.
const BUILD = Date.now().toString(36);
const asset = (p) => `${url(p)}?v=${BUILD}`;

export function topStrip({ search = true } = {}) {
  return `<div class="top">
  <a class="icon-btn" href="${url()}" title="Home" aria-label="Open Source Everything home">${ICON.home}</a>
  <a class="top-title" href="${url()}">Open Source Everything</a>
  <div class="grow"></div>
  ${search ? `<div class="searchwrap" data-search>
    <div class="searchpill">${ICON.search}<input type="search" placeholder="Search a closed app or open project…" autocomplete="off" aria-label="Search"></div>
    <div class="menu search-menu" role="listbox"></div>
  </div>` : ''}
  ${SOCIAL ? '<div class="acct" data-account></div>' : ''}
</div>`;
}

// The phone tab bar (shown only on narrow screens, mobile.css): the places people go most, within thumb reach.
const TAB_ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  boards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12z"/></svg>',
  gaps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="4" stroke-dasharray="3 3"/></svg>',
};
export function tabbar(path) {
  const here = (p) => (p === '' ? path === '' : path.startsWith(p)) ? ' aria-current="page"' : '';
  return `<nav class="tabbar" aria-label="Main">
  <a class="tab" href="${url()}"${here('')}>${TAB_ICON.home}Home</a>
  <button class="tab" type="button" data-open-search>${TAB_ICON.search}Search</button>
  ${SOCIAL ? `<a class="tab" href="${url('boards/')}"${here('boards/') || (path.endsWith('/board/') ? ' aria-current="page"' : '')}>${TAB_ICON.boards}Boards</a>` : ''}
  <a class="tab" href="${url('gaps/')}"${here('gaps/')}>${TAB_ICON.gaps}Gaps</a>
</nav>`;
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
<script>/* WHY: the site is served through Cloudflare with a padlock; anyone arriving on plain http is moved to https. */ if (location.protocol === 'http:' && location.hostname === 'opensourceeverything.org') location.replace('https:' + location.href.slice(5));</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#EFE3F6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1F1329" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="${url('manifest.webmanifest')}">
<link rel="apple-touch-icon" href="${url('assets/icon-192.png')}">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE_URL}${path}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE_URL}${path}">
<meta property="og:site_name" content="Open Source Everything">
<link rel="icon" href="${url('assets/icon.svg')}" type="image/svg+xml">
<link rel="stylesheet" href="${asset('assets/fonts.css')}">
<link rel="stylesheet" href="${asset('assets/site.css')}">
${styles.map((s) => `<link rel="stylesheet" href="${asset('assets/' + s)}">`).join('\n')}
${SOCIAL ? `<link rel="stylesheet" href="${asset('assets/contrib.css')}">` : ''}
<link rel="stylesheet" href="${asset('assets/mobile.css')}">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
<script>window.OI = { base: ${JSON.stringify(url())}, repo: ${JSON.stringify(REPO)}, chev: ${JSON.stringify(ICON.chev)} };</script>
</head>
<body>
${topStrip({ search })}
<main class="page">
${body}
${footer()}
</main>
${tabbar(path)}
<div class="toast" id="toast" role="status"></div>
<script src="${asset('assets/search-core.js')}" defer></script>
<script src="${asset('assets/site.js')}" defer></script>
${SOCIAL ? `<script src="${asset(DEMO ? 'assets/fake-api.js' : 'assets/api.js')}" defer></script>${DEMO ? '' : `<script>window.OI_API_URL = ${JSON.stringify(API_URL)};</script>`}` : ''}
${scripts.map((s) => `<script src="${asset('assets/' + s)}" defer></script>`).join('\n')}
${SOCIAL ? `<script src="${asset('assets/social.js')}" defer></script>\n<script src="${asset('assets/contrib.js')}" defer></script>` : ''}
</body>
</html>`;
}

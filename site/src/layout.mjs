// The frame every page shares: <head>, the top strip (home + search) and the footer chips.
import { esc, url, ICON, SITE_URL, SUBREDDIT, REPO, SOCIAL, DEMO, API_URL } from './lib.mjs';

// WHY a version on every code and style file (Oct 27): Cloudflare tells browsers to keep them for 4 hours, so after an
// update people kept running old code (Sign in did nothing). A new address per build makes browsers fetch the new files.
const BUILD = Date.now().toString(36);
const asset = (p) => `${url(p)}?v=${BUILD}`;

// WHY (Destin, round 5: "there should be a way to get back home", "sign in needs the glassy look"): the top-left control is always the
// site's name; search and Sign in share its glass look, so the controls read as one set.
// WHY two looks (Destin, Nov 2): on the home page the name wears the map mark and search is a full glass search bar (the home
// card no longer has its own box); on every deeper page the mark becomes a house, so it reads as "back to home", and search
// shrinks to a button. WHY the short placeholder: the longer "Which app do you want to replace?" was cut off on phones.
const HOUSE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>';
export function topStrip({ search = true, home = false } = {}) {
  return `<div class="top${home ? ' top-home' : ''}">
  <a class="glass homebtn" href="${url()}" title="Home" aria-label="Open Source Everything home">${home ? ICON.home : HOUSE}<span class="hname">Open Source Everything</span></a>
  <div class="grow"></div>
${home ? `  <div class="searchwrap topsearch" data-search>
    <div class="searchpill glass">${ICON.search}<input type="search" placeholder="Which app to replace?" autocomplete="off" aria-label="Search for an app to replace"></div>
    <div class="menu search-menu" role="listbox"></div>
  </div>` : search ? `<a class="glass iconbtn top-search" href="${url('search/')}" title="Search" aria-label="Search">${ICON.search.replace(/width="14" height="14"/, 'width="16" height="16"')}</a>` : ''}
  ${SOCIAL ? '<div class="acct" data-account></div>' : ''}
</div>`;
}

// The phone tab bar (shown only on narrow screens, mobile.css): the places people go most, within thumb reach.
const TAB_ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  gaps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="4" stroke-dasharray="3 3"/></svg>',
};
// WHY four plain tabs (Destin, round 4: "simpler options with clearer purposes"): Home, Browse (the categories), Search, Gaps. Boards are gone.
// Browse is "current" on category, group, project and closed-app pages: they are all places you reach by browsing.
const TAB_BROWSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>';
export function tabbar(path) {
  const on = (yes) => (yes ? ' aria-current="page"' : '');
  return `<nav class="tabbar" aria-label="Main">
  <a class="tab" href="${url()}"${on(path === '')}>${TAB_ICON.home}Home</a>
  <a class="tab" href="${url('#categories')}"${on(/^(c|g|p|alternatives-to)\//.test(path))}>${TAB_BROWSE}Browse</a>
  <a class="tab" href="${url('search/')}"${on(path === 'search/')}>${TAB_ICON.search}Search</a>
  <a class="tab" href="${url('gaps/')}"${on(path === 'gaps/')}>${TAB_ICON.gaps}Gaps</a>
</nav>`;
}

// WHY one small footer (Destin, round 4: fewer, clearer links, nothing the phone's tab bar already has): About, Licenses, Privacy, Credits, the subreddit and the code.
// Gaps stays on desktop only, where there is no tab bar.
// WHY "How we check" (evidence map §2, Nov 2): the site-wide way to the methodology; every source label also links there.
// WHY no "For AI agents" chip (agent-access merge, Oct 27): About's "Use it with an AI assistant" button already reaches ai/.
export function footer() {
  return `<div class="footer">
  <a class="footchip deskonly" href="${url('gaps/')}">Gaps</a>
  <a class="footchip" href="${url('about/')}">About</a>
  <a class="footchip" href="${url('how-we-check/')}">How we check</a>
  <a class="footchip" href="${url('licenses/')}">Licenses</a>
  <a class="footchip" href="${url('privacy/')}">Privacy</a>
  <a class="footchip" href="${url('credits/')}">Credits &amp; data</a>
  <a class="footchip" href="${SUBREDDIT}" rel="noopener">r/TrueOpenSource</a>
  <a class="footchip" href="${REPO}" rel="noopener">Code</a>
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
<!-- WHY preload the main font (Destin, Nov 2: "the whole page frequently seems to flicker/resize slightly when clicking between
     pages"): each page drew its text in a stand-in font, then swapped to Outfit about 45ms later, nudging text and cards. Asking
     for the font first means it is ready before the first paint. -->
<link rel="preload" href="${url('assets/fonts/outfit-latin.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${asset('assets/fonts.css')}">
<link rel="stylesheet" href="${asset('assets/site.css')}">
${styles.map((s) => `<link rel="stylesheet" href="${asset('assets/' + s)}">`).join('\n')}
${SOCIAL ? `<link rel="stylesheet" href="${asset('assets/contrib.css')}">` : ''}
<link rel="stylesheet" href="${asset('assets/mobile.css')}">
<link rel="stylesheet" href="${asset('assets/redesign.css')}">
<script>/* WHY ?v=b: the card's quiet "Has 4 of 6" line is shown only in option B, so Destin can compare A (no line) and B; remembered for the tab. */
(function () { try { var v = new URLSearchParams(location.search).get('v'), s = window.sessionStorage; if (v === 'b') s.setItem('ose-v', 'b'); else if (v === 'a') s.removeItem('ose-v'); if (s.getItem('ose-v') === 'b') document.documentElement.dataset.v = 'b'; } catch (e) {} })();</script>
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
<script>window.OI = { base: ${JSON.stringify(url())}, repo: ${JSON.stringify(REPO)}, chev: ${JSON.stringify(ICON.chev)} };</script>
</head>
<body>
${topStrip({ search, home: path === '' })}
<main class="page">
${body}
${footer()}
</main>
${tabbar(path)}
<div class="toast" id="toast" role="status"></div>
<script src="${asset('assets/search-core.js')}" defer></script>
<script src="${asset('assets/search-ai.js')}" defer></script>
<script src="${asset('assets/site.js')}" defer></script>
<script src="${asset('assets/redesign.js')}" defer></script>
${SOCIAL ? `<script src="${asset(DEMO ? 'assets/fake-api.js' : 'assets/api.js')}" defer></script>${DEMO ? '' : `<script>window.OI_API_URL = ${JSON.stringify(API_URL)};</script>`}` : ''}
${SOCIAL && !DEMO && process.env.AI_SEARCH === '1' ? '<script>window.OI_AI_SEARCH = true;</script>' : ''}
${scripts.map((s) => `<script src="${asset('assets/' + s)}" defer></script>`).join('\n')}
${SOCIAL ? `<script src="${asset('assets/social.js')}" defer></script>\n<script src="${asset('assets/contrib.js')}" defer></script>` : ''}
</body>
</html>`;
}

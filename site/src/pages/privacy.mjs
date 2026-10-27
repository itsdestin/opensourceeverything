// Privacy (privacy/): what this site does and doesn't collect, in plain words.
// WHY now (plan: "a privacy page before launch"): visitors of an open-source site expect to know, and the
// suggestion forms send people to GitHub. Update this page when sign-in and voting arrive.
import { REPO } from '../lib.mjs';

export default function privacy() {
  const section = (title, html) => `<section class="surface sec prose"><h2 class="h-large">${title}</h2>${html}</section>`;
  const body = `
  <div class="surface identity">
    <div><h1 class="h-subject">Privacy</h1>
      <p class="desc12" style="margin-top:4px">Short version: nothing. There are no accounts, no cookies, no ads and no tracking.</p></div>
  </div>
  ${section('What we collect', `
    <ul class="list">
      <li><b class="num">No cookies and no tracking.</b> No analytics tools, no ads, no "like" buttons from other companies.</li>
      <li><b class="num">Search happens in your browser.</b> What you type in the search box stays on your device, with one exception: when the site can't find a good match by the words alone, the text you typed may be sent to our server, which asks Cloudflare's AI service what it means in order to find better matches. It is used for that one answer and is not stored or linked to you. (This is off until the site turns it on.)</li>
      <li><b class="num">Fonts and pictures come from this site.</b> Nothing loads from Google or other font services. The only exception: opening a screenshot full size loads the original from the project's own page (usually GitHub).</li>
    </ul>`)}
  ${section('Who else is involved', `
    <ul class="list">
      <li><b class="num">GitHub hosts this site</b> (GitHub Pages). Like any web host, GitHub sees your IP address when you visit. See <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener">GitHub's privacy statement</a>.</li>
      <li><b class="num">Suggestions are made on GitHub.</b> When you suggest a change, you post it with your GitHub account, in public. Anyone can read it, and that's on purpose: every decision about the map is open.</li>
      <li><b class="num">Links go to other sites.</b> Downloads, websites and code pages belong to each project and have their own rules.</li>
    </ul>`)}
  ${section('When this changes', `
    <p class="body2">Voting and comments will need sign-in with GitHub. When they arrive, this page will say exactly what's stored (your GitHub username and what you posted) and how to delete it, before anything is collected. This page's history is public in <a href="${REPO}/commits/main/site/src/pages/privacy.mjs" rel="noopener">the site's code</a>.</p>`)}`;
  return [{ path: 'privacy/', title: 'Privacy', styles: ['pages.css'], description: 'What Open Source Everything knows about you: no accounts, no cookies, no tracking.', body }];
}

// How this works (about/): what the site is, how it's organised, what counts as open source, where the
// listings came from, how to get listed, and that everything about the site is open.
import { url, esc, REPO, SUBREDDIT, suggestUrl, counts } from '../lib.mjs';

export default function about(d) {
  const section = (id, title, html) => `<section class="surface sec prose"${id ? ` id="${id}"` : ''}><h2 class="h-large">${title}</h2>${html}</section>`;
  const n = counts(d); // WHY: the same numbers as the home page (see lib.mjs)
  const body = `
  <div class="surface identity">
    <div><div class="muted11">About</div><h1 class="h-subject">How Open Source Everything works</h1></div>
    <div class="fchips">
      <a class="fchip" href="#organised">How it's organised</a><a class="fchip" href="#open-source">What counts as open source</a>
      <a class="fchip" href="#listings">Where listings come from</a><a class="fchip" href="#add">Get listed</a><a class="fchip" href="#open">This site is open too</a>
    </div>
  </div>
  ${section('what', 'What this is', `
    <p class="body2">Open Source Everything lists open-source replacements for the closed-source apps people use every day, from Google Docs to Photoshop. It also shows where nothing good exists yet, so people who build software can see what's worth making.</p>
    <p class="body2">It's supported by the <a href="${SUBREDDIT}" rel="noopener">r/TrueOpenSource</a> community.</p>`)}
  ${section('organised', 'How it\'s organised', `
    <div class="defs">
      <div class="lvl1"><h3>Categories</h3><p class="small2">Shelves for browsing, like Creative or Office &amp; productivity.</p></div>
      <div class="lvl1"><h3>Groups</h3><p class="small2">One job each, like Photo editing or Video calls. Photoshop and Canva sit in different groups because they do different jobs, so they're never compared with each other.</p></div>
      <div class="lvl1"><h3>Closed apps</h3><p class="small2">The apps a group replaces. One app can sit in several groups if it does several jobs.</p></div>
      <div class="lvl1"><h3>Open alternatives</h3><p class="small2">Open-source projects that do the group's job. <b class="num">Replaces fully</b> means it does the main job; <b class="num">replaces partly</b> means it covers some of it.</p></div>
    </div>`)}
  ${section('open-source', 'What counts as open source', `
    <p class="body2">Only projects under a license the <a href="https://opensource.org/licenses" rel="noopener">Open Source Initiative</a> approves are listed. That's what lets anyone use, change and share the code.</p>
    <div class="defs">
      <div class="lvl1"><h3>Open core</h3><p class="small2">Open source, but with some parts paid or under another license. These are listed, with an "Open core" tag so you know.</p></div>
      <div class="lvl1"><h3>Source-available</h3><p class="small2">You can read the code, but the license limits what you can do with it. These aren't listed, even when they're often called open source. For example, n8n uses a "Sustainable Use License", which isn't open source.</p></div>
    </div>`)}
  ${section('listings', 'Where the listings come from', `
    <ul class="small2 list">
      <li>The first version was filled in once from free, openly licensed lists of alternatives. They're named on the <a href="${url('credits/')}">Credits</a> page.</li>
      <li>Each project's own page was read to write a short, neutral description and to check what it really replaces. That was done with AI, then checked again with a stronger AI model, and every change it made was recorded with its reason.</li>
      <li>Licenses are read from each project's code. Where the host doesn't report one, a mod confirms it before it counts.</li>
      <li id="verified"><b class="num">Verified</b> means r/TrueOpenSource mods checked it themselves: an open-source license, still maintained, and it really does the job.</li>
    </ul>`)}
  ${section('add', 'Get listed, or suggest something', `
    <div class="textrow">
      <div><p class="body2">Built an open-source alternative, or know one that's missing? Fill in a short form on GitHub: add a project, fix something, add a closed app, suggest a missing job, or report a project.</p>
        <p class="small2" style="margin-top:4px">A robot checks the license and the project's age first (the same checks as r/TrueOpenSource), then a mod reviews it. Once a mod approves, the change goes on the site. Every suggestion and decision stays public.</p></div>
      <div class="btns-row">
        <a class="btn md secondary" href="${REPO}/issues/new/choose" rel="noopener">See all the forms</a>
        <a class="btn md primary" href="${esc(suggestUrl('1-add-project'))}" rel="noopener">Add a project</a>
      </div>
    </div>`)}
  ${section('open', 'This site is open too', `
    <div class="textrow">
    <p class="body2">The site's code, its data and its design are all open. Anyone can read them, copy them, or help improve them.</p>
    <div class="btns-row">
      <a class="btn md secondary" href="${url('data/groups.json')}">The data (CC BY-SA 4.0)</a>
      <a class="btn md secondary" href="${url('llms.txt')}">Guide for AI assistants</a>
      <a class="btn md primary" href="${REPO}" rel="noopener">The code on GitHub</a>
    </div>
    </div>`)}`;
  return [{ path: 'about/', title: 'How it works', styles: ['pages.css'], description: 'How Open Source Everything is organised, what counts as open source, where the listings come from, and how to get listed.', body }];
}

// How we check (how-we-check/): where every answer on the site comes from, what the marks mean, how accurate the AI research
// is, and what replaces it later. WHY its own page (evidence map §2, Destin Nov 2): every source label links here, and the
// site says openly that the map was first filled in with AI help, with the measured error rate, not a promise.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { url, esc, SUBREDDIT } from '../lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const spot = (() => { try { return JSON.parse(readFileSync(join(ROOT, 'data', 'spot-check.json'), 'utf8')).checks; } catch { return []; } })();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const when = (d) => { const [y, m] = d.split('-'); return `${MONTHS[+m - 1]} ${y}`; };

export default function howWeCheck() {
  const section = (id, title, html) => `<section class="surface sec prose" id="${id}"><h2 class="h-large">${title}</h2>${html}</section>`;
  const last = spot.at(-1);
  const body = `
  <div class="surface identity">
    <div><div class="muted11">About</div><h1 class="h-subject">How we check</h1>
      <p class="desc12" style="margin-top:4px">The feature answers on this site were first filled in with AI help. Every one links to the page it came from.</p></div>
  </div>
  ${section('sources', 'Where the answers come from', `
    <ul class="small2 list">
      <li><b>Open-source projects</b> (October 2026): an AI read each project's own README and website and answered its group's checklist.</li>
      <li><b>Closed apps</b> (November 2026): an AI searched each maker's own feature pages, help pages and app store listings. A major news site or Wikipedia counts only when the maker says nothing; comparison and advertising blogs never count.</li>
      <li>Every answer keeps the page it came from and the exact words that back it. Tap any answer to see them.</li>
      <li>When the AI couldn't find a page that clearly says, the answer is left as <b>Not checked yet</b>. It's never a guess.</li>
    </ul>`)}
  ${section('marks', 'What the marks mean', `
    <div class="defs">
      <div class="lvl1"><h3><span class="fm yes" aria-hidden="true">✓</span> Yes</h3><p class="small2">It does this, as the question describes. Tap a column name to read the question and what counts.</p></div>
      <div class="lvl1"><h3><span class="fm partly" aria-hidden="true">~</span> Partly</h3><p class="small2">Some of it, or only in some versions or paid plans. The note says which.</p></div>
      <div class="lvl1"><h3><span class="fm no" aria-hidden="true">✗</span> No</h3><p class="small2">A page makes clear it doesn't.</p></div>
      <div class="lvl1"><h3><span class="fm own" aria-hidden="true">—</span> Its own format</h3><p class="small2">The question is about this app's own files, like "Opens Word files" for Microsoft Word.</p></div>
    </div>`)}
  ${section('accuracy', 'How accurate it is', last ? `
    <p class="body2"><b>${last.checked - last.wrong} of ${last.checked}</b> answers were right when we last checked them by hand (${when(last.date)}).</p>
    <p class="body2">AI can point to a real page that doesn't say what it claims. So we open a sample of answers at their source and check them by hand.</p>
    <table class="spot"><thead><tr><th scope="col">When</th><th scope="col">What was checked</th><th scope="col">Answers</th><th scope="col">Wrong</th></tr></thead>
      <tbody>${spot.map((c) => `<tr><td>${when(c.date)}</td><td>${esc(c.what)}</td><td class="num">${c.checked}</td><td class="num">${c.wrong} (${Math.round((c.wrong / c.checked) * 100)}%)</td></tr>`).join('')}</tbody></table>
    ${last.fixes ? `<p class="small2">What changed after the last check: ${esc(last.fixes)}</p>` : ''}` : '<p class="body2">The first hand check is under way.</p>')}
  ${section('next', 'What replaces the AI answers', `
    <p class="body2">Next come tests anyone can repeat: public code, fixed test files and a stated method. Results that people send in using those tests, once five of them agree, replace the AI's answer. The AI's answer stays visible as history.</p>`)}
  ${section('wrong', 'Found a wrong answer?', `
    <p class="body2">Use <b>Suggest a fix</b> on the project's page, or post on <a href="${SUBREDDIT}" rel="noopener">r/TrueOpenSource</a>. Fixes are checked against the source and change the answer for everyone.</p>`)}`;
  return [{ path: 'how-we-check/', title: 'How we check', description: 'Where the feature answers on Open Source Everything come from, how accurate the AI research is, and what replaces it.', styles: ['pages.css', 'surfaces.css'], body }];
}

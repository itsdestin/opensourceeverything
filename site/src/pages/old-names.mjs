// Old addresses that keep working for renamed projects (p/perplexica/ -> Vane) and a page for each of the old names.
// WHY (review Oct 26 section 5): renamed projects must not strand old links, bookmarks or search results.
// WHY a page and not a server rule: the site is plain files; a small page that sends visitors on is all that's needed,
// and it says where they are going in words for anyone whose browser does not follow it.
import { familyIndex, redirects } from '../family.mjs';
import { esc, url } from '../lib.mjs';

export default function redirectPages(d) {
  familyIndex(d);
  return redirects(d).map(({ from, to }) => {
    const target = url(`p/${to.id}/`);
    return {
      path: `p/${from}/`, title: `${to.name} (formerly ${from})`, description: `${from} is now ${to.name}.`, noIndex: true,
      styles: ['group.css'],
      body: `<div class="surface identity"><h1 class="h-subject">${esc(from)} is now ${esc(to.name)}</h1>
        <p class="body2">This project was renamed. Taking you to <a href="${target}">${esc(to.name)}</a>…</p>
        <script>location.replace(${JSON.stringify(target)});</script>
        <noscript><p class="small2"><a href="${target}">Go to ${esc(to.name)}</a></p></noscript></div>`,
    };
  });
}

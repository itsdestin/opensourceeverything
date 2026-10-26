// Licenses explained (licenses/): what each open-source license on the map means for someone using the app, in plain words.
// WHY (Destin, Oct 27): a project page's license chip links here, to its own section (licenses/#gpl and so on).
import { esc, url } from '../lib.mjs';

// The section a license's chip jumps to; licenseAnchor() in lib.mjs maps SPDX names onto these ids.
export const LICENSES = [
  ['mit', 'MIT', 'Permissive', 'Do almost anything with it, including putting it in closed, paid software. The only rule: keep the copyright notice.'],
  ['apache', 'Apache 2.0', 'Permissive', "Like MIT, plus two things: anyone who contributes also grants you their patents for it, and changed files must say they've been changed."],
  ['bsd', 'BSD (2- and 3-clause)', 'Permissive', "Like MIT. The 3-clause version adds one rule: you can't use the authors' names to promote your own product without asking."],
  ['mpl', 'Mozilla Public License 2.0', 'Weak copyleft', "If you change one of its files and share the result, those files stay open. You can still combine it with closed code in other files. Firefox and Thunderbird use it."],
  ['lgpl', 'GNU Lesser GPL (LGPL)', 'Weak copyleft', 'Mostly used for code libraries. Changes to the library itself stay open, but apps that only use the library can have any license.'],
  ['gpl', 'GNU General Public License (GPL)', 'Copyleft', 'If you share a changed version, you must share its source code under the GPL too, so it stays open for everyone downstream. Version 3 adds patent protection and stops device makers from locking out changed versions. "Or later" means newer GPL versions can be used too.'],
  ['agpl', 'GNU Affero GPL (AGPL)', 'Network copyleft', "The GPL, plus one rule for online services: if someone runs a changed version as a website or server, its users can ask for the source code. It's the most common license for apps you run on your own server, because it keeps a company from taking the code private as a paid service."],
  ['osl', 'Open Software License 3.0', 'Network copyleft', 'Similar to the AGPL: changed versions must stay open, including ones offered over a network.'],
  ['eupl', 'European Union Public License 1.2', 'Network copyleft', "The EU's own open-source license. Like the AGPL, changed versions must stay open, even when offered online, and it works alongside the GPL and similar licenses."],
];

export default function licenses() {
  const sec = ([id, name, family, text]) => `<section class="surface sec" id="${id}"><div class="sec-head"><div><h2 class="h-large">${esc(name)}</h2><p class="desc12">${esc(family)}</p></div></div><p class="body2">${esc(text)}</p></section>`;
  const body = `
  <div class="surface identity">
    <div><div class="muted11">Licenses</div><h1 class="h-subject">What the licenses mean</h1>
      <p class="desc12" style="margin-top:4px">Every project on this map uses a license the <a href="https://opensource.org/licenses" rel="noopener">Open Source Initiative</a> approves. Here's what each one means, in plain words. This is a summary, not legal advice.</p></div>
    <div class="pop" style="padding-left:0"><span class="muted11">Jump to</span><div class="fchips">${LICENSES.map(([id, name]) => `<a class="fchip" href="#${id}">${esc(name.replace(/ \(.*\)$/, ''))}</a>`).join('')}<a class="fchip" href="#open-core">Open core</a></div></div>
  </div>
  <section class="surface sec">
    <h2 class="h-large">What every one of them lets you do</h2>
    <p class="body2">Use the app for free, for anything, at home or at work. Read its code, change it, and share it, changed or not. The licenses only differ in what you must do <b class="num">if you share your own changed version</b>. For most people, who just use the app, they're all the same.</p>
    <div class="defs">
      <div class="lvl1"><h3>Permissive</h3><p class="small2">MIT, Apache, BSD. Changed versions can even become closed software.</p></div>
      <div class="lvl1"><h3>Copyleft</h3><p class="small2">GPL, LGPL, MPL. Changed versions that are shared must stay open.</p></div>
      <div class="lvl1"><h3>Network copyleft</h3><p class="small2">AGPL, OSL, EUPL. The same, even when the changed version runs as an online service.</p></div>
    </div>
  </section>
  ${LICENSES.map(sec).join('')}
  <section class="surface sec" id="open-core"><div class="sec-head"><div><h2 class="h-large">Open core</h2><p class="desc12">A label, not a license</p></div></div>
    <p class="body2">The project's main code uses one of the licenses above, but some parts, usually business features, are paid or under a different license. Those projects are listed with an "Open core" chip, so you know before you start.</p></section>
  <section class="surface sec"><h2 class="h-large">Not listed: source-available</h2>
    <p class="body2">Some licenses let you read the code but limit what you can do with it, like banning business use or competing services. Examples: Business Source License, Server Side Public License, Commons Clause, the Sustainable Use License. They're often called open source, but they aren't, so those projects aren't on this map. <a href="${url('about/#open-source')}">More on what counts</a>.</p></section>`;
  return [{ path: 'licenses/', title: 'What the licenses mean', styles: ['pages.css'], description: 'What each open-source license means for people who use the app, in plain words: MIT, Apache, GPL, AGPL, MPL and more.', body }];
}

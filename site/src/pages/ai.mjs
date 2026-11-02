// For AI agents (ai/): copy-paste setup for connecting an assistant to the map, in plain words.
// WHY a page and not only llms.txt (review Oct 26 section 6, Destin: "improve tooling for agentic access"): people, not
// just robots, have to find the connector and paste its address into Claude or ChatGPT. Uses the page styles that
// already exist (prose sections, .prompt copy blocks), no new CSS.
import { esc, url } from '../lib.mjs';
import { SETUP, MCP_URL } from '../llms.mjs';
import { API_URL } from '../openapi.mjs';

export default function ai() {
  const section = (title, html) => `<section class="surface sec prose"><h2 class="h-large">${title}</h2>${html}</section>`;
  const copyBlock = (id, text, label = 'Copy') => `<div class="lvl2 prompt" id="${id}">${esc(text)}</div><div class="stack"><button class="btn md secondary" type="button" data-copy="${id}" data-copied="Copied.">${label}</button></div>`;
  const setup = SETUP.map((s) => section(s.title, `
    ${s.steps ? `<ol class="list">${s.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
    ${s.command ? copyBlock(`copy-${s.id}`, s.command, 'Copy the command') : ''}
    ${s.json ? copyBlock(`copy-${s.id}`, s.json, 'Copy the settings') : ''}
    ${s.id === 'claude' || s.id === 'chatgpt' ? copyBlock(`copy-${s.id}-url`, MCP_URL, 'Copy the address') : ''}
    ${s.note ? `<p class="small2">${esc(s.note)}</p>` : ''}`)).join('');
  const body = `
  <div class="surface identity">
    <div><div class="muted11">For AI agents</div><h1 class="h-subject">Ask an AI about the map</h1>
      <p class="desc12" style="margin-top:4px">Connect Claude, ChatGPT or an assistant on your own computer, then ask it "what can replace Photoshop for me?" It looks the answer up here, in the same list you see on this site. Read-only: no account, no key, nothing is saved about you.</p></div>
  </div>
  ${section('What it can do', `
    <ul class="list">
      <li><b class="num">Find replacements.</b> "I'm leaving Google Photos and I have an iPhone." It picks from the listed alternatives and links each page.</li>
      <li><b class="num">Compare.</b> "How is LibreWolf different from Firefox?" It reads setup, devices, license, activity and which one is a copy of the other.</li>
      <li><b class="num">Show the gaps.</b> "What can't open source do yet?"</li>
      <li><b class="num">Point to a way to help</b> a project you like.</li>
    </ul>
    <p class="small2">Listings were drafted with AI assistance and are managed by r/TrueOpenSource moderators, so good assistants tell you to check a project's own page. The data is CC BY-SA 4.0: assistants should name this site and link the page they used.</p>`)}
  ${setup}
  ${section('Other ways in', `
    <ul class="list">
      <li><b class="num">Plain JSON.</b> <a href="${API_URL}/v1/search?q=alternative+to+notion">${API_URL}/v1/search?q=alternative+to+notion</a>, described in <a href="${url('openapi.json')}">openapi.json</a>.</li>
      <li><b class="num">Download everything.</b> <a href="${url('data/catalog.json')}">catalog.json</a> is the whole map in one file. There are also small files for each project, closed app and job; the guide below lists their addresses.</li>
      <li><b class="num">Guide written for AI.</b> <a href="${url('llms.txt')}">llms.txt</a> explains every field in plain words.</li>
    </ul>`)}`;
  return [{ path: 'ai/', title: 'For AI agents', styles: ['pages.css'], description: 'Connect Claude, ChatGPT or your own AI assistant to Open Source Everything so it can answer "what can replace X?" from the map.', body }];
}

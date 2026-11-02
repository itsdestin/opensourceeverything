// The content filter: what people write, and the links in it. ONE file used by the real server (worker/src), the
// preview's pretend server (fake-api.js) and the suggestion robot, so they cannot drift apart. Pure: no network, no database.
// The word lists live in blocked-words.js. Rules: docs/server-rules.md → "What people write".
//
// Two outcomes, and why:
//  - flags: the post is HELD for a mod (language, spam, a suspicious link). WHY hold, not refuse: word lists are blunt,
//    and a silent rejection teaches people to dodge the filter; a held post just waits for a human.
//  - error: a link that can never be right (a shortener, a web address with a hidden password, a look-alike of another
//    site). The person is told exactly what to fix.
import { PROFANITY, SLURS, SPAM, SHORTENERS, BRANDS } from './blocked-words.js';

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '+': 't' };
// Collapse repeated letters ("fuuuck" → "fuck"); words are collapsed the same way so "ass" is compared as "as" only when the text had 3+ repeats.
const squeeze = (s) => s.replace(/(.)\1+/g, '$1');
const strip = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
const unleet = (s) => s.replace(/[013578@$!+]/g, (c) => LEET[c]);

const WORDS = new Set([...PROFANITY, ...SLURS]);
const SQUEEZED = new Set([...WORDS].map(squeeze));
const LONG_SLURS = [...SLURS, ...PROFANITY].filter((w) => w.length >= 6).map(squeeze);

// "f u c k", "f.u.c.k", "f-u-c-k" → "fuck" (only runs of 3+ single letters, so ordinary text is left alone).
const joinSpelled = (s) => s.replace(/\b(?:[a-z0-9@$][\s.\-_*]+){2,}[a-z0-9@$]\b/g, (m) => m.replace(/[\s.\-_*]+/g, ''));

export function hasBadLanguage(text) {
  const base = joinSpelled(strip(String(text ?? '')));
  // Leet only inside words that also contain a letter, so plain numbers ("2019", "100%") never become words.
  const tokens = base.split(/[^a-z0-9@$!+]+/).filter(Boolean).map((t) => (/[a-z]/.test(t) ? unleet(t) : t)).map((t) => t.replace(/[^a-z]/g, ''));
  for (const t of tokens) {
    if (WORDS.has(t)) return true;
    // Long repeats ("fuuuuck") only count when the text really had 3+ in a row.
    if (/(.)\1\1/.test(t) && SQUEEZED.has(squeeze(t))) return true;
  }
  // Words run together or hidden in one long string ("youmotherfucker"): only the long, unmistakable ones.
  const run = squeeze(unleet(base).replace(/[^a-z]/g, ''));
  return LONG_SLURS.some((w) => run.includes(w));
}
export const hasSpam = (text) => { const t = strip(String(text ?? '')).replace(/\s+/g, ' '); return SPAM.some((p) => t.includes(p)); };

// ── Links ──
const lastTwo = (host) => host.split('.').slice(-2).join('.');
const within1 = (a, b) => {
  if (a === b) return true; if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0; while (i < a.length && a[i] === b[i]) i++;
  return a.slice(i + 1) === b.slice(i + 1) || a.slice(i) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i);
};
// → the site this address is imitating, or null.
export function lookalike(host) {
  const reg = lastTwo(host); const label = reg.split('.')[0];
  const plain = unleet(label.replace(/-/g, ''));
  for (const [brand, real] of Object.entries(BRANDS)) {
    if (real.includes(reg)) return null;
    if (plain.length >= 5 && (within1(plain, brand) || (brand.length >= 5 && plain.includes(brand) && plain !== brand))) return brand;
    // "github.com.evil.example", "login-github.example": the brand sits in the front parts of the address.
    if (brand.length >= 5 && host.split('.').slice(0, -2).some((p) => p.includes(brand))) return brand;
  }
  return null;
}
const isShortener = (host) => SHORTENERS.some((s) => host === s || host.endsWith(`.${s}`));

// One web address. → { error?: 'what to fix', flags: [] }
export function screenLink(raw) {
  let u; try { u = new URL(String(raw)); } catch { return { error: 'That is not a web address.', flags: [] }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { error: 'Links must start with http:// or https://.', flags: [] };
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (u.username || u.password) return { error: 'Links with a hidden name or password in them are not allowed.', flags: [] };
  if (!host.includes('.') || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':') || host.startsWith('[')) return { error: 'Use the site\'s name, not a number address.', flags: [] };
  if (host.split('.').some((l) => l.startsWith('xn--'))) return { error: 'Addresses with look-alike letters are not allowed.', flags: [] };
  if (u.port) return { error: 'Use the site\'s normal address, without a port number.', flags: [] };
  if (isShortener(host)) return { error: 'Shortened links hide where they go. Paste the full address.', flags: [] };
  const imitates = lookalike(host);
  if (imitates) return { error: `This address looks like ${imitates}'s but is not. If it is really yours, ask a mod to add it.`, flags: ['lookalike-link'] };
  return { flags: [], host };
}

const URL_RE = /\bhttps?:\/\/[^\s<>"'`]+/gi;
// Run-together text with a shortener host but no scheme ("bit.ly/abc") is caught too, since people paste them bare.
const BARE_SHORT = new RegExp(`(?:^|[^a-z0-9.-])(?:${SHORTENERS.map((s) => s.replace(/\./g, '\\.')).join('|')})/\\S`, 'i');
export const MAX_LINKS_IN_TEXT = 5;

// Free text (a note, a reply, a pitch). → { error?, flags: ['language'|'spam'|'many-links'|'lookalike-link'] }
export function screenText(text) {
  const t = String(text ?? ''); const flags = new Set();
  if (hasBadLanguage(t)) flags.add('language');
  if (hasSpam(t)) flags.add('spam');
  if (BARE_SHORT.test(t)) return { error: 'Shortened links hide where they go. Paste the full address.', flags: [...flags] };
  const urls = t.match(URL_RE) ?? [];
  if (urls.length > MAX_LINKS_IN_TEXT) flags.add('many-links');
  for (const raw of urls) {
    const r = screenLink(raw.replace(/[.,;:!?)\]]+$/, ''));
    if (r.error && !r.flags.length) return { error: r.error, flags: [...flags] };
    r.flags.forEach((f) => flags.add(f));
  }
  return { flags: [...flags] };
}

// Several fields at once: the first error wins, flags are pooled. → { error?, flags }
export function screenAll(...texts) {
  const flags = new Set();
  for (const t of texts) { const r = screenText(t); if (r.error) return { error: r.error, flags: [...flags] }; r.flags.forEach((f) => flags.add(f)); }
  return { flags: [...flags] };
}
// What a mod reads next to a held post.
export const FLAG_TEXT = { language: 'bad language', spam: 'looks like spam', 'many-links': 'many links', 'lookalike-link': 'link imitates another site' };
export const flagText = (flags) => flags.map((f) => FLAG_TEXT[f] ?? f).join(', ');

// The lists behind the content filter (site/assets/filter.js). Plain words, one list per kind: add or remove a word here
// and nothing else needs to change. Everything is lower case. The filter also catches simple disguises (f.u.c.k, sh1t,
// fuuuck), so list the plain spelling only.
//
// WHY this never refuses a post by itself: a match only HOLDS the post for a mod (the author is told a mod will read it).
// Lists are blunt; a mod decides.

// Matched as whole words only (so "class" and "Scunthorpe" are fine).
export const PROFANITY = ['fuck', 'fucking', 'fucker', 'fucked', 'motherfucker', 'shit', 'shitty', 'bullshit', 'bitch', 'bitches', 'asshole', 'assholes', 'bastard',
  'cunt', 'dick', 'dickhead', 'cock', 'cocksucker', 'pussy', 'whore', 'slut', 'twat', 'wanker', 'bollocks', 'dumbass', 'jackass', 'douchebag', 'piss', 'pissed', 'prick'];

// Hateful words. Whole-word matches AND, for the long ones, matches inside run-together text.
export const SLURS = ['nigger', 'nigga', 'niggers', 'faggot', 'faggots', 'fag', 'dyke', 'tranny', 'retard', 'retarded', 'kike', 'spic', 'chink', 'gook', 'coon', 'wetback', 'beaner', 'paki', 'raghead', 'towelhead'];

// Spam and scam phrases that have no business on a software board.
export const SPAM = ['whatsapp me', 'telegram', 'crypto giveaway', 'free bitcoin', 'double your', 'click here to', 'buy now', 'viagra', 'casino', 'porn', 'onlyfans',
  'earn money fast', 'dm me for', 'make money online', 'limited time offer'];

// Link shorteners hide where a link goes, so they are refused outright (the person is asked for the real address).
export const SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'cutt.ly', 'rebrand.ly', 'shorturl.at', 'tiny.cc', 'rb.gy',
  'v.gd', 'lnkd.in', 'bit.do', 'adf.ly', 'trib.al', 'shorte.st', 'qr.ae', 'soo.gd', 's.id', 'clck.ru', 'linktr.ee', 'l.ead.me', 't.ly'];

// Well-known sites people imitate. A link whose name is close to one of these but is not on its real domains is suspect.
// name → its real domains (the last two parts of the address).
export const BRANDS = {
  github: ['github.com', 'github.io', 'githubusercontent.com', 'githubassets.com'], gitlab: ['gitlab.com', 'gitlab.io'], codeberg: ['codeberg.org', 'codeberg.page'],
  google: ['google.com', 'google.org', 'googleapis.com'], microsoft: ['microsoft.com', 'live.com'], apple: ['apple.com', 'icloud.com'], paypal: ['paypal.com'],
  mozilla: ['mozilla.org', 'mozilla.com', 'firefox.com'], libreoffice: ['libreoffice.org', 'documentfoundation.org'], youtube: ['youtube.com'], facebook: ['facebook.com'],
  amazon: ['amazon.com'], discord: ['discord.com', 'discord.gg'], reddit: ['reddit.com', 'redd.it'], opensourceeverything: ['opensourceeverything.org'],
  ubuntu: ['ubuntu.com', 'canonical.com'], debian: ['debian.org'], blender: ['blender.org'], gimp: ['gimp.org'], kde: ['kde.org'], gnome: ['gnome.org'],
  sourceforge: ['sourceforge.net'], dropbox: ['dropbox.com'], twitter: ['twitter.com', 'x.com'], linkedin: ['linkedin.com'], wikipedia: ['wikipedia.org'],
};

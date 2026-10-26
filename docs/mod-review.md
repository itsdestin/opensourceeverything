---
status: active
---
# For Destin and esk: three things only mods can decide

Everything else before launch is done or on its way. Reply in chat with "approve all" or name the exceptions, and Claude
updates the data files (`data/license-confirmed.json`, `data/verified.json`). Each item says what visitors see.

## 1. Confirm licenses

**What visitors see now:** these projects show their license, and hovering over the chip says "A mod is confirming this license".
After you confirm, that note goes away.

**How they were checked:** an AI researcher read each project's own LICENSE file or official license page (the "source"
link in each row). "Open core" means open source, with some parts paid or under another license. Those get an "Open core" chip.
"Unclear" ones stay unconfirmed until a mod looks.

**Worth a second look:**
- **Font Awesome:** its free icons are CC-BY-4.0, which isn't an open-source software license. I'd remove it from "Icon libraries".
- **GoatCounter:** it uses a slightly modified EUPL-1.2.
- **Joplin:** open source, except its sync server's licence. It's listed as open core.

Suggested answer: **approve all except Font Awesome and GoatCounter.**

LICENSE_TABLE

## 2. Verified tags

**What visitors see:** a "Verified" chip with a shield on the card, meaning "r/TrueOpenSource mods checked it: open-source license,
maintained, and it really does the job". It's the one clear answer a newcomer should try first.

**Proposed (29):** famous, active, fully replace the closed app, plain open-source license (no open core):

| Job | Proposed |
|---|---|
| Documents, spreadsheets, slides | LibreOffice Writer, LibreOffice Calc, LibreOffice Impress |
| Email | Thunderbird |
| Web browser | Firefox |
| Photo editing, painting, vector | GIMP, darktable, Krita, Inkscape |
| Video, 3D, recording | Kdenlive, Blender, OBS Studio |
| Computer operating system | Linux Mint, Fedora |
| Phone operating system | GrapheneOS |
| Photos, media, files | Immich, Jellyfin, Nextcloud |
| Messaging, calls | Signal, Element, Jitsi Meet |
| Maps | Organic Maps |
| Notes, design, PDF | Logseq, Penpot, Stirling-PDF |
| Everyday | Home Assistant, Actual Budget, Aegis |
| Social | Mastodon |

Suggested answer: **approve the list**, or cross out any you'd rather not vouch for yet.

## 3. Calls Claude made that you may want to overrule

- **Kept "Replaces fully"** for Arch Linux and CachyOS. The reviewer wanted "partly" because they're harder to install.
- **Left out Proton Mail and Proton Pass.** Their apps are open source but their servers are closed.
- **Added 25 well-known projects** the reviewer found missing, including Zettlr, Tor Browser, Zed, OpenCode, Gemini CLI, Fossify Calendar, Pop!_OS and Bazzite. Full list: `docs/group-review.md`.
- **Removed 13 dead or wrong listings,** including Continue (archived), FauxPilot and OpenAssistant (no updates since 2024), and Spacedrive (not a sync service yet).
- **Placed the 40 leftover projects:** 24 placed (9 new groups such as "Database apps", "Newsletters", "Social media scheduling" and "Budgeting & personal finance", plus "Live streaming" with Owncast) and 16 left out, each with its reason in `prefill/placements.json`.
- **YouCoded:** listed in three groups as "Replaces fully", with "Made by itsdestin, a r/TrueOpenSource moderator who also runs this site" at the end of its description.

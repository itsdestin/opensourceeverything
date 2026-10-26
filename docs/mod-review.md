---
status: active
---
# Mods' decisions (record)

Destin, Oct 27. Mods can change any of these later: tell Claude, or edit the files named.

## Licenses
A license read from the project's own LICENSE file (evidence link kept in `prefill/license-fixes.json`) counts as
checked; no separate mod step. Judgment calls:
- **Font Awesome removed.** Its free icons are CC-BY-4.0, a content license, not an open-source software license.
- **GoatCounter kept.** EUPL-1.2 with a slightly shortened list of compatible licenses; widely treated as open source.
- **Joplin** is listed as open core, because its sync server has its own license.
`data/license-confirmed.json` is for hand-confirming anything the research couldn't settle.

## Verified tags (`data/verified.json`)
30 projects shown with a Verified chip:
- **Office and email:** LibreOffice Writer, Calc and Impress; Thunderbird.
- **Browser:** Firefox.
- **Creative:** GIMP, darktable, Krita, Inkscape, Kdenlive, Blender, OBS Studio.
- **Operating systems:** Linux Mint, Fedora, GrapheneOS.
- **Photos, media and files:** Immich, Jellyfin, Nextcloud.
- **Messaging and calls:** Signal, Element, Jitsi Meet.
- **Maps, notes, design and PDF:** Organic Maps, Logseq, Penpot, Stirling-PDF.
- **Everyday:** Home Assistant, Actual Budget, Aegis.
- **Social:** Mastodon.
- **YouCoded:** a mod's own project. Its description says so.

## Claude's calls on the expert review (overrule any)
- **Kept "Replaces fully"** for Arch Linux and CachyOS. The reviewer wanted "partly" because they're harder to install.
- **Left out Proton Mail and Proton Pass.** Their apps are open source, but their servers are closed.
- **Added 25 projects** the reviewer found missing, and **removed 13 dead or wrong listings.** Details: `docs/group-review.md`.
- **The 40 leftover projects:** 24 placed (including 11 new groups), 16 left out with reasons in `prefill/placements.json`.

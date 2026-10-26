# Group review: 24 high-traffic groups

Method: my own knowledge plus live GitHub checks (archived flag, last push, license, stars) on the doubtful projects. Machine-readable edits are in `prefill/review-edits.json`. Nothing in `data/` or `site/` was touched.

## Cross-cutting findings
- **Dead or off-topic entries removed (13):** Continue (README says no longer maintained, read-only), FauxPilot (last update 2024), OpenAssistant (ended 2024), ChatRWKV (developer scripts), Olive (no update since Dec 2024, still alpha), EteSync-DAV (a helper, not a calendar), Dexio (4 stars), CarryPass (0 stars), MoinMoin (dated), Spacedrive (not a sync service yet), Spacebar and Stoat (Discord-style chat, not Slack/Teams; also dropped from video calls), ownCloud Classic kept but marked partial.
- **Wrong summary:** postmarketOS called itself "Nura". Delta Chat said "for Android" but runs everywhere. Ollama now has a chat window. Cal.com's code link points to the old repo; the real one is github.com/calcom/cal.diy.
- **Wrong platforms:** many self-hosted tools listed windows/mac/linux when they are web+server; several apps missed web or phone versions (Joplin, Logseq, Notesnook, Siyuan, AFFiNE, AliasVault, Passbolt, Tuta, Zulip and others).
- **Convention kept:** "needs your own server" items stay "full" (consistent with Zulip, Mattermost, Nextcloud) when a note says so.

## Per group
- **documents:** CryptPad full to partial (simpler formatting). Notes added for ONLYOFFICE, Etherpad. ONLYOFFICE summary and platforms rewritten (server plus free desktop app).
- **spreadsheets:** Gnumeric to partial (Linux-focused, few charts). Grist note.
- **presentations:** no changes beyond a Slidev note.
- **notes:** Trilium, Folio, NoteGen, Notabase, Yank Note to partial (no phone app / tiny or niche). Removed Dexio and MoinMoin. Added notes to ~15 partial entries. Added Zettlr and SilverBullet. Platforms fixed for 11 apps.
- **email:** Roundcube to partial (needs a mail server). Tuta note (locks you into its service). Added Mailspring, FairEmail, Proton Mail.
- **calendar:** removed EteSync-DAV. Added Fossify Calendar and Etar (group had no phone calendar).
- **team-chat:** removed Spacebar and Stoat. Element platforms add phone.
- **messaging:** Snikket and Tinode to partial. Signal note (needs phone number). Delta Chat summary. Added Briar.
- **video-calls:** BigBlueButton, Element Call, Galene to partial. Removed Stoat. Added Jami and Nextcloud Talk.
- **photo-editing:** notes clarified. Added digiKam, Pinta.
- **painting:** MyPaint to partial (simpler, no text/animation).
- **illustration:** Graphite note only.
- **interface-design:** notes for Plasmic and Quant-UX (they are not Figma-style drawing tools). Penpot unchanged.
- **video-editing:** removed Olive. OpenCut platforms to web.
- **music:** nothing changed; no open-source service has a Spotify-style catalog. Consider editing the group blurb to say so.
- **browsers:** Ungoogled Chromium to partial (no sync, third-party Mac/Windows builds). Added Tor Browser.
- **passwords:** KeePassXC to partial (no phone app, you sync the file). AliasVault, Passbolt, Padloc to partial; AliasVault and Passbolt platforms fixed. Removed CarryPass. Added KeePassDX, Proton Pass.
- **desktop-os:** Arch and CachyOS to partial. Added Pop!_OS and Bazzite.
- **phone-os:** postmarketOS summary fixed. Notes added. Added Ubuntu Touch.
- **cloud-storage:** Filestash and ownCloud Classic to partial; removed Spacedrive. Platforms fixed.
- **ai-chat:** removed ChatRWKV and OpenAssistant. Ollama summary updated. YouCoded platforms: add web. Added Chatbox, AnythingLLM.
- **ai-coding:** removed Continue and FauxPilot. OpenHands to partial and summary simplified. Added OpenCode, Gemini CLI, Kilo Code, Zed, Tabby.
- **ai-agents:** added OpenClaw and Hermes Agent (both huge, MIT). The group was nearly empty.
- **maps:** notes only. OpenStreetMap kept partial.

## Unsure / needs the owner's call
- **YouCoded:** fits untouched. Factual flags: platforms should include web; the "any AI model" note is true only if the native runtime works as the repo docs describe. I did not verify this.
- **Open WebUI** (156k stars) has a custom license with a branding clause, not an OSI license, so I did not add it. Same for Anytype and Outline (source-available).
- **Roo Code** is archived (May 2026); not added.
- **Proton Mail / Proton Pass:** apps are open source, servers are not. Add only if you accept that (Tuta is similar but its server is open).
- **Mattermost** free edition may have newer limits on features or history; I could not confirm.
- **Syncthing Android:** the official app was retired and a fork continues; I left platforms unchanged. **CoMaps iOS** may now exist; unverified.
- Rolling-release Linux (CachyOS, Arch) as "partial" is a strictness call.
- Several "license: None" entries are fine (mixed or multi-license projects); not edited.

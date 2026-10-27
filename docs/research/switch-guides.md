# Switch guides: method and coverage

Data: `switch-guides.json` (checked 2026-10-27). Apps come from each group's `closed` list in `groups.json` (295 unique; keys use the site's `appSlug`).

**Method.** For each app I fetched the vendor's official help page, then the alternative's own import docs, and wrote only what those pages said. Where a page could not be fetched (403/404/certificate error) or did not say, the field is left empty rather than guessed. `tag` links to a feature-tags-draft id where one matches.

**Coverage.** 87 entries: 18 consumer guides (16 with export steps, 2 partial: Evernote and Twitter/X have only an `opensIn`/`wontComeOver` note), 69 `skip: "business service"` (cloud databases, DevOps, analytics, CRM/ERP, messaging APIs).
Done: Google Docs, Sheets, Slides, Drive, Photos, Calendar, Gmail, Notion, 1Password, LastPass, Slack, Trello, Facebook, Instagram (thin), Spotify (thin), Chrome (bookmarks only).
Partial: Evernote (ENEX import into Joplin verified; Evernote's own page returned 403), Twitter/X (X help 403).
Not done: roughly 200 consumer apps (Microsoft 365, Adobe, Canva, WhatsApp, Discord, Dropbox, Todoist, etc.). A first attempt to fan out to parallel helpers hit the concurrent-agent limit, so the rest was not reached in this run. Pocket and Mailchimp were dropped because I could not verify them.

**Caveats for editors.** Google Drive/Gmail "formats" are not stated on Google's page. LastPass export steps come from Bitwarden's import guide, not LastPass's page. Skipped business apps were classified by name, not each checked.
